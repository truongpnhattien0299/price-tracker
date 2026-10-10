"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { ChartPieIcon } from "lucide-react"

import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import type { CategoryBreakdown as Row } from "@/types/api"

function BreakdownSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  )
}

export function CategoryBreakdown({
  query,
  description,
}: {
  query: UseQueryResult<Row[]>
  description?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theo danh mục</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <QueryContent
          query={query}
          skeleton={<BreakdownSkeleton />}
          isEmpty={(data) => data.length === 0}
          empty={<EmptyState icon={ChartPieIcon} title="Chưa có dữ liệu" />}
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              {data.map((row) => (
                <div key={row.categoryName} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">
                      {row.categoryName} <span className="text-muted-foreground">· {row.count}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatMoney(row.total)}</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryContent>
      </CardContent>
    </Card>
  )
}
