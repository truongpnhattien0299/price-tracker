import type { Metadata } from "next"

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { PageHeader } from "@/components/dashboard/page-header"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import { mockByCategory, mockTimeSeries, mockTopStores } from "@/lib/mock-data"

export const metadata: Metadata = { title: "Báo cáo" }

// TODO(plan): date-range picker + day/month/year tabs driving /reports/*.
export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Báo cáo" description="Phân tích chi tiêu theo thời gian, danh mục, cửa hàng." />
      <SpendingChart data={mockTimeSeries} />
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown data={mockByCategory} />
        <Card>
          <CardHeader>
            <CardTitle>Top cửa hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {mockTopStores.map((s) => (
                <li key={s.storeName} className="flex justify-between py-2">
                  <span>
                    {s.storeName} <span className="text-muted-foreground">· {s.count} lần</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
