"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { categoriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { Category } from "@/types/api"

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: categoriesApi.list,
    // The 8 defaults are seeded on boot and practically never change.
    staleTime: Infinity,
  })
}

/** id → Category lookup. `GET /entries` returns only `categoryId`, not the relation. */
export function useCategoryMap() {
  const { data } = useCategories()
  return useMemo(() => new Map<string, Category>(data?.map((c) => [c.id, c])), [data])
}
