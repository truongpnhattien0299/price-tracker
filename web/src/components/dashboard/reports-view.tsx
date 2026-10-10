"use client"

import { LockIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { StatCards } from "@/components/dashboard/stat-cards"
import { TopStores } from "@/components/dashboard/top-stores"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  useCategoryBreakdown,
  useReportSummary,
  useTimeSeries,
  useTopStores,
} from "@/hooks/queries/use-reports"
import { HttpError } from "@/lib/api/client"
import { dayKeysToRange, toDayKey } from "@/lib/date-range"
import type { GroupBy, ReportRange } from "@/types/api"

const GROUP_BY: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
]

function defaultRange(): DateRange {
  const now = new Date()
  return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now }
}

/** 402/403 = the backend refused a Pro-only report (DESIGN.md §14), not a failure. */
function isPaywalled(error: unknown) {
  return error instanceof HttpError && (error.status === 402 || error.status === 403)
}

export function ReportsView() {
  const [groupBy, setGroupBy] = useState<GroupBy>("month")
  const [picked, setPicked] = useState<DateRange | undefined>(defaultRange)

  // A half-picked range (only `from`) reads as that single day.
  const range = useMemo(() => {
    const from = picked?.from ?? defaultRange().from!
    return dayKeysToRange(toDayKey(from), toDayKey(picked?.to ?? from)) as Required<ReportRange>
  }, [picked])

  const summary = useReportSummary(range)
  const series = useTimeSeries(groupBy, range)
  const byCategory = useCategoryBreakdown(range)
  const topStores = useTopStores(range)

  return (
    <>
      <DateRangePicker value={picked} onChange={setPicked} />
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
          isPaywalled(series.error) ? (
            <Alert>
              <LockIcon />
              <AlertTitle>Tính năng Pro</AlertTitle>
              <AlertDescription>
                Nâng cấp lên Pro để xem báo cáo theo {GROUP_BY.find((g) => g.value === groupBy)?.label.toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown query={byCategory} description="Tỷ trọng trong kỳ đã chọn" />
        <TopStores query={topStores} />
      </div>
    </>
  )
}
