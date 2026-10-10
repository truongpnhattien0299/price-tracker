"use client"

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { uploadsApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"

// Presigned GET URLs expire after 5 minutes; refetch a bit before that.
const URL_TTL = 4 * 60_000

export function usePhotoUrl(key: string | null | undefined) {
  return useQuery({
    queryKey: qk.photoUrl(key ?? ""),
    queryFn: () => uploadsApi.photoUrl(key!),
    select: (res) => res.url,
    enabled: !!key,
    staleTime: URL_TTL,
    gcTime: URL_TTL,
  })
}

/**
 * Presigned URLs for a whole grid in one request (the API rate-limits per IP,
 * and behind the BFF every user shares one IP). Each URL is also written to
 * its `usePhotoUrl` cache entry so a detail view opened next costs nothing.
 */
export function usePhotoUrls(keys: (string | null | undefined)[]) {
  const queryClient = useQueryClient()
  const unique = useMemo(
    () => [...new Set(keys.filter((k): k is string => !!k))].sort(),
    [keys],
  )

  return useQuery({
    queryKey: qk.photoUrls(unique),
    queryFn: async () => {
      const { urls } = await uploadsApi.photoUrls(unique)
      for (const [key, url] of Object.entries(urls)) {
        queryClient.setQueryData(qk.photoUrl(key), { url })
      }
      return urls
    },
    enabled: unique.length > 0,
    // Keep the previous grid's photos while another month's URLs load.
    placeholderData: keepPreviousData,
    staleTime: URL_TTL,
    gcTime: URL_TTL,
  })
}
