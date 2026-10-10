"use client"

import { Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { Entry } from "@/types/api"

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

export function EntriesTable({
  entries,
  onDelete,
  stale,
}: {
  entries: Entry[]
  onDelete?: (entry: Entry) => void
  /** Previous page still shown while the next one loads. */
  stale?: boolean
}) {
  // GET /entries returns only categoryId; resolve names from the cached list.
  const categories = useCategoryMap()

  return (
    <Table className={cn("transition-opacity", stale && "opacity-60")}>
      <Head withActions={!!onDelete} />
      <TableBody>
        {entries.map((e) => {
          const category = e.categoryId ? categories.get(e.categoryId) : undefined
          return (
            <TableRow key={e.id}>
              <TableCell>
                <div className="font-medium">{e.productName ?? "—"}</div>
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
              {onDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá ${e.productName ?? "khoản chi"}`}
                    onClick={() => onDelete(e)}
                  >
                    <Trash2Icon />
                  </Button>
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
