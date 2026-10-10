"use client"

import { ReceiptTextIcon } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { EntriesTable, EntriesTableSkeleton } from "@/components/dashboard/entries-table"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { StatCards } from "@/components/dashboard/stat-cards"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEntries } from "@/hooks/queries/use-entries"
import {
  useCategoryBreakdown,
  useReportSummary,
  useTimeSeries,
} from "@/hooks/queries/use-reports"
import { currentMonthRange, lastNMonthsRange } from "@/lib/date-range"

const RECENT = { limit: 5 }

export function OverviewView() {
  // Fixed per mount so query keys stay stable across re-renders.
  const month = useMemo(() => currentMonthRange(), [])
  const sixMonths = useMemo(() => lastNMonthsRange(6), [])

  const summary = useReportSummary(month)
  const byCategory = useCategoryBreakdown(month)
  const series = useTimeSeries("month", sixMonths)
  const recent = useEntries(RECENT)

  return (
    <>
      <StatCards query={summary} totalLabel="Tổng chi tháng này" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart
            query={series}
            groupBy="month"
            range={sixMonths}
            title="Chi tiêu theo tháng"
            description="6 tháng gần nhất"
          />
        </div>
        <CategoryBreakdown query={byCategory} description="Tỷ trọng chi tiêu tháng này" />
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
          <QueryContent
            query={recent}
            skeleton={<EntriesTableSkeleton />}
            isEmpty={(res) => res.data.length === 0}
            empty={
              <EmptyState
                icon={ReceiptTextIcon}
                title="Chưa có khoản chi nào"
                description="Chụp ảnh món đồ bằng app trên điện thoại để bắt đầu ghi chi tiêu."
              />
            }
          >
            {(res) => <EntriesTable entries={res.data} />}
          </QueryContent>
        </CardContent>
      </Card>
    </>
  )
}
