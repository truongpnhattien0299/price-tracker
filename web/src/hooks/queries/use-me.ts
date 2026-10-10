"use client"

import { useQuery } from "@tanstack/react-query"

import { authApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: authApi.me,
    select: (res) => res.user,
    staleTime: 5 * 60_000,
  })
}
