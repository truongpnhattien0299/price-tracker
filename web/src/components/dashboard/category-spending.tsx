"use client"

import { ChartColumnStackedIcon, LockIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { UPGRADE_HREF } from "@/components/dashboard/pro-lock"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCategories } from "@/hooks/queries/use-categories"
import { useCategorySeries } from "@/hooks/queries/use-reports"
import { paywallCode } from "@/lib/api/client"
import { periodsInRange } from "@/lib/date-range"
import { formatMoney } from "@/lib/format"
import type { CategorySeriesPoint, ReportRange } from "@/types/api"

type Period = "month" | "year"

/** Stands for entries without a category, in the API filter and as a series key. */
const NONE = "none"
const OTHER = "other"
// --chart-1..5 are the only series colours; a sixth category and beyond stack as "Khác".
const MAX_SERIES = 5
// The outline toggle's "on" state is too faint for a multi-select filter.
const CHIP_ON =
  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"

// "2026-10" → "10/2026", "2026" → "2026".
const periodLabel = (p: string) => (p.length === 7 ? `${p.slice(5, 7)}/${p.slice(0, 4)}` : p)
const tickFormat = (p: string) => (p.length === 7 ? `${p.slice(5, 7)}/${p.slice(2, 4)}` : p)

type Series = { key: string; label: string; total: number; count: number }

/** Category totals over the whole range, biggest first; the tail folds into "Khác". */
function buildSeries(data: CategorySeriesPoint[]) {
  const byKey = new Map<string, Series>()
  for (const r of data) {
    const key = r.categoryId ?? NONE
    const s = byKey.get(key) ?? { key, label: r.categoryName, total: 0, count: 0 }
    s.total += r.total
    s.count += r.count
    byKey.set(key, s)
  }
  const all = [...byKey.values()].sort((a, b) => b.total - a.total)
  if (all.length <= MAX_SERIES) return { all, shown: all, folded: new Set<string>() }
  const head = all.slice(0, MAX_SERIES - 1)
  const tail = all.slice(MAX_SERIES - 1)
  const other: Series = {
    key: OTHER,
    label: "Khác",
    total: tail.reduce((n, s) => n + s.total, 0),
    count: tail.reduce((n, s) => n + s.count, 0),
  }
  return { all, shown: [...head, other], folded: new Set(tail.map((s) => s.key)) }
}

function Report({
  data,
  groupBy,
  range,
}: {
  data: CategorySeriesPoint[]
  groupBy: Period
  range: Required<ReportRange>
}) {
  const { all, shown, folded, rows, periods, config, colorOf, total, count } = useMemo(() => {
    const { all, shown, folded } = buildSeries(data)
    const colorOf = new Map(shown.map((s, i) => [s.key, `var(--chart-${i + 1})`]))
    const config: ChartConfig = Object.fromEntries(
      shown.map((s) => [s.key, { label: s.label, color: colorOf.get(s.key) }]),
    )
    // Backend only returns periods that have entries; pad the gaps with 0.
    const rows = periodsInRange(range, groupBy).map((period) => {
      const row: Record<string, string | number> = { period }
      for (const s of shown) row[s.key] = 0
      return row
    })
    const rowOf = new Map(rows.map((r) => [r.period as string, r]))
    const periods = new Map<string, { total: number; count: number }>()
    for (const r of data) {
      const key = r.categoryId ?? NONE
      const row = rowOf.get(r.period)
      const seriesKey = folded.has(key) ? OTHER : key
      if (row) row[seriesKey] = (row[seriesKey] as number) + r.total
      const p = periods.get(r.period) ?? { total: 0, count: 0 }
      p.total += r.total
      p.count += r.count
      periods.set(r.period, p)
    }
    const total = all.reduce((n, s) => n + s.total, 0)
    const count = all.reduce((n, s) => n + s.count, 0)
    return { all, shown, folded, rows, periods, config, colorOf, total, count }
  }, [data, groupBy, range])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">Tổng trong kỳ</p>
        <p className="text-2xl font-semibold tabular-nums">{formatMoney(total)}</p>
        <p className="text-muted-foreground text-xs">{count} khoản chi</p>
      </div>

      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={rows}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={16} tickFormatter={tickFormat} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(p) => periodLabel(String(p))}
                formatter={(v, name) => (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{config[String(name)]?.label}</span>
                    <span className="font-medium tabular-nums">{formatMoney(Number(v))}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {shown.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="spend"
              maxBarSize={64}
              fill={`var(--color-${s.key})`}
              // Round only the top of the stack.
              radius={i === shown.length - 1 ? [6, 6, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Theo {groupBy === "month" ? "tháng" : "năm"}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupBy === "month" ? "Tháng" : "Năm"}</TableHead>
                <TableHead className="text-right">Số khoản</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...periods.entries()]
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([period, p]) => (
                  <TableRow key={period}>
                    <TableCell>{periodLabel(period)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.total)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">Theo danh mục</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-right">Tỷ trọng</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="max-w-40">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-[2px]"
                        // The table sits outside ChartContainer, which scopes the --color-* vars.
                        style={{ background: colorOf.get(folded.has(s.key) ? OTHER : s.key) }}
                      />
                      <span className="truncate">{s.label}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {total > 0 ? `${Math.round((s.total / total) * 1000) / 10}%` : "–"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

/**
 * Spending of one or more categories per month or year, over the reports page's
 * range. No category picked = all of them.
 */
export function CategorySpending({ range }: { range: Required<ReportRange> }) {
  const categories = useCategories()
  const [groupBy, setGroupBy] = useState<Period>("month")
  const [picked, setPicked] = useState<string[]>([])

  // Sorted so the same selection in another order reuses the cached query.
  const categoryIds = useMemo(() => [...picked].sort(), [picked])
  const series = useCategorySeries({ ...range, groupBy, categoryIds })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiêu theo danh mục</CardTitle>
        <CardDescription>Tổng của các danh mục đã chọn, theo tháng hoặc năm</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={groupBy}
            onValueChange={(v) => v && setGroupBy(v as Period)}
            aria-label="Nhóm theo"
          >
            <ToggleGroupItem value="month">Tháng</ToggleGroupItem>
            <ToggleGroupItem value="year">Năm</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={picked.length === 0 ? "default" : "outline"}
            aria-pressed={picked.length === 0}
            onClick={() => setPicked([])}
          >
            Tất cả
          </Button>
          {categories.isPending ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              value={picked}
              onValueChange={setPicked}
              aria-label="Danh mục"
              // `contents`: the chips wrap in the same row as "Tất cả".
              className="contents"
            >
              {categories.data?.map((c) => (
                <ToggleGroupItem key={c.id} value={c.id} className={CHIP_ON}>
                  {c.icon && <span aria-hidden>{c.icon}</span>}
                  {c.name}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value={NONE} className={CHIP_ON}>
                Không có danh mục
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        {paywallCode(series.error) === "PRO_ONLY" ? (
          <Alert>
            <LockIcon />
            <AlertTitle>Tính năng Pro</AlertTitle>
            <AlertDescription>
              <p>
                Báo cáo theo năm dành cho gói Pro.{" "}
                <Link href={UPGRADE_HREF} className="text-foreground underline underline-offset-4">
                  Xem gói Pro
                </Link>
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <QueryContent
            query={series}
            skeleton={<Skeleton className="h-64 w-full" />}
            isEmpty={(data) => data.length === 0}
            empty={
              <EmptyState
                icon={ChartColumnStackedIcon}
                title="Chưa có chi tiêu"
                description={
                  picked.length
                    ? "Các danh mục đã chọn không có khoản chi nào trong khoảng thời gian này."
                    : "Không có khoản chi nào trong khoảng thời gian này."
                }
              />
            }
          >
            {(data) => <Report data={data} groupBy={groupBy} range={range} />}
          </QueryContent>
        )}
      </CardContent>
    </Card>
  )
}
