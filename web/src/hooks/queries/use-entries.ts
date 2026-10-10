"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { entriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { EntryInput, EntryQuery, EntryRow } from "@/types/api"

export function useEntries(query: EntryQuery) {
  return useQuery({
    queryKey: qk.entries.list(query),
    queryFn: () => entriesApi.list(query),
    // Keep the old page on screen while the next one loads — no blank flash.
    placeholderData: keepPreviousData,
  })
}

/**
 * One entry. `initial` (the row already on screen) avoids a loading flash when
 * opening it. `enabled: false` keeps the cached data for a closing dialog
 * without refetching it.
 */
export function useEntry(id: string | null, initial?: EntryRow, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.entries.detail(id ?? ""),
    queryFn: () => entriesApi.get(id!),
    enabled: enabled && !!id,
    initialData: initial?.id === id ? initial : undefined,
  })
}

/**
 * Any entry write can move totals, calendar cells and every list page. The
 * written entry's own detail is skipped: it was just set from the response,
 * or (after a delete) refetching it would only 404.
 */
function invalidateEntryData(queryClient: QueryClient, writtenId: string) {
  const detail = qk.entries.detail(writtenId)
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: qk.entries.all,
      predicate: (q) => !detail.every((part, i) => q.queryKey[i] === part),
    }),
    queryClient.invalidateQueries({ queryKey: qk.calendar.all }),
    queryClient.invalidateQueries({ queryKey: qk.reports.all }),
    // Creates and deletes move the Free plan's monthly count.
    queryClient.invalidateQueries({ queryKey: qk.entitlement }),
  ])
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: entriesApi.create,
    onSuccess: (entry) => {
      queryClient.setQueryData(qk.entries.detail(entry.id), entry)
      return invalidateEntryData(queryClient, entry.id)
    },
  })
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EntryInput }) => entriesApi.update(id, input),
    onSuccess: (entry) => {
      queryClient.setQueryData(qk.entries.detail(entry.id), entry)
      return invalidateEntryData(queryClient, entry.id)
    },
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: entriesApi.remove,
    onSuccess: (_, id) => invalidateEntryData(queryClient, id),
  })
}
