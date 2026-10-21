"use client"

import { CircleAlertIcon, PencilIcon, PlusIcon, ShieldIcon, TagsIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/dashboard/stores/confirm-dialog"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/queries/use-categories"
import { useMe } from "@/hooks/queries/use-me"
import { HttpError } from "@/lib/api/client"
import type { AdminCategory, CategoryInput } from "@/types/api"

function categoryError(err: unknown) {
  if (err instanceof HttpError) {
    if (err.body?.code === "CATEGORY_EXISTS") return "Đã có danh mục trùng tên."
    if (err.status === 400) return `Dữ liệu chưa hợp lệ: ${err.message}`
    if (err.status === 403) return "Chỉ admin được sửa danh mục."
    if (err.status === 404) return "Danh mục này không còn tồn tại."
    if (err.status === 429) return "Thao tác quá nhanh. Đợi một phút rồi thử lại."
    return err.message
  }
  return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
}

function CategoryForm({
  category,
  onBusyChange,
  onDone,
}: {
  category: AdminCategory | null
  onBusyChange: (busy: boolean) => void
  onDone: () => void
}) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const busy = create.isPending || update.isPending

  const [name, setName] = useState(category?.name ?? "")
  const [icon, setIcon] = useState(category?.icon ?? "")
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) return setNameError("Nhập tên danh mục.")
    setNameError(null)

    const input = { name: name.trim(), icon: icon.trim() || null }
    onBusyChange(true)
    try {
      if (category) {
        const patch: CategoryInput = {}
        if (input.name !== category.name) patch.name = input.name
        if (input.icon !== category.icon) patch.icon = input.icon
        if (Object.keys(patch).length > 0) {
          await update.mutateAsync({ id: category.id, input: patch })
          toast.success("Đã lưu danh mục.")
        }
      } else {
        await create.mutateAsync(input)
        toast.success("Đã tạo danh mục.")
      }
      onDone()
    } catch (err) {
      setFormError(categoryError(err))
    } finally {
      onBusyChange(false)
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
        <Field data-invalid={!!nameError || undefined}>
          <FieldLabel htmlFor="category-name">Tên</FieldLabel>
          <Input
            id="category-name"
            maxLength={50}
            placeholder="Đồ gia dụng"
            aria-invalid={!!nameError || undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="category-icon">Biểu tượng</FieldLabel>
          <Input
            id="category-icon"
            maxLength={16}
            placeholder="🧺"
            className="w-24 text-lg"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
          <FieldDescription>Một emoji, tuỳ chọn.</FieldDescription>
        </Field>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={busy}>
            Huỷ
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          {category ? "Lưu" : "Tạo"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CategoryFormDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean
  category: AdminCategory | null
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  // A fresh form per opening; keep the last category rendered while the dialog animates out.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  const [shown, setShown] = useState(category)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((s) => s + 1)
      setShown(category)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{shown ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          <DialogDescription>Mọi người dùng đều thấy thay đổi này.</DialogDescription>
        </DialogHeader>
        <CategoryForm key={session} category={shown} onBusyChange={setBusy} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-40" />
        </li>
      ))}
    </ul>
  )
}

/** Shared category list (admin only; the API enforces it on every route). */
export function AdminCategoriesView() {
  const me = useMe()
  const isAdmin = me.data?.role === "admin"
  const categories = useAdminCategories()
  const remove = useDeleteCategory()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)

  if (me.isPending) return <ListSkeleton />
  if (!isAdmin) {
    return <EmptyState icon={ShieldIcon} title="Chỉ dành cho admin" description="Tài khoản của bạn không có quyền này." />
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          Thêm danh mục
        </Button>
      </div>

      <Card>
        <CardContent>
          <QueryContent
            query={categories}
            skeleton={<ListSkeleton />}
            isEmpty={(d) => d.length === 0}
            empty={<EmptyState icon={TagsIcon} title="Chưa có danh mục nào" />}
          >
            {(data) => (
              <ul className="divide-y">
                {data.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
                      {c.icon ?? <TagsIcon className="size-4 text-muted-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.entryCount} khoản chi{c.isDefault && " · mặc định"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${c.name}`} onClick={() => setEditing(c)}>
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      aria-label={`Xoá ${c.name}`}
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </QueryContent>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={creating || !!editing}
        category={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Xoá danh mục?"
        description={
          <>
            <strong>{deleting?.name}</strong> biến mất khỏi danh sách của mọi người.
            {deleting?.entryCount
              ? ` ${deleting.entryCount} khoản chi đang dùng nó sẽ thành "Không có danh mục".`
              : ""}
          </>
        }
        confirmLabel="Xoá"
        pending={remove.isPending}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast.success("Đã xoá danh mục.")
              setDeleting(null)
            },
            onError: (err) => toast.error(categoryError(err)),
          })
        }
      />
    </>
  )
}
