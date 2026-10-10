"use client"

import { Trash2Icon } from "lucide-react"
import { useState } from "react"

import { DeleteEntryDialog } from "@/components/dashboard/delete-entry-dialog"
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
import { useCategoryMap } from "@/hooks/queries/use-categories"
import { usePhotoUrl } from "@/hooks/queries/use-photo-url"
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

function EntryDetail({ entry, onDelete }: { entry: Entry; onDelete: () => void }) {
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
      </DialogFooter>
    </>
  )
}

/** Large photo + every field of one entry. Editing lands in plan 04. */
export function EntryDetailDialog({
  entry,
  onOpenChange,
  onDeleted,
}: {
  entry: Entry | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const [deleting, setDeleting] = useState<Entry | null>(null)
  // Keep the last entry rendered while the dialog animates out.
  const [shown, setShown] = useState(entry)
  if (entry && entry !== shown) setShown(entry)

  return (
    <>
      <Dialog open={!!entry} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
          {shown && <EntryDetail entry={shown} onDelete={() => setDeleting(shown)} />}
        </DialogContent>
      </Dialog>
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
