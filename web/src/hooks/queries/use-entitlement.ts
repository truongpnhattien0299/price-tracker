"use client"

import { useQuery } from "@tanstack/react-query"

import { entitlementApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"

/**
 * Current plan, computed by the backend per request (plans/07). Short stale
 * time: the trial can end and the history window slides at VN midnight.
 */
export function useEntitlement() {
  return useQuery({
    queryKey: qk.entitlement,
    queryFn: entitlementApi.get,
    staleTime: 60_000,
  })
}
