"use client"

import {
  CameraIcon,
  CircleAlertIcon,
  ImagePlusIcon,
  LocateFixedIcon,
  LockIcon,
  MapIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { DateTimePicker } from "@/components/dashboard/date-time-picker"
import { PlaceSearch } from "@/components/dashboard/place-search"
import { UPGRADE_HREF } from "@/components/dashboard/pro-lock"
import { Photo } from "@/components/shared/photo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useCategories } from "@/hooks/queries/use-categories"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { useCreateEntry, useUpdateEntry } from "@/hooks/queries/use-entries"
import { usePhotoUrl } from "@/hooks/queries/use-photo-url"
import { UploadError, useUploadPhoto } from "@/hooks/queries/use-upload-photo"
import { HttpError } from "@/lib/api/client"
import { geocodeApi } from "@/lib/api/endpoints"
import { fromVnInput, toVnInput } from "@/lib/date-range"
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image"
import {
  getDevicePosition,
  isFreshCapture,
  readPhotoMeta,
  roundCoord,
  type Coords,
  type PickedLocation,
} from "@/lib/photo-location"
import type { Entry, EntryInput, EntryRow, PlaceSuggestion } from "@/types/api"

// MapLibre (~220 KB) loads only once the location field shows a map.
const LocationPicker = dynamic(() => import("@/components/dashboard/location-picker"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})

const NO_CATEGORY = "none"
const DECIMAL_PRICE = /^\d{0,10}(\.\d{0,2})?$/

type Values = {
  price: string
  productName: string
  categoryId: string
  unit: string
  storeName: string
  address: string
  purchasedAt: string
  note: string
}
type FieldErrors = Partial<Record<"price" | "purchasedAt" | "photo", string>>
type PhotoState = { kind: "keep" } | { kind: "none" } | { kind: "new"; file: File; preview: string }

function initialValues(entry: Entry | null): Values {
  return {
    price: entry ? String(Number(entry.price)) : "",
    productName: entry?.productName ?? "",
    categoryId: entry?.categoryId ?? "",
    unit: entry?.unit ?? "",
    storeName: entry?.storeName ?? "",
    address: entry?.address ?? "",
    purchasedAt: toVnInput(entry?.purchasedAt ?? new Date()),
    note: entry?.note ?? "",
  }
}

/** Form values → API shape. Blank text means "no value" (null). */
function toInput(v: Values) {
  const text = (s: string) => s.trim() || null
  return {
    productName: text(v.productName),
    price: Number(v.price),
    categoryId: v.categoryId || null,
    unit: text(v.unit),
    storeName: text(v.storeName),
    address: text(v.address),
    note: text(v.note),
  }
}

function savedLocation(entry: Entry | null): PickedLocation | null {
  if (!entry?.latitude || !entry.longitude) return null
  return { lat: Number(entry.latitude), lng: Number(entry.longitude), source: "saved" }
}

/** Both halves or neither: the API refuses half a coordinate. */
function coordsInput(location: Coords | null): Pick<EntryInput, "latitude" | "longitude"> {
  return location
    ? { latitude: roundCoord(location.lat), longitude: roundCoord(location.lng) }
    : { latitude: null, longitude: null }
}

/** PATCH body with only the fields that changed; null clears a field. */
function diff(entry: Entry, v: Values, location: Coords | null): EntryInput {
  const next = toInput(v)
  const out: EntryInput = {}
  if (next.price !== Number(entry.price)) out.price = next.price
  for (const k of ["productName", "categoryId", "unit", "storeName", "address", "note"] as const) {
    if (next[k] !== (entry[k] ?? null)) out[k] = next[k]
  }
  // Compared at minute precision, the input's resolution, so seconds survive an untouched field.
  if (v.purchasedAt !== toVnInput(entry.purchasedAt)) out.purchasedAt = fromVnInput(v.purchasedAt)
  const coords = coordsInput(location)
  const was = coordsInput(savedLocation(entry))
  if (coords.latitude !== was.latitude || coords.longitude !== was.longitude) Object.assign(out, coords)
  return out
}

function validate(v: Values): FieldErrors {
  const errors: FieldErrors = {}
  if (!(Number(v.price) > 0)) errors.price = "Nhập giá lớn hơn 0."
  if (!v.purchasedAt) errors.purchasedAt = "Chọn giờ mua."
  // A minute of slack: the default "now" is rounded down to the minute anyway.
  else if (new Date(fromVnInput(v.purchasedAt)).getTime() > Date.now() + 60_000)
    errors.purchasedAt = "Giờ mua không được ở tương lai."
  return errors
}

function toMessage(err: unknown, stage: "photo" | "save") {
  if (err instanceof UploadError) {
    return "Không tải được ảnh lên. Kiểm tra mạng rồi thử lại."
  }
  if (err instanceof HttpError) {
    switch (err.status) {
      case 400:
        return `Dữ liệu chưa hợp lệ: ${err.message}`
      case 403:
        return "Không có quyền dùng ảnh này."
      case 402:
        return err.body?.code === "ENTRY_LIMIT"
          ? "Gói Free đã đủ số khoản chi của tháng này. Nâng cấp Pro để ghi tiếp."
          : "Khoản chi này nằm ngoài khoảng lịch sử của gói Free nên không sửa được."
      case 404:
        return "Khoản chi này không còn tồn tại."
      case 429:
        return "Thao tác quá nhanh. Đợi một phút rồi thử lại."
      default:
        return err.message
    }
  }
  return stage === "photo"
    ? "Không đọc được ảnh này. Chọn ảnh JPEG, PNG hoặc WebP."
    : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
}

/** VND has no minor unit: digits only, shown with thousands separators. */
function PriceInput({
  value,
  currency,
  decimals,
  invalid,
  onChange,
}: {
  value: string
  currency: string
  decimals: boolean
  invalid: boolean
  onChange: (v: string) => void
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id="price"
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        placeholder="0"
        aria-invalid={invalid || undefined}
        value={decimals || !value ? value : Number(value).toLocaleString("vi-VN")}
        onChange={(e) => {
          if (decimals) {
            const v = e.target.value.replace(",", ".")
            if (DECIMAL_PRICE.test(v)) onChange(v)
          } else {
            // DB column is Decimal(12,2): at most 10 integer digits.
            onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10))
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{currency === "VND" ? "₫" : currency}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

// Phones and tablets get a "take photo" button (input `capture`); a desktop has no camera flow worth offering.
const COARSE = "(pointer: coarse)"
function useCoarsePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(COARSE)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    () => window.matchMedia(COARSE).matches,
    () => false,
  )
}

function PhotoField({
  entry,
  photo,
  error,
  disabled,
  onPick,
  onRemove,
}: {
  entry: Entry | null
  photo: PhotoState
  error?: string
  disabled: boolean
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const canCapture = useCoarsePointer()
  const existing = usePhotoUrl(photo.kind === "keep" ? entry?.photoKey : null)
  const hasPhoto = photo.kind === "new" || (photo.kind === "keep" && !!entry?.photoKey)

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor="photo">Ảnh</FieldLabel>
      <div className="flex items-center gap-3">
        {hasPhoto ? (
          <Photo
            src={photo.kind === "new" ? photo.preview : existing.data}
            failed={photo.kind === "keep" && existing.isError}
            alt="Ảnh khoản chi"
            className="size-24 shrink-0 rounded-lg"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            aria-label="Chọn ảnh"
            className="bg-muted text-muted-foreground hover:bg-muted/70 focus-visible:ring-ring/50 flex size-24 shrink-0 items-center justify-center rounded-lg border border-dashed outline-none focus-visible:ring-[3px]"
          >
            <ImagePlusIcon />
          </button>
        )}
        <div className="flex flex-col items-start gap-2">
          {canCapture && (
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => camera.current?.click()}>
              <CameraIcon data-icon="inline-start" />
              Chụp ảnh
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
            <ImagePlusIcon data-icon="inline-start" />
            {hasPhoto ? "Đổi ảnh" : "Chọn ảnh"}
          </Button>
          {hasPhoto && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
              <Trash2Icon data-icon="inline-start" />
              Bỏ ảnh
            </Button>
          )}
        </div>
      </div>
      {[input, camera].map((ref) => (
        <input
          key={ref === camera ? "camera" : "file"}
          ref={ref}
          id={ref === camera ? undefined : "photo"}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          // Opens the rear camera straight away; the photo's position is then the phone's (plans/08 M4).
          capture={ref === camera ? "environment" : undefined}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Let the same file be picked again after "Bỏ ảnh".
            e.target.value = ""
            if (file) onPick(file)
          }}
        />
      ))}
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>JPEG, PNG hoặc WebP. Ảnh được thu nhỏ trước khi tải lên.</FieldDescription>}
    </Field>
  )
}

// Beyond this a device fix is a neighbourhood, not a shop: ask for a manual nudge.
const COARSE_ACCURACY_M = 100

function sourceLabel({ source, accuracy }: PickedLocation) {
  switch (source) {
    case "exif":
      return "Lấy từ thông tin GPS trong ảnh."
    case "device": {
      if (accuracy === undefined) return "Vị trí hiện tại của máy."
      const m = `Vị trí của máy, sai số ±${Math.round(accuracy)} m.`
      return accuracy > COARSE_ACCURACY_M ? `${m} Sai số lớn, nên kéo ghim về đúng chỗ.` : m
    }
    case "search":
      return "Lấy từ kết quả tìm kiếm."
    case "manual":
      return "Đã chọn trên bản đồ."
    case "saved":
      return "Vị trí đã lưu."
  }
}

function LocationField({
  location,
  locating,
  disabled,
  onChange,
  onSearchPick,
  onUseDevice,
  onClear,
}: {
  location: PickedLocation | null
  /** false = idle; true = waiting for a first fix; a number = best accuracy so far (m). */
  locating: boolean | number
  disabled: boolean
  onChange: (c: Coords) => void
  onSearchPick: (place: PlaceSuggestion) => void
  onUseDevice: () => void
  onClear: () => void
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const showMap = !!location || mapOpen

  return (
    <Field>
      <FieldLabel>Vị trí</FieldLabel>
      <PlaceSearch near={location} disabled={disabled} onPick={onSearchPick} />
      {showMap && (
        <LocationPicker value={location} onChange={onChange} className="h-56 w-full rounded-lg border" />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || locating !== false} onClick={onUseDevice}>
          {locating !== false ? <Spinner data-icon="inline-start" /> : <LocateFixedIcon data-icon="inline-start" />}
          Vị trí hiện tại
        </Button>
        {!showMap && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setMapOpen(true)}>
            <MapIcon data-icon="inline-start" />
            Chọn trên bản đồ
          </Button>
        )}
        {location && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setMapOpen(false)
              onClear()
            }}
          >
            <XIcon data-icon="inline-start" />
            Xoá vị trí
          </Button>
        )}
      </div>
      <FieldDescription>
        {locating !== false
          ? `Đang lấy vị trí${typeof locating === "number" ? ` (±${Math.round(locating)} m)` : ""}…`
          : location
            ? `${sourceLabel(location)} Kéo ghim hoặc chạm bản đồ để chỉnh.`
            : showMap
              ? "Tìm địa chỉ hoặc chạm vào bản đồ để đặt vị trí."
              : "Tìm địa chỉ để đặt vị trí. Khoản chi có vị trí sẽ hiện trên tab Bản đồ."}
      </FieldDescription>
    </Field>
  )
}

function EntryForm({
  entry,
  onBusyChange,
  onDone,
}: {
  entry: Entry | null
  onBusyChange: (busy: boolean) => void
  onDone: (saved: EntryRow) => void
}) {
  const categories = useCategories()
  const upload = useUploadPhoto()
  const create = useCreateEntry()
  const update = useUpdateEntry()
  const entitlement = useEntitlement()
  // Free plan out of entries this month (plans/07 E3). The server still answers 402 if this is stale.
  const limits = entitlement.data?.limits
  const atCap = !entry && !!limits && entitlement.data!.usage.entriesThisMonth >= limits.entriesPerMonth

  const [values, setValues] = useState(() => initialValues(entry))
  const [photo, setPhoto] = useState<PhotoState>(() => (entry?.photoKey ? { kind: "keep" } : { kind: "none" }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const set = (k: keyof Values) => (v: string) => setValues((prev) => ({ ...prev, [k]: v }))

  // Location (plans/08): photo EXIF → device GPS for a fresh capture → map pin.
  const [location, setLocation] = useState<PickedLocation | null>(() => savedLocation(entry))
  const [locating, setLocating] = useState<boolean | number>(false)
  const [timeFromPhoto, setTimeFromPhoto] = useState(false)
  // Later picks / pins win over slower lookups still in flight.
  const locateSeq = useRef(0)
  const geocodeSeq = useRef(0)
  const purchasedTouched = useRef(false)
  // What geocoding last wrote: a field still holding it may be overwritten, one the user typed may not.
  const autoFilled = useRef<{ address?: string; storeName?: string }>({})

  /**
   * `picked` = the user chose this spot themselves (map, search, "current
   * location"), so the address follows the pin even over typed or saved text.
   * A spot that came with a photo only fills what is empty or auto-filled. The
   * store name is never forced: moving the pin inside a market must not swap
   * "Chợ Bến Thành" for whichever stall the geocoder lands on.
   */
  function autoFill(address: string | null, placeName: string | null, picked: boolean) {
    const auto = autoFilled.current
    setValues((v) => {
      const next = { ...v }
      if (address && (picked || !v.address.trim() || v.address === auto.address)) next.address = auto.address = address
      if (placeName && (!v.storeName.trim() || v.storeName === auto.storeName))
        next.storeName = auto.storeName = placeName
      return next
    })
  }

  async function fillAddress(c: Coords, picked: boolean) {
    const seq = ++geocodeSeq.current
    try {
      const { address, placeName } = await geocodeApi.reverse(c.lat, c.lng)
      if (seq === geocodeSeq.current) autoFill(address, placeName, picked)
    } catch {
      // Address lookup is a convenience; the pin is what matters.
    }
  }

  /** A search suggestion already carries its address: no reverse lookup needed. */
  function onSearchPick(place: PlaceSuggestion) {
    ++locateSeq.current
    ++geocodeSeq.current
    setLocating(false)
    setLocation({ lat: place.lat, lng: place.lng, source: "search" })
    autoFill(place.address, place.placeName, true)
  }

  function placeAt(next: PickedLocation, picked: boolean) {
    setLocation(next)
    void fillAddress(next, picked)
  }

  /** null = superseded by a newer pick or pin while waiting for a fix. */
  async function locateDevice(seq: number, picked: boolean): Promise<boolean | null> {
    setLocating(true)
    // Each sharper fix moves the pin right away; the address waits for the final one.
    const pos = await getDevicePosition((fix) => {
      if (seq !== locateSeq.current) return
      setLocating(fix.accuracy)
      setLocation({ ...fix, source: "device" })
    })
    if (seq !== locateSeq.current) return null
    setLocating(false)
    if (pos) placeAt({ ...pos, source: "device" }, picked)
    return !!pos
  }

  /** Where (and when) a newly picked photo was taken. */
  async function locatePhoto(file: File) {
    const seq = ++locateSeq.current
    setLocating(false)
    const meta = await readPhotoMeta(file)
    if (seq !== locateSeq.current) return
    if (meta.takenAt && !entry && !purchasedTouched.current && new Date(meta.takenAt).getTime() <= Date.now()) {
      setValues((v) => ({ ...v, purchasedAt: toVnInput(meta.takenAt!) }))
      setTimeFromPhoto(true)
    }
    if (meta.gps) placeAt({ ...meta.gps, source: "exif" }, false)
    // No GPS in the file: only a photo taken just now may borrow the phone's position.
    else if (isFreshCapture(file)) await locateDevice(seq, false)
  }

  async function onUseDevice() {
    const found = await locateDevice(++locateSeq.current, true)
    if (found === false) {
      toast.error("Không lấy được vị trí. Kiểm tra quyền truy cập vị trí của trình duyệt.", { id: "locate-failed" })
    }
  }

  const currency = entry?.currency ?? "VND"
  // Mobile only writes whole VND; anything else keeps its cents.
  const [decimals] = useState(() => currency !== "VND" || !Number.isInteger(Number(entry?.price ?? 0)))

  const busy = upload.isPending || create.isPending || update.isPending
  useEffect(() => onBusyChange(busy), [busy, onBusyChange])

  const preview = photo.kind === "new" ? photo.preview : null
  useEffect(() => (preview ? () => URL.revokeObjectURL(preview) : undefined), [preview])

  function pick(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, photo: "Chỉ nhận ảnh JPEG, PNG hoặc WebP." }))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, photo: "Ảnh quá lớn (tối đa 15 MB)." }))
      return
    }
    setErrors((e) => ({ ...e, photo: undefined }))
    setPhoto({ kind: "new", file, preview: URL.createObjectURL(file) })
    void locatePhoto(file)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    let stage: "photo" | "save" = "photo"
    try {
      let photoKey: string | null | undefined
      if (photo.kind === "new") photoKey = await upload.mutateAsync(photo.file)
      else if (photo.kind === "none" && entry?.photoKey) photoKey = null
      stage = "save"

      if (entry) {
        const input = diff(entry, values, location)
        if (photoKey !== undefined) input.photoKey = photoKey
        if (Object.keys(input).length === 0) return onDone(entry)
        const saved = await update.mutateAsync({ id: entry.id, input })
        toast.success("Đã lưu thay đổi.")
        onDone(saved)
      } else {
        // Create omits empty fields instead of sending nulls.
        const input: EntryInput = Object.fromEntries(
          Object.entries(toInput(values)).filter(([, v]) => v !== null),
        )
        input.purchasedAt = fromVnInput(values.purchasedAt)
        if (photoKey) input.photoKey = photoKey
        if (location) Object.assign(input, coordsInput(location))
        const saved = await create.mutateAsync(input)
        toast.success("Đã thêm khoản chi.")
        onDone(saved)
      }
    } catch (err) {
      setFormError(toMessage(err, stage))
    }
  }

  return (
    // Only the fields scroll; the dialog header above and the actions below stay put.
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <FieldGroup className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
        {atCap && limits && (
          <Alert>
            <LockIcon />
            <AlertTitle>Đã dùng hết {limits.entriesPerMonth} khoản chi của tháng này</AlertTitle>
            <AlertDescription>
              <p>
                Gói Free tạm dừng ghi mới tới đầu tháng sau.{" "}
                <Link href={UPGRADE_HREF} className="text-foreground underline underline-offset-4">
                  Xem gói Pro
                </Link>{" "}
                để ghi không giới hạn.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <PhotoField
          entry={entry}
          photo={photo}
          error={errors.photo}
          disabled={busy}
          onPick={pick}
          onRemove={() => setPhoto({ kind: "none" })}
        />

        <Field data-invalid={!!errors.price || undefined}>
          <FieldLabel htmlFor="price">Giá</FieldLabel>
          <PriceInput
            value={values.price}
            currency={currency}
            decimals={decimals}
            invalid={!!errors.price}
            onChange={set("price")}
          />
          {errors.price && <FieldError>{errors.price}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="productName">Tên sản phẩm</FieldLabel>
          <Input
            id="productName"
            maxLength={120}
            placeholder="Rau muống"
            value={values.productName}
            onChange={(e) => set("productName")(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="category">Danh mục</FieldLabel>
          <Select value={values.categoryId || NO_CATEGORY} onValueChange={(v) => set("categoryId")(v === NO_CATEGORY ? "" : v)}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_CATEGORY}>Không có</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="unit">Đơn vị</FieldLabel>
          <Input
            id="unit"
            maxLength={20}
            placeholder="kg, bó, hộp…"
            value={values.unit}
            onChange={(e) => set("unit")(e.target.value)}
          />
        </Field>

        <Field data-invalid={!!errors.purchasedAt || undefined}>
          <FieldLabel htmlFor="purchasedAt">Giờ mua</FieldLabel>
          <DateTimePicker
            id="purchasedAt"
            value={values.purchasedAt}
            invalid={!!errors.purchasedAt}
            onChange={(v) => {
              purchasedTouched.current = true
              setTimeFromPhoto(false)
              set("purchasedAt")(v)
            }}
          />
          {errors.purchasedAt ? (
            <FieldError>{errors.purchasedAt}</FieldError>
          ) : (
            <FieldDescription>
              {timeFromPhoto ? "Lấy từ giờ chụp trong ảnh, theo giờ Việt Nam." : "Theo giờ Việt Nam."}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="storeName">Cửa hàng</FieldLabel>
          <Input
            id="storeName"
            maxLength={120}
            placeholder="Chợ Bến Thành"
            value={values.storeName}
            onChange={(e) => set("storeName")(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="address">Địa chỉ</FieldLabel>
          <Input
            id="address"
            maxLength={255}
            value={values.address}
            onChange={(e) => set("address")(e.target.value)}
          />
        </Field>

        <LocationField
          location={location}
          locating={locating}
          disabled={busy}
          onChange={(c) => {
            ++locateSeq.current
            setLocating(false)
            placeAt({ ...c, source: "manual" }, true)
          }}
          onSearchPick={onSearchPick}
          onUseDevice={onUseDevice}
          onClear={() => {
            ++locateSeq.current
            ++geocodeSeq.current
            setLocating(false)
            setLocation(null)
          }}
        />

        <Field>
          <FieldLabel htmlFor="note">Ghi chú</FieldLabel>
          <Textarea
            id="note"
            maxLength={500}
            value={values.note}
            onChange={(e) => set("note")(e.target.value)}
          />
        </Field>

      </FieldGroup>

      <DialogFooter className="m-0 shrink-0 rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-b-xl sm:pb-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={busy}>
            Huỷ
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy || atCap}>
          {busy && <Spinner data-icon="inline-start" />}
          {upload.isPending ? "Đang tải ảnh…" : busy ? "Đang lưu…" : entry ? "Lưu" : "Thêm"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Create (`entry` null) or edit one entry, including where it was bought (plans/08). */
export function EntryFormDialog({
  open,
  entry,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  entry: Entry | null
  onOpenChange: (open: boolean) => void
  onSaved?: (entry: EntryRow) => void
}) {
  const [busy, setBusy] = useState(false)
  // A fresh form per opening; keep the last entry rendered while the dialog animates out.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  const [shown, setShown] = useState(entry)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((s) => s + 1)
      setShown(entry)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* Full screen on phones (a long form in a floating card wastes the edges), centred card from `sm` up. */}
      <DialogContent
        className="top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 ring-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90svh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:ring-1"
        showCloseButton={!busy}
      >
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>{shown ? "Sửa khoản chi" : "Thêm khoản chi"}</DialogTitle>
          <DialogDescription>
            {shown ? "Thay đổi được lưu ngay khi bấm Lưu." : "Ghi lại một khoản chi, ảnh là tuỳ chọn."}
          </DialogDescription>
        </DialogHeader>
        <EntryForm
          key={session}
          entry={shown}
          onBusyChange={setBusy}
          onDone={(saved) => {
            onOpenChange(false)
            onSaved?.(saved)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
