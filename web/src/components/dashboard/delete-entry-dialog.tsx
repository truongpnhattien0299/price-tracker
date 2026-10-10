"use client"

import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteEntry } from "@/hooks/queries/use-entries"
import { formatMoney } from "@/lib/format"
import type { Entry } from "@/types/api"

export function DeleteEntryDialog({
  entry,
  onOpenChange,
  onDeleted,
}: {
  entry: Entry | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const remove = useDeleteEntry()

  function confirm(e: React.MouseEvent) {
    // Keep the dialog open until the request settles.
    e.preventDefault()
    if (!entry) return
    remove.mutate(entry.id, {
      onSuccess: () => {
        toast.success("Đã xoá khoản chi.")
        onOpenChange(false)
        onDeleted?.()
      },
      onError: (err) => toast.error(err.message || "Không xoá được khoản chi."),
    })
  }

  return (
    <AlertDialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá khoản chi?</AlertDialogTitle>
          <AlertDialogDescription>
            {entry && (
              <>
                <strong>{entry.productName ?? "Khoản chi"}</strong> · {formatMoney(entry.price, entry.currency)}.{" "}
              </>
            )}
            {entry?.photoKey && "Ảnh đi kèm cũng bị xoá. "}Không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Huỷ</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending && <Spinner data-icon="inline-start" />}
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
