"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { DeleteEntryDialog } from "@/components/dashboard/delete-entry-dialog"
import { EntryFormDialog } from "@/components/dashboard/entry-form-dialog"
import { ErrorState } from "@/components/shared/query-state"
import { Photo } from "@/components/shared/photo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategoryMap } from "@/hooks/queries/use-categories"
import { useEntry } from "@/hooks/queries/use-entries"
import { usePhotoUrl } from "@/hooks/queries/use-photo-url"
import { HttpError } from "@/lib/api/client"
import { formatDate, formatMoney } from "@/lib/format"
import type { Entry } from "@/types/api"

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function EntryDetail({ entry, onEdit, onDelete }: { entry: Entry; onEdit: () => void; onDelete: () => void }) {
  const categories = useCategoryMap()
  const photo = usePhotoUrl(entry.photoKey)
  const category = entry.categoryId ? categories.get(entry.categoryId) : undefined
  const name = entry.productName ?? "Khoản chi"

  return (
    <>
      {entry.photoKey && (
        <Photo
          src={photo.data}
          failed={photo.isError}
          alt={name}
          className="aspect-square w-full rounded-lg"
        />
      )}
      <DialogHeader>
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>
          {formatDate(entry.purchasedAt, { timeStyle: "short" })} · {formatDate(entry.purchasedAt, { dateStyle: "full" })}
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-2 gap-3">
        <Detail label="Giá">
          <span className="text-base font-semibold tabular-nums">
            {formatMoney(entry.price, entry.currency)}
          </span>
          {entry.unit && <span className="text-muted-foreground"> / {entry.unit}</span>}
        </Detail>
        <Detail label="Danh mục">
          {category ? (
            <Badge variant="secondary">
              {category.icon} {category.name}
            </Badge>
          ) : (
            "—"
          )}
        </Detail>
        {entry.storeName && <Detail label="Cửa hàng">{entry.storeName}</Detail>}
        {entry.address && <Detail label="Địa chỉ">{entry.address}</Detail>}
        {entry.note && (
          <div className="col-span-2">
            <Detail label="Ghi chú">
              <p className="whitespace-pre-line">{entry.note}</p>
            </Detail>
          </div>
        )}
      </dl>
      <DialogFooter>
        <Button variant="outline" onClick={onDelete}>
          <Trash2Icon data-icon="inline-start" />
          Xoá
        </Button>
        <Button onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Sửa
        </Button>
      </DialogFooter>
    </>
  )
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="aspect-square w-full rounded-lg" />
      <DialogHeader>
        <DialogTitle>
          <Skeleton className="h-5 w-40" />
        </DialogTitle>
        <DialogDescription className="sr-only">Đang tải khoản chi</DialogDescription>
        <Skeleton className="h-4 w-56" />
      </DialogHeader>
    </>
  )
}

/**
 * Large photo + every field of one entry, with edit and delete. Reads through
 * `useEntry`, so it shows the saved values right after an edit. `initial` is
 * the row already on screen; without it (deep link) the entry is fetched.
 */
export function EntryDetailDialog({
  entryId,
  initial,
  onOpenChange,
  onDeleted,
  onNotFound,
}: {
  entryId: string | null
  initial?: Entry
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  /** The id does not exist (or belongs to someone else). */
  onNotFound?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState<Entry | null>(null)
  // Keep the last entry rendered while the dialog animates out.
  const [shownId, setShownId] = useState(entryId)
  if (entryId && entryId !== shownId) setShownId(entryId)

  const query = useEntry(shownId, initial, { enabled: !!entryId })
  const notFound = query.error instanceof HttpError && query.error.status === 404
  useEffect(() => {
    if (notFound && entryId) onNotFound?.()
  }, [notFound, entryId, onNotFound])

  const entry = query.data
  let body: React.ReactNode
  if (entry) {
    body = <EntryDetail entry={entry} onEdit={() => setEditing(true)} onDelete={() => setDeleting(entry)} />
  } else if (query.isError && !notFound) {
    body = (
      <>
        <DialogTitle className="sr-only">Khoản chi</DialogTitle>
        <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
      </>
    )
  } else {
    body = <DetailSkeleton />
  }

  return (
    <>
      <Dialog open={!!entryId && !notFound} onOpenChange={onOpenChange}>
        {/* auto-rows-max: the photo clips its overflow, so as a grid item its min height is 0
            and on short screens the row would collapse under the text instead of scrolling. */}
        <DialogContent className="max-h-[90svh] auto-rows-max overflow-y-auto sm:max-w-md">{body}</DialogContent>
      </Dialog>
      <EntryFormDialog open={editing} entry={entry ?? null} onOpenChange={setEditing} />
      <DeleteEntryDialog
        entry={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          onOpenChange(false)
          onDeleted?.()
        }}
      />
    </>
  )
}
