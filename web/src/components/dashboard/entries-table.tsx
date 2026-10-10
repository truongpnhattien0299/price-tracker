"use client"

import { EllipsisIcon, LockIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCategoryMap } from "@/hooks/queries/use-categories"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Entry, EntryRow, LockedEntry } from "@/types/api"

function Head({ withActions }: { withActions?: boolean }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Sản phẩm</TableHead>
        <TableHead className="hidden sm:table-cell">Danh mục</TableHead>
        <TableHead className="hidden md:table-cell">Cửa hàng</TableHead>
        <TableHead className="hidden sm:table-cell">Ngày</TableHead>
        <TableHead className="text-right">Giá</TableHead>
        {withActions && (
          <TableHead className="w-10">
            <span className="sr-only">Thao tác</span>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  )
}

export type EntryActions = {
  /** Locked rows open too: the detail dialog explains the lock. */
  onOpen: (entry: EntryRow) => void
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
}

function RowMenu({ entry, actions }: { entry: Entry; actions: EntryActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${entry.productName ?? "khoản chi"}`}>
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => actions.onEdit(entry)}>
            <PencilIcon />
            Sửa
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(entry)}>
            <Trash2Icon />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Outside a Free user's history window: only the date is known (plans/07 E5). */
function LockedRow({ entry, actions }: { entry: LockedEntry; actions?: EntryActions }) {
  const label = (
    <span className="text-muted-foreground inline-flex items-center gap-1.5">
      <LockIcon className="size-3.5" />
      Đã khoá
    </span>
  )
  return (
    <TableRow>
      <TableCell>
        {actions ? (
          <button
            type="button"
            onClick={() => actions.onOpen(entry)}
            className="focus-visible:ring-ring/50 rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
          >
            {label}
          </button>
        ) : (
          label
        )}
        <div className="text-muted-foreground text-xs sm:hidden">{formatDate(entry.purchasedAt)}</div>
      </TableCell>
      <TableCell className="text-muted-foreground hidden sm:table-cell">—</TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell">—</TableCell>
      <TableCell className="hidden sm:table-cell">{formatDate(entry.purchasedAt)}</TableCell>
      <TableCell className="text-muted-foreground text-right">—</TableCell>
      {actions && <TableCell />}
    </TableRow>
  )
}

export function EntriesTable({
  entries,
  actions,
  stale,
}: {
  entries: EntryRow[]
  /** Clickable names + a ⋯ menu per row. Omitted for the read-only overview list. */
  actions?: EntryActions
  /** Previous page still shown while the next one loads. */
  stale?: boolean
}) {
  // GET /entries returns only categoryId; resolve names from the cached list.
  const categories = useCategoryMap()

  return (
    <Table className={cn("transition-opacity", stale && "opacity-60")}>
      <Head withActions={!!actions} />
      <TableBody>
        {entries.map((e) => {
          if (e.locked) return <LockedRow key={e.id} entry={e} actions={actions} />
          const category = e.categoryId ? categories.get(e.categoryId) : undefined
          return (
            <TableRow key={e.id}>
              <TableCell>
                {actions ? (
                  <button
                    type="button"
                    onClick={() => actions.onOpen(e)}
                    className="focus-visible:ring-ring/50 rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
                  >
                    {e.productName ?? "Khoản chi"}
                  </button>
                ) : (
                  <div className="font-medium">{e.productName ?? "—"}</div>
                )}
                {/* Category and date columns are hidden on phones; summarise them here. */}
                <div className="text-muted-foreground text-xs sm:hidden">
                  {category?.icon} {formatDate(e.purchasedAt)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {category ? (
                  <Badge variant="secondary">
                    {category.icon} {category.name}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">{e.storeName ?? "—"}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(e.purchasedAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(e.price, e.currency)}</TableCell>
              {actions && (
                <TableCell>
                  <RowMenu entry={e} actions={actions} />
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function EntriesTableSkeleton({ rows = 5, withActions }: { rows?: number; withActions?: boolean }) {
  return (
    <Table>
      <Head withActions={withActions} />
      <TableBody>
        {Array.from({ length: rows }, (_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            {withActions && <TableCell />}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
