"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { entriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { MapQuery } from "@/types/api"

/** Every located entry in the range, for the map (plans/08). */
export function useMapPoints(query: MapQuery) {
  return useQuery({
    queryKey: qk.entries.map(query),
    queryFn: () => entriesApi.map(query),
    placeholderData: keepPreviousData,
  })
}
