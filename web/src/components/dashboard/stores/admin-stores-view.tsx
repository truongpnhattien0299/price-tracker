"use client"

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CombineIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  StoreIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/dashboard/stores/confirm-dialog"
import { StoreFormDialog, storeError } from "@/components/dashboard/stores/store-form-dialog"
import { formatDistance } from "@/components/dashboard/stores/store-status-badge"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/hooks/queries/use-me"
import {
  useAdminDeleteStore,
  useAdminStores,
  useApproveStore,
  useMergeStore,
  useRejectStore,
} from "@/hooks/queries/use-stores"
import { formatDate } from "@/lib/format"
import type { AdminStore, NearbyStore } from "@/types/api"

type Status = "pending" | "global"
const PAGE_SIZE = 20

function osmLink(s: AdminStore) {
  return `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=18/${s.lat}/${s.lng}`
}

function RejectDialog({ store, onOpenChange }: { store: AdminStore | null; onOpenChange: (open: boolean) => void }) {
  const reject = useRejectStore()
  const [note, setNote] = useState("")
  useEffect(() => {
    if (store) setNote("")
  }, [store])

  return (
    <Dialog open={!!store} onOpenChange={(o) => !reject.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối đề xuất?</DialogTitle>
          <DialogDescription>
            <strong>{store?.name}</strong> trở về riêng tư cho người tạo. Họ thấy ghi chú bên dưới và có thể sửa rồi đề
            xuất lại.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="reject-note">Lý do (tuỳ chọn)</FieldLabel>
          <Textarea
            id="reject-note"
            maxLength={300}
            placeholder="Vị trí chưa đúng, tên chưa rõ…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" disabled={reject.isPending} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={reject.isPending}
            onClick={() =>
              reject.mutate(
                { id: store!.id, note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success("Đã từ chối đề xuất.")
                    onOpenChange(false)
                  },
                  onError: (err) => toast.error(storeError(err)),
                },
              )
            }
          >
            {reject.isPending && <Spinner data-icon="inline-start" />}
            Từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StoreCard({
  store,
  onEdit,
  onReject,
  onMerge,
  onDelete,
}: {
  store: AdminStore
  onEdit: () => void
  onReject: () => void
  onMerge: (target: NearbyStore) => void
  onDelete: () => void
}) {
  const approve = useApproveStore()
  const pending = store.status === "pending"

  return (
    <li className="space-y-2 py-4">
      <div className="flex items-start gap-3">
        <StoreIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{store.name}</p>
          <p className="text-sm text-muted-foreground">
            {store.address ?? "Chưa có địa chỉ"} ·{" "}
            <a href={osmLink(store)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Xem vị trí
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            {[
              store.ownerName ? `Tạo bởi ${store.ownerName}` : "Admin tạo",
              pending && store.proposedAt && `đề xuất ${formatDate(store.proposedAt)}`,
              `${store.entryCount} khoản chi`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {pending && !!store.nearbyGlobal?.length && (
        <div className="ml-7 rounded-lg border border-dashed p-2 text-sm">
          <p className="mb-1 text-muted-foreground">Có thể trùng với cửa hàng công khai gần đó:</p>
          <ul className="space-y-1">
            {store.nearbyGlobal.map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {g.name} <span className="text-muted-foreground">· {formatDistance(g.distanceM)}</span>
                </span>
                <Button variant="outline" size="xs" onClick={() => onMerge(g)}>
                  <CombineIcon data-icon="inline-start" />
                  Gộp vào
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ml-7 flex flex-wrap gap-2">
        {pending && (
          <>
            <Button
              size="sm"
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(store.id, {
                  onSuccess: () => toast.success(`Đã duyệt ${store.name}.`),
                  onError: (err) => toast.error(storeError(err)),
                })
              }
            >
              {approve.isPending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
              Duyệt
            </Button>
            <Button size="sm" variant="outline" onClick={onReject}>
              <XIcon data-icon="inline-start" />
              Từ chối
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Sửa
        </Button>
        {!pending && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2Icon data-icon="inline-start" />
            Xoá
          </Button>
        )}
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="space-y-2 py-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
          <Skeleton className="h-7 w-40" />
        </li>
      ))}
    </ul>
  )
}

/**
 * Review queue + global store management (plans/09). The API enforces admin on
 * every route; this check only avoids showing a page of 403s.
 */
export function AdminStoresView() {
  const me = useMe()
  const [status, setStatus] = useState<Status>("pending")
  const [text, setText] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(text.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [text])

  const isAdmin = me.data?.role === "admin"
  const query = { status, q: q || undefined, page, limit: PAGE_SIZE }
  const stores = useAdminStores(query)
  const remove = useAdminDeleteStore()
  const merge = useMergeStore()

  const [editing, setEditing] = useState<AdminStore | null>(null)
  const [creating, setCreating] = useState(false)
  const [rejecting, setRejecting] = useState<AdminStore | null>(null)
  const [deleting, setDeleting] = useState<AdminStore | null>(null)
  const [merging, setMerging] = useState<{ store: AdminStore; target: NearbyStore } | null>(null)

  if (me.isPending) return <ListSkeleton />
  if (!isAdmin) {
    return <EmptyState icon={ShieldIcon} title="Chỉ dành cho admin" description="Tài khoản của bạn không có quyền này." />
  }

  const meta = stores.data?.meta

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as Status)
            setPage(1)
          }}
        >
          <TabsList>
            <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="global">Công khai</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Tìm cửa hàng"
              placeholder="Tìm theo tên"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </InputGroup>
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Thêm cửa hàng công khai
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <QueryContent
            query={stores}
            skeleton={<ListSkeleton />}
            isEmpty={(d) => d.data.length === 0}
            empty={
              <EmptyState
                icon={StoreIcon}
                title={q ? "Không có cửa hàng trùng tên" : status === "pending" ? "Không có đề xuất nào" : "Chưa có cửa hàng công khai"}
              />
            }
          >
            {(data) => (
              <ul className="divide-y">
                {data.data.map((s) => (
                  <StoreCard
                    key={s.id}
                    store={s}
                    onEdit={() => setEditing(s)}
                    onReject={() => setRejecting(s)}
                    onMerge={(target) => setMerging({ store: s, target })}
                    onDelete={() => setDeleting(s)}
                  />
                ))}
              </ul>
            )}
          </QueryContent>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {meta.page} / {meta.totalPages} · {meta.total} cửa hàng
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeftIcon data-icon="inline-start" />
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Sau
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      <StoreFormDialog
        admin
        open={creating || !!editing}
        store={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />
      <RejectDialog store={rejecting} onOpenChange={(o) => !o && setRejecting(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Xoá cửa hàng công khai?"
        description={
          <>
            <strong>{deleting?.name}</strong> biến mất khỏi danh sách của mọi người.
            {deleting?.entryCount ? ` ${deleting.entryCount} khoản chi đã chọn nó vẫn giữ tên và vị trí.` : ""}
          </>
        }
        confirmLabel="Xoá"
        pending={remove.isPending}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast.success("Đã xoá cửa hàng.")
              setDeleting(null)
            },
            onError: (err) => toast.error(storeError(err)),
          })
        }
      />
      <ConfirmDialog
        open={!!merging}
        title="Gộp vào cửa hàng công khai?"
        description={
          <>
            Khoản chi đang chọn <strong>{merging?.store.name}</strong> chuyển sang <strong>{merging?.target.name}</strong>{" "}
            (lấy tên, địa chỉ và vị trí của nó), rồi <strong>{merging?.store.name}</strong> bị xoá.
          </>
        }
        confirmLabel="Gộp"
        destructive={false}
        pending={merge.isPending}
        onOpenChange={(o) => !o && setMerging(null)}
        onConfirm={() =>
          merge.mutate(
            { id: merging!.store.id, targetId: merging!.target.id },
            {
              onSuccess: (res) => {
                toast.success(`Đã gộp, chuyển ${res.movedEntries} khoản chi.`)
                setMerging(null)
              },
              onError: (err) => toast.error(storeError(err)),
            },
          )
        }
      />
    </>
  )
}
