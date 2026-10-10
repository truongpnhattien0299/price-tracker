"use client"

import { CalendarIcon, ClockIcon } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { vi as dayPickerVi } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fromDayKey, toDayKey, todayKey, toVnInput } from "@/lib/date-range"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * One scrollable column of the time popover (hours or minutes). Opens with the
 * selected value centred — set on `scrollTop` directly, because
 * `scrollIntoView` would also scroll the dialog behind the popover.
 */
function TimeColumn({
  label,
  count,
  value,
  isDisabled,
  onPick,
}: {
  label: string
  count: number
  value: number
  isDisabled: (n: number) => boolean
  onPick: (n: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Mount only: re-centring on every pick would yank the list under the pointer.
  useLayoutEffect(() => {
    const list = listRef.current
    const item = selectedRef.current
    if (list && item) list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2
  }, [])

  return (
    <div className="flex flex-col">
      <div className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground">{label}</div>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        className="relative flex h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none]"
      >
        {Array.from({ length: count }, (_, n) => (
          <Button
            key={n}
            ref={n === value ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={n === value}
            size="sm"
            variant={n === value ? "default" : "ghost"}
            disabled={isDisabled(n)}
            className="w-11 shrink-0 tabular-nums"
            onClick={() => onPick(n)}
          >
            {pad(n)}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * Date + time as `YYYY-MM-DDTHH:mm` (VN wall time, the `toVnInput` format).
 *
 * Replaces `<input type="datetime-local">`, which Safari draws as a native
 * control with a fixed minimum width (it ignores `w-full` and overflowed the
 * dialog sideways) and no calendar icon. Both halves are popovers, so every
 * browser shows the same thing: the Calendar used by the report filters, and
 * hour / minute columns. Times later than now are disabled on today.
 */
export function DateTimePicker({
  id,
  value,
  invalid,
  onChange,
}: {
  /** Goes on the day button, so a `<label htmlFor>` focuses it. */
  id?: string
  value: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  const [dayOpen, setDayOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [day = "", time = "00:00"] = value.split("T")
  const [y, m, d] = day.split("-")
  const [hour, minute] = time.split(":").map(Number) as [number, number]

  // VN "now", read at render: good enough for disabling, the form re-validates on submit.
  const [nowDay, nowTime] = toVnInput(new Date()).split("T") as [string, string]
  const [nowHour, nowMinute] = nowTime.split(":").map(Number) as [number, number]
  const isToday = day === nowDay

  const setTime = (h: number, min: number) => onChange(`${day || todayKey()}T${pad(h)}:${pad(min)}`)

  return (
    <div className="flex gap-2">
      <Popover open={dayOpen} onOpenChange={setDayOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className="min-w-0 flex-1 justify-start font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            {day ? `${d}/${m}/${y}` : <span className="text-muted-foreground">Chọn ngày</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            required
            selected={day ? fromDayKey(day) : undefined}
            defaultMonth={day ? fromDayKey(day) : undefined}
            onSelect={(date) => {
              const picked = toDayKey(date)
              // Back to today with a later time: clamp to now rather than leave a future purchase.
              onChange(`${picked}T${picked === nowDay && time > nowTime ? nowTime : time}`)
              setDayOpen(false)
            }}
            locale={dayPickerVi}
            // The locale's "Th 2"…"Th 7" don't fit a day cell; use "T2"…"CN".
            formatters={{ formatWeekdayName: (w) => (w.getDay() === 0 ? "CN" : `T${w.getDay() + 1}`) }}
            disabled={{ after: fromDayKey(nowDay) }}
          />
        </PopoverContent>
      </Popover>

      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={`Giờ mua: ${time}`}
            aria-invalid={invalid || undefined}
            className="w-24 shrink-0 justify-start font-normal tabular-nums"
          >
            <ClockIcon data-icon="inline-start" />
            {time}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <div className="flex gap-1">
            <TimeColumn
              label="Giờ"
              count={24}
              value={hour}
              isDisabled={(h) => isToday && h > nowHour}
              // Keep the minute unless that would land in the future.
              onPick={(h) => setTime(h, isToday && h === nowHour ? Math.min(minute, nowMinute) : minute)}
            />
            <div className="w-px self-stretch bg-border" />
            <TimeColumn
              label="Phút"
              count={60}
              value={minute}
              isDisabled={(min) => isToday && hour === nowHour && min > nowMinute}
              onPick={(min) => {
                setTime(hour, min)
                setTimeOpen(false)
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
