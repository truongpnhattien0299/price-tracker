import type { Metadata } from "next"
import Link from "next/link"

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { EntriesTable } from "@/components/dashboard/entries-table"
import { PageHeader } from "@/components/dashboard/page-header"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { StatCards } from "@/components/dashboard/stat-cards"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockByCategory, mockEntries, mockSummary, mockTimeSeries } from "@/lib/mock-data"

export const metadata: Metadata = { title: "Tổng quan" }

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Tổng quan" description="Chi tiêu của bạn trong tháng này." />
      <StatCards summary={mockSummary} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart data={mockTimeSeries} />
        </div>
        <CategoryBreakdown data={mockByCategory} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Khoản chi gần đây</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/entries">Xem tất cả</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <EntriesTable entries={mockEntries} />
        </CardContent>
      </Card>
    </>
  )
}
