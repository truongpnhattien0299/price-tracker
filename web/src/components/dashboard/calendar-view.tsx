"use client"

import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, LockIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { DaySheet } from "@/components/dashboard/day-sheet"
import { ProLockDialog } from "@/components/dashboard/pro-lock"
import { ErrorState } from "@/components/shared/query-state"
import { Photo } from "@/components/shared/photo"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useCalendar } from "@/hooks/queries/use-calendar"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { usePhotoUrls } from "@/hooks/queries/use-photo-url"
import { currentMonthKey, monthGrid, shiftMonth, todayKey } from "@/lib/date-range"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CalendarDay } from "@/types/api"

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

/** `?month=YYYY-MM&day=YYYY-MM-DD`, both validated; the month never passes the current one. */
function useCalendarParams() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // Fixed per mount, like the ranges in the overview.
  const { current, today } = useMemo(() => ({ current: currentMonthKey(), today: todayKey() }), [])

  const rawMonth = params.get("month") ?? ""
  const month = MONTH_KEY.test(rawMonth) && rawMonth <= current ? rawMonth : current
  const grid = useMemo(() => monthGrid(month), [month])
  const rawDay = params.get("day")
  const day = rawDay && grid.includes(rawDay) ? rawDay : null

  const set = useCallback(
    (patch: { month?: string; day?: string | null }) => {
      const next = new URLSearchParams(params)
      if (patch.month !== undefined) {
        if (patch.month === current) next.delete("month")
        else next.set("month", patch.month)
        next.delete("day")
      }
      if (patch.day !== undefined) {
        if (patch.day) next.set("day", patch.day)
        else next.delete("day")
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [current, params, pathname, router],
  )

  return { month, day, grid, current, today, set }
}

function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number)
  return `Tháng ${m}, ${y}`
}

function dayLabel(key: string, count: number, locked?: boolean) {
  const [, m, d] = key.split("-").map(Number)
  return `${d} tháng ${m}, ${count} khoản chi${locked ? ", đã khoá" : ""}`
}

function DayCell({
  dayKey,
  info,
  url,
  failed,
  isToday,
  isFuture,
  onOpen,
}: {
  dayKey: string
  info?: CalendarDay
  url?: string
  failed: boolean
  isToday: boolean
  isFuture: boolean
  onOpen: () => void
}) {
  const dayNum = Number(dayKey.slice(8))
  const base = cn(
    "relative aspect-square overflow-hidden rounded-md text-xs sm:text-sm",
    isToday && "ring-primary ring-2 ring-offset-1 ring-offset-background",
  )

  // No money on the calendar (DESIGN.md §8): just photos and an entry count.
  if (!info) {
    return (
      <div className={cn(base, "bg-muted/40 text-muted-foreground p-1 sm:p-1.5", isFuture && "opacity-40")}>
        {dayNum}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={dayLabel(dayKey, info.count, info.locked)}
      className={cn(
        base,
        "bg-muted group focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
      )}
    >
      {info.locked ? (
        // Outside the Free window: the API sends no cover (plans/07 E6).
        <LockIcon className="text-muted-foreground absolute inset-0 m-auto size-4 sm:size-5" />
      ) : info.coverPhotoKey ? (
        <Photo
          src={url}
          failed={failed}
          alt=""
          className="absolute inset-0 transition-transform group-hover:scale-105"
        />
      ) : (
        // Too cramped next to the day number on phones; the filled cell already says "has entries".
        <ImageIcon className="text-muted-foreground absolute inset-0 m-auto hidden size-5 sm:block" />
      )}
      <span
        className={cn(
          "absolute top-1 left-1 font-medium sm:top-1.5 sm:left-1.5",
          info.coverPhotoKey && "text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.8)]",
        )}
      >
        {dayNum}
      </span>
      {info.count > 1 && (
        <span className="bg-background/80 absolute right-1 bottom-1 rounded-full px-1.5 text-[10px] leading-4 font-medium tabular-nums backdrop-blur-sm">
          {info.count}
        </span>
      )}
    </button>
  )
}

export function CalendarView() {
  const { month, day, grid, current, today, set } = useCalendarParams()
  const calendar = useCalendar(month)
  const historyFrom = useEntitlement().data?.historyFrom
  // The day stays set while the dialog animates out, so its title doesn't flicker.
  const [lock, setLock] = useState({ day: "", open: false })
  // A placeholder belongs to the previous month; its dates match no cell anyway.
  const days = calendar.isPlaceholderData ? undefined : calendar.data
  const byDate = useMemo(() => new Map(days?.map((d) => [d.date, d])), [days])
  const coverKeys = useMemo(() => days?.map((d) => d.coverPhotoKey) ?? [], [days])
  const urls = usePhotoUrls(coverKeys)

  const entryCount = days?.reduce((n, d) => n + d.count, 0) ?? 0
  // Only worth saying in a month that actually has locked days.
  const lockNote =
    historyFrom && days?.some((d) => d.locked) ? ` Ngày trước ${formatDate(historyFrom)} cần gói Pro để xem.` : ""

  return (
    <>
      {/* Capped so a full month of square cells fits a laptop screen. */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {monthTitle(month)}
            {calendar.isFetching && !calendar.isPending && <Spinner className="text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            {!days
              ? "Đang tải…"
              : entryCount > 0
                ? `${entryCount} khoản chi trong ${days.length} ngày.${lockNote}`
                : "Chưa có khoản chi nào trong tháng này. Chụp ảnh bằng app trên điện thoại để bắt đầu."}
          </CardDescription>
          <CardAction className="flex items-center gap-1">
            {month !== current && (
              <Button variant="outline" size="sm" onClick={() => set({ month: current })}>
                Hôm nay
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Tháng trước"
              onClick={() => set({ month: shiftMonth(month, -1) })}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Tháng sau"
              disabled={month >= current}
              onClick={() => set({ month: shiftMonth(month, 1) })}
            >
              <ChevronRightIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {calendar.isError ? (
            <ErrorState error={calendar.error} onRetry={() => calendar.refetch()} retrying={calendar.isFetching} />
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-muted-foreground pb-1 text-center text-xs font-medium">
                  {w}
                </div>
              ))}
              {grid.map((key, i) => {
                if (!key) return <div key={`pad-${i}`} />
                if (calendar.isPending) return <Skeleton key={key} className="aspect-square" />
                const info = byDate.get(key)
                return (
                  <DayCell
                    key={key}
                    dayKey={key}
                    info={info}
                    url={info?.coverPhotoKey ? urls.data?.[info.coverPhotoKey] : undefined}
                    failed={urls.isError}
                    isToday={key === today}
                    isFuture={key > today}
                    onOpen={() => (info?.locked ? setLock({ day: key, open: true }) : set({ day: key }))}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DaySheet day={day} onOpenChange={(open) => !open && set({ day: null })} />
      <ProLockDialog
        open={lock.open}
        onOpenChange={(open) => setLock((l) => ({ ...l, open }))}
        title={lock.day ? `Ngày ${formatDate(lock.day)} đã khoá` : "Ngày đã khoá"}
      />
    </>
  )
}
