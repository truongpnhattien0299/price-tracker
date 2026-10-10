"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { ChartColumnIcon } from "lucide-react"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { periodsInRange } from "@/lib/date-range"
import { formatMoney } from "@/lib/format"
import type { GroupBy, ReportRange, TimeSeriesPoint } from "@/types/api"

const config = {
  total: { label: "Chi tiêu", color: "var(--chart-1)" },
} satisfies ChartConfig

// "2026-10-05" → "05/10", "2026-10" → "10/26", "2026" → "2026".
const tickFormat: Record<GroupBy, (p: string) => string> = {
  day: (p) => `${p.slice(8, 10)}/${p.slice(5, 7)}`,
  month: (p) => `${p.slice(5, 7)}/${p.slice(2, 4)}`,
  year: (p) => p,
}

function Chart({ data, groupBy, range }: { data: TimeSeriesPoint[]; groupBy: GroupBy; range: Required<ReportRange> }) {
  // Backend only returns periods that have entries; pad the gaps with 0.
  const rows = useMemo(() => {
    const totals = new Map(data.map((d) => [d.period, d.total]))
    return periodsInRange(range, groupBy).map((period) => ({ period, total: totals.get(period) ?? 0 }))
  }, [data, groupBy, range])

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={rows}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tickFormatter={tickFormat[groupBy]}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}

export function SpendingChart({
  query,
  groupBy,
  range,
  title,
  description,
  action,
  notice,
}: {
  query: UseQueryResult<TimeSeriesPoint[]>
  groupBy: GroupBy
  range: Required<ReportRange>
  title: string
  description?: string
  action?: React.ReactNode
  /** Replaces the body, e.g. an upgrade notice for a Pro-only grouping. */
  notice?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        {notice ?? (
          <QueryContent
            query={query}
            skeleton={<Skeleton className="h-64 w-full" />}
            isEmpty={(data) => data.length === 0}
            empty={
              <EmptyState
                icon={ChartColumnIcon}
                title="Chưa có chi tiêu"
                description="Không có khoản chi nào trong khoảng thời gian này."
              />
            }
          >
            {(data) => <Chart data={data} groupBy={groupBy} range={range} />}
          </QueryContent>
        )}
      </CardContent>
    </Card>
  )
}
