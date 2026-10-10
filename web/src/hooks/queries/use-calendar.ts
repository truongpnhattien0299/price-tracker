"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { entriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"

/** Days of a VN month (`YYYY-MM`) that have entries, with each day's first photo. */
export function useCalendar(month: string) {
  return useQuery({
    queryKey: qk.calendar.month(month),
    queryFn: () => entriesApi.calendar(month),
    placeholderData: keepPreviousData,
  })
}
