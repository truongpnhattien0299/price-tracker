"use client"

import {
  EllipsisIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
  UndoIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/dashboard/stores/confirm-dialog"
import { StoreFormDialog, storeError } from "@/components/dashboard/stores/store-form-dialog"
import { StoreKindIcon, storePlace, StoreStatusBadge } from "@/components/dashboard/stores/store-status-badge"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteStore, useMyStores, useProposeStore, useWithdrawStore } from "@/hooks/queries/use-stores"
import type { MyStore } from "@/types/api"

function StoreActions({
  store,
  onEdit,
  onDelete,
}: {
  store: MyStore
  onEdit: () => void
  onDelete: () => void
}) {
  const propose = useProposeStore()
  const withdraw = useWithdrawStore()

  // Global stores belong to the admins from here on (plans/09 S4).
  if (store.status === "global") return null

  function run(mutation: typeof propose, ok: string) {
    mutation.mutate(store.id, {
      onSuccess: () => toast.success(ok),
      onError: (err) => toast.error(storeError(err)),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${store.name}`}>
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon />
            Sửa
          </DropdownMenuItem>
          {store.status === "personal" ? (
            <DropdownMenuItem onSelect={() => run(propose, "Đã gửi đề xuất. Admin sẽ xem xét.")}>
              <GlobeIcon />
              Đề xuất công khai
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => run(withdraw, "Đã rút đề xuất.")}>
              <UndoIcon />
              Rút đề xuất
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StoreRow({ store, onEdit, onDelete }: { store: MyStore; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <StoreKindIcon kind={store.kind} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{store.name}</span>
          <StoreStatusBadge status={store.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {[storePlace(store), `${store.entryCount} khoản chi`].join(" · ")}
        </p>
        {store.status === "global" && (
          <p className="text-xs text-muted-foreground">Đã công khai, chỉ admin sửa hoặc xoá được.</p>
        )}
        {store.status === "personal" && store.reviewNote && (
          <p className="text-xs text-destructive">Đề xuất bị từ chối: {store.reviewNote}</p>
        )}
      </div>
      <StoreActions store={store} onEdit={onEdit} onDelete={onDelete} />
    </li>
  )
}

function StoresSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex gap-3 py-3">
          <Skeleton className="size-4" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** The user's own stores (plans/09): edit, propose for everyone, delete. */
export function StoresView() {
  const stores = useMyStores()
  const remove = useDeleteStore()
  const [editing, setEditing] = useState<MyStore | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<MyStore | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          Tạo cửa hàng
        </Button>
      </div>
      <Card>
        <CardContent>
          <QueryContent
            query={stores}
            skeleton={<StoresSkeleton />}
            isEmpty={(d) => d.length === 0}
            empty={
              <EmptyState
                icon={StoreIcon}
                title="Chưa có cửa hàng nào"
                description="Lưu những chỗ hay mua để lần sau chọn nhanh, khỏi đặt lại vị trí."
              />
            }
          >
            {(data) => (
              <ul className="divide-y">
                {data.map((s) => (
                  <StoreRow key={s.id} store={s} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
                ))}
              </ul>
            )}
          </QueryContent>
        </CardContent>
      </Card>

      <StoreFormDialog
        open={creating || !!editing}
        store={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Xoá cửa hàng?"
        description={
          <>
            <strong>{deleting?.name}</strong>
            {deleting?.entryCount
              ? `. ${deleting.entryCount} khoản chi đã chọn cửa hàng này vẫn giữ tên và vị trí.`
              : "."}
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
    </>
  )
}
