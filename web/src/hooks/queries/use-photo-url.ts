"use client"

import { useQuery } from "@tanstack/react-query"

import { uploadsApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"

export function usePhotoUrl(key: string | null | undefined) {
  return useQuery({
    queryKey: qk.photoUrl(key ?? ""),
    queryFn: () => uploadsApi.photoUrl(key!),
    select: (res) => res.url,
    enabled: !!key,
    // Presigned GET URLs expire after 5 minutes; refetch a bit before that.
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
  })
}
