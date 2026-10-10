import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import type { CategoryBreakdown as Row } from "@/types/api"

export function CategoryBreakdown({ data }: { data: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theo danh mục</CardTitle>
        <CardDescription>Tỷ trọng chi tiêu tháng này</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((row) => (
          <div key={row.categoryName} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{row.categoryName}</span>
              <span className="text-muted-foreground tabular-nums">{formatMoney(row.total)}</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${row.percentage}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
