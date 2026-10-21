"use client"

import { LockIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { CategorySpending } from "@/components/dashboard/category-spending"
import { UPGRADE_HREF } from "@/components/dashboard/pro-lock"
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { StatCards } from "@/components/dashboard/stat-cards"
import { TopStores } from "@/components/dashboard/top-stores"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  useCategoryBreakdown,
  useReportSummary,
  useTimeSeries,
  useTopStores,
} from "@/hooks/queries/use-reports"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { paywallCode } from "@/lib/api/client"
import { dayKeysToRange, fromDayKey, toDayKey, todayKey } from "@/lib/date-range"
import { formatDate } from "@/lib/format"
import type { GroupBy, ReportRange } from "@/types/api"

const GROUP_BY: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
]

/** Six months back, but never before `minDay` (a Free user's history window). */
function defaultRange(minDay: string | null): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return { from: minDay && toDayKey(from) < minDay ? fromDayKey(minDay) : from, to: now }
}

export function ReportsView() {
  const entitlement = useEntitlement()
  // The default range and the picker depend on the plan; don't fetch a range the API refuses.
  if (entitlement.isPending) {
    return (
      <>
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-64 w-full" />
      </>
    )
  }
  const historyFrom = entitlement.data?.historyFrom ?? null
  return <Reports minDay={historyFrom ? todayKey(new Date(historyFrom)) : null} />
}

function Reports({ minDay }: { minDay: string | null }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("month")
  const [picked, setPicked] = useState<DateRange | undefined>(() => defaultRange(minDay))

  // A half-picked range (only `from`) reads as that single day.
  const range = useMemo(() => {
    const from = picked?.from ?? defaultRange(minDay).from!
    return dayKeysToRange(toDayKey(from), toDayKey(picked?.to ?? from)) as Required<ReportRange>
  }, [picked, minDay])

  const summary = useReportSummary(range)
  const series = useTimeSeries(groupBy, range)
  const byCategory = useCategoryBreakdown(range)
  const topStores = useTopStores(range)

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <DateRangePicker value={picked} onChange={setPicked} minDate={minDay ? fromDayKey(minDay) : undefined} />
        {minDay && (
          <p className="text-muted-foreground text-sm">
            Gói Free xem báo cáo từ {formatDate(minDay)}.{" "}
            <Link href={UPGRADE_HREF} className="text-foreground underline underline-offset-4">
              Xem gói Pro
            </Link>
          </p>
        )}
      </div>
      <StatCards query={summary} totalLabel="Tổng chi trong kỳ" />
      <SpendingChart
        query={series}
        groupBy={groupBy}
        range={range}
        title="Chi tiêu theo thời gian"
        action={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={groupBy}
            // Radix emits "" when the active item is clicked again; keep the current one.
            onValueChange={(v) => v && setGroupBy(v as GroupBy)}
            aria-label="Nhóm theo"
          >
            {GROUP_BY.map((g) => (
              <ToggleGroupItem key={g.value} value={g.value}>
                {g.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
        notice={
          // The backend refused a Pro-only grouping (plans/07 E8): an upsell, not a failure.
          paywallCode(series.error) === "PRO_ONLY" ? (
            <Alert>
              <LockIcon />
              <AlertTitle>Tính năng Pro</AlertTitle>
              <AlertDescription>
                <p>
                  Báo cáo theo {GROUP_BY.find((g) => g.value === groupBy)?.label.toLowerCase()} dành cho gói Pro.{" "}
                  <Link href={UPGRADE_HREF} className="text-foreground underline underline-offset-4">
                    Xem gói Pro
                  </Link>
                </p>
              </AlertDescription>
            </Alert>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown query={byCategory} description="Tỷ trọng trong kỳ đã chọn" />
        <TopStores query={topStores} />
      </div>
      <CategorySpending range={range} />
    </>
  )
}
