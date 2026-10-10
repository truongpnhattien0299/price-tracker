import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatMoney } from "@/lib/format"
import type { Entry } from "@/types/api"

export function EntriesTable({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground py-10 text-center text-sm">Chưa có khoản chi nào.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sản phẩm</TableHead>
          <TableHead>Danh mục</TableHead>
          <TableHead className="hidden md:table-cell">Cửa hàng</TableHead>
          <TableHead className="hidden sm:table-cell">Ngày</TableHead>
          <TableHead className="text-right">Giá</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.productName ?? "—"}</TableCell>
            <TableCell>
              {e.category ? (
                <Badge variant="secondary">
                  {e.category.icon} {e.category.name}
                </Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell">{e.storeName ?? "—"}</TableCell>
            <TableCell className="hidden sm:table-cell">{formatDate(e.purchasedAt)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(e.price, e.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
