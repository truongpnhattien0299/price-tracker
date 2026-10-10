"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { StoreIcon } from "lucide-react"

import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import type { TopStore } from "@/types/api"

export function TopStores({ query }: { query: UseQueryResult<TopStore[]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top cửa hàng</CardTitle>
        <CardDescription>Theo tổng chi tiêu</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryContent
          query={query}
          skeleton={
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          }
          isEmpty={(data) => data.length === 0}
          empty={
            <EmptyState
              icon={StoreIcon}
              title="Chưa có cửa hàng"
              description="Các khoản chi có tên cửa hàng sẽ hiện ở đây."
            />
          }
        >
          {(data) => (
            <ul className="divide-y text-sm">
              {data.map((s) => (
                <li key={s.storeName} className="flex justify-between gap-2 py-2">
                  <span className="truncate">
                    {s.storeName} <span className="text-muted-foreground">· {s.count} lần</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </QueryContent>
      </CardContent>
    </Card>
  )
}
