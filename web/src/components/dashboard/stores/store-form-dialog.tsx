"use client"

import { CircleAlertIcon, LocateFixedIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { PlaceSearch } from "@/components/dashboard/place-search"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  useAdminCreateStore,
  useAdminUpdateStore,
  useCreateStore,
  useUpdateStore,
} from "@/hooks/queries/use-stores"
import { HttpError } from "@/lib/api/client"
import { geocodeApi } from "@/lib/api/endpoints"
import { getDevicePosition, roundCoord, type Coords } from "@/lib/photo-location"
import type { Store, StoreInput } from "@/types/api"

const LocationPicker = dynamic(() => import("@/components/dashboard/location-picker"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})

/** What the form opens with when creating: e.g. the name typed in the entry form and its pin. */
export type StoreDraft = { name?: string; address?: string; location?: Coords | null }

type Editable = Pick<Store, "id" | "name" | "address" | "lat" | "lng">

export function storeError(err: unknown) {
  if (err instanceof HttpError) {
    if (err.body?.code === "STORE_GLOBAL") return "Cửa hàng đã công khai, chỉ admin sửa được."
    if (err.status === 400) return `Dữ liệu chưa hợp lệ: ${err.message}`
    if (err.status === 404) return "Cửa hàng này không còn tồn tại."
    if (err.status === 429) return "Thao tác quá nhanh. Đợi một phút rồi thử lại."
    return err.message
  }
  return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
}

function StoreForm({
  store,
  draft,
  admin,
  onBusyChange,
  onDone,
}: {
  store: Editable | null
  draft?: StoreDraft
  admin: boolean
  onBusyChange: (busy: boolean) => void
  /** null = closed without changes. */
  onDone: (saved: Store | null) => void
}) {
  const userCreate = useCreateStore()
  const userUpdate = useUpdateStore()
  const adminCreate = useAdminCreateStore()
  const adminUpdate = useAdminUpdateStore()
  const create = admin ? adminCreate : userCreate
  const update = admin ? adminUpdate : userUpdate
  const busy = create.isPending || update.isPending
  useEffect(() => onBusyChange(busy), [busy, onBusyChange])

  const [name, setName] = useState(store?.name ?? draft?.name ?? "")
  const [address, setAddress] = useState(store?.address ?? draft?.address ?? "")
  const [location, setLocation] = useState<Coords | null>(
    store ? { lat: store.lat, lng: store.lng } : (draft?.location ?? null),
  )
  const [locating, setLocating] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; location?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  // What geocoding last wrote: only that (or an empty field) may be replaced by the next lookup.
  const autoAddress = useRef<string | null>(null)
  const geocodeSeq = useRef(0)

  function fillAddress(next: string | null) {
    if (!next) return
    setAddress((cur) => {
      if (cur.trim() && cur !== autoAddress.current) return cur
      autoAddress.current = next
      return next
    })
  }

  async function placeAt(c: Coords) {
    setLocation(c)
    setErrors((e) => ({ ...e, location: undefined }))
    const seq = ++geocodeSeq.current
    try {
      const res = await geocodeApi.reverse(c.lat, c.lng)
      if (seq === geocodeSeq.current) fillAddress(res.address)
    } catch {
      // The pin is what matters; the address is a convenience.
    }
  }

  async function onUseDevice() {
    setLocating(true)
    const pos = await getDevicePosition()
    setLocating(false)
    if (pos) void placeAt({ lat: pos.lat, lng: pos.lng })
    else toast.error("Không lấy được vị trí. Kiểm tra quyền truy cập vị trí của trình duyệt.", { id: "locate-failed" })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!name.trim()) found.name = "Nhập tên cửa hàng."
    if (!location) found.location = "Chọn vị trí cửa hàng trên bản đồ."
    setErrors(found)
    setFormError(null)
    if (found.name || found.location) return

    const input = {
      name: name.trim(),
      address: address.trim() || null,
      latitude: roundCoord(location!.lat),
      longitude: roundCoord(location!.lng),
    }
    try {
      if (store) {
        // Only what changed: an unchanged store must not rewrite every linked entry.
        const patch: StoreInput = {}
        if (input.name !== store.name) patch.name = input.name
        if (input.address !== store.address) patch.address = input.address
        if (input.latitude !== roundCoord(store.lat) || input.longitude !== roundCoord(store.lng)) {
          patch.latitude = input.latitude
          patch.longitude = input.longitude
        }
        if (Object.keys(patch).length === 0) return onDone(null)
        const saved = await update.mutateAsync({ id: store.id, input: patch })
        toast.success("Đã lưu cửa hàng.")
        onDone(saved)
      } else {
        const saved = await create.mutateAsync(input)
        toast.success("Đã tạo cửa hàng.")
        onDone(saved)
      }
    } catch (err) {
      setFormError(storeError(err))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <FieldGroup className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="store-name">Tên cửa hàng</FieldLabel>
          <Input
            id="store-name"
            maxLength={120}
            placeholder="Tạp hoá Cô Ba"
            aria-invalid={!!errors.name || undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.location || undefined}>
          <FieldLabel>Vị trí</FieldLabel>
          <PlaceSearch
            near={location}
            disabled={busy}
            onPick={(place) => {
              ++geocodeSeq.current
              setLocation({ lat: place.lat, lng: place.lng })
              setErrors((e) => ({ ...e, location: undefined }))
              fillAddress(place.address)
              if (place.placeName && !name.trim()) setName(place.placeName)
            }}
          />
          <LocationPicker value={location} onChange={(c) => void placeAt(c)} className="h-56 w-full rounded-lg border" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy || locating} onClick={onUseDevice}>
              {locating ? <Spinner data-icon="inline-start" /> : <LocateFixedIcon data-icon="inline-start" />}
              Vị trí hiện tại
            </Button>
          </div>
          {errors.location ? (
            <FieldError>{errors.location}</FieldError>
          ) : (
            <FieldDescription>
              Chạm bản đồ hoặc kéo ghim đúng chỗ cửa hàng. Khoản chi chọn cửa hàng này sẽ lấy vị trí ở đây.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="store-address">Địa chỉ</FieldLabel>
          <Input
            id="store-address"
            maxLength={255}
            placeholder="Tự điền khi chọn vị trí"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <DialogFooter className="m-0 shrink-0 rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-b-xl sm:pb-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={busy}>
            Huỷ
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          {busy ? "Đang lưu…" : store ? "Lưu" : "Tạo"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Create (`store` null) or edit a store (plans/09). `admin` sends it through the
 * admin routes: a store an admin creates is global straight away.
 */
export function StoreFormDialog({
  open,
  store,
  draft,
  admin = false,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  store: Editable | null
  draft?: StoreDraft
  admin?: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (store: Store) => void
}) {
  const [busy, setBusy] = useState(false)
  // A fresh form per opening; keep the last store rendered while the dialog animates out.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  const [shown, setShown] = useState({ store, draft })
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((s) => s + 1)
      setShown({ store, draft })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        className="top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 ring-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90svh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:ring-1"
        showCloseButton={!busy}
      >
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>{shown.store ? "Sửa cửa hàng" : admin ? "Thêm cửa hàng công khai" : "Tạo cửa hàng"}</DialogTitle>
          <DialogDescription>
            {shown.store
              ? "Khoản chi đã chọn cửa hàng này sẽ cập nhật theo."
              : admin
                ? "Mọi người dùng đều thấy và chọn được cửa hàng công khai."
                : "Chỉ bạn thấy cửa hàng này, cho tới khi bạn đề xuất công khai và admin duyệt."}
          </DialogDescription>
        </DialogHeader>
        <StoreForm
          key={session}
          store={shown.store}
          draft={shown.draft}
          admin={admin}
          onBusyChange={setBusy}
          onDone={(saved) => {
            onOpenChange(false)
            if (saved) onSaved?.(saved)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
