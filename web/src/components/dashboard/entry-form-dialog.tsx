"use client"

import { CircleAlertIcon, ImagePlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Photo } from "@/components/shared/photo"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useCategories } from "@/hooks/queries/use-categories"
import { useCreateEntry, useUpdateEntry } from "@/hooks/queries/use-entries"
import { usePhotoUrl } from "@/hooks/queries/use-photo-url"
import { UploadError, useUploadPhoto } from "@/hooks/queries/use-upload-photo"
import { HttpError } from "@/lib/api/client"
import { fromVnInput, toVnInput } from "@/lib/date-range"
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image"
import type { Entry, EntryInput } from "@/types/api"

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

/** PATCH body with only the fields that changed; null clears a field. */
function diff(entry: Entry, v: Values): EntryInput {
  const next = toInput(v)
  const out: EntryInput = {}
  if (next.price !== Number(entry.price)) out.price = next.price
  for (const k of ["productName", "categoryId", "unit", "storeName", "address", "note"] as const) {
    if (next[k] !== (entry[k] ?? null)) out[k] = next[k]
  }
  // Compared at minute precision, the input's resolution, so seconds survive an untouched field.
  if (v.purchasedAt !== toVnInput(entry.purchasedAt)) out.purchasedAt = fromVnInput(v.purchasedAt)
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
      <input
        ref={input}
        id="photo"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Let the same file be picked again after "Bỏ ảnh".
          e.target.value = ""
          if (file) onPick(file)
        }}
      />
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>JPEG, PNG hoặc WebP. Ảnh được thu nhỏ trước khi tải lên.</FieldDescription>}
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
  onDone: (saved: Entry) => void
}) {
  const categories = useCategories()
  const upload = useUploadPhoto()
  const create = useCreateEntry()
  const update = useUpdateEntry()

  const [values, setValues] = useState(() => initialValues(entry))
  const [photo, setPhoto] = useState<PhotoState>(() => (entry?.photoKey ? { kind: "keep" } : { kind: "none" }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const set = (k: keyof Values) => (v: string) => setValues((prev) => ({ ...prev, [k]: v }))

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
        const input = diff(entry, values)
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
        const saved = await create.mutateAsync(input)
        toast.success("Đã thêm khoản chi.")
        onDone(saved)
      }
    } catch (err) {
      setFormError(toMessage(err, stage))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
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
          <Input
            id="purchasedAt"
            type="datetime-local"
            max={toVnInput(new Date())}
            aria-invalid={!!errors.purchasedAt || undefined}
            value={values.purchasedAt}
            onChange={(e) => set("purchasedAt")(e.target.value)}
          />
          {errors.purchasedAt ? (
            <FieldError>{errors.purchasedAt}</FieldError>
          ) : (
            <FieldDescription>Theo giờ Việt Nam.</FieldDescription>
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

        <Field>
          <FieldLabel htmlFor="note">Ghi chú</FieldLabel>
          <Textarea
            id="note"
            maxLength={500}
            value={values.note}
            onChange={(e) => set("note")(e.target.value)}
          />
        </Field>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={busy}>
              Huỷ
            </Button>
          </DialogClose>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            {upload.isPending ? "Đang tải ảnh…" : busy ? "Đang lưu…" : entry ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

/** Create (`entry` null) or edit one entry. GPS coordinates are not editable on web. */
export function EntryFormDialog({
  open,
  entry,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  entry: Entry | null
  onOpenChange: (open: boolean) => void
  onSaved?: (entry: Entry) => void
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
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
