"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { geocodeApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { Coords } from "@/lib/photo-location"

export const PLACE_SEARCH_MIN = 2

/** Address / place suggestions for the entry form's map (Photon via the BFF). `q` must already be debounced. */
export function usePlaceSearch(q: string, near: Coords | null) {
  const term = q.trim().replace(/\s+/g, " ")
  // ~1 km grid: dragging the pin a little does not refetch every suggestion.
  const bias = near ? { lat: Math.round(near.lat * 100) / 100, lng: Math.round(near.lng * 100) / 100 } : null
  return useQuery({
    queryKey: qk.placeSearch(term.toLowerCase(), bias),
    queryFn: ({ signal }) => geocodeApi.search(term, bias, signal),
    enabled: term.length >= PLACE_SEARCH_MIN,
    staleTime: 60 * 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  })
}
