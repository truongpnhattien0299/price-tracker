"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { vi as dayPickerVi } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type { DateRange }

function label(range: DateRange | undefined, placeholder: string) {
  const fmt = (d: Date) => format(d, "dd/MM/yyyy", { locale: vi })
  if (!range?.from) return placeholder
  if (!range.to) return `Từ ${fmt(range.from)}`
  return `${fmt(range.from)} – ${fmt(range.to)}`
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Chọn khoảng ngày",
  clearable,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  clearable?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start font-normal">
            <CalendarIcon data-icon="inline-start" />
            <span className={value?.from ? undefined : "text-muted-foreground"}>{label(value, placeholder)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            locale={dayPickerVi}
            // The locale's "Th 2"…"Th 7" don't fit a day cell; use "T2"…"CN".
            formatters={{ formatWeekdayName: (d) => (d.getDay() === 0 ? "CN" : `T${d.getDay() + 1}`) }}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value?.from && (
        <Button variant="ghost" size="icon" aria-label="Xoá khoảng ngày" onClick={() => onChange(undefined)}>
          <XIcon />
        </Button>
      )}
    </div>
  )
}
