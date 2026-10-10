"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { entriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { EntryQuery } from "@/types/api"

export function useEntries(query: EntryQuery) {
  return useQuery({
    queryKey: qk.entries.list(query),
    queryFn: () => entriesApi.list(query),
    // Keep the old page on screen while the next one loads — no blank flash.
    placeholderData: keepPreviousData,
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: entriesApi.remove,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.entries.all }),
        queryClient.invalidateQueries({ queryKey: qk.calendar.all }),
        queryClient.invalidateQueries({ queryKey: qk.reports.all }),
      ]),
  })
}
