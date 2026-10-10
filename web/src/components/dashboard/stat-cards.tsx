"use client"

import type { UseQueryResult } from "@tanstack/react-query"

import { ErrorState } from "@/components/shared/query-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import type { ReportSummary } from "@/types/api"

export function StatCards({
  query,
  totalLabel = "Tổng chi",
}: {
  query: UseQueryResult<ReportSummary>
  totalLabel?: string
}) {
  if (query.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        </CardContent>
      </Card>
    )
  }

  const s = query.data
  const stats = [
    { label: totalLabel, value: s && formatMoney(s.totalSpent, s.currency) },
    { label: "Số khoản chi", value: s && String(s.entryCount) },
    { label: "Trung bình / khoản", value: s && formatMoney(s.avgPerEntry, s.currency) },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stat.value ?? <Skeleton className="h-8 w-32" />}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
