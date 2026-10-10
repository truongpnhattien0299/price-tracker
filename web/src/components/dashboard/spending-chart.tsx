"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMoney } from "@/lib/format"
import type { TimeSeriesPoint } from "@/types/api"

const config = {
  total: { label: "Chi tiêu", color: "var(--chart-2)" },
} satisfies ChartConfig

export function SpendingChart({ data }: { data: TimeSeriesPoint[] }) {
  // Recharts needs numbers; values are display-only here.
  const rows = data.map((d) => ({ period: d.period, total: Number(d.total) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiêu theo tháng</CardTitle>
        <CardDescription>6 tháng gần nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <BarChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5) + "/" + v.slice(2, 4)} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
