"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { adminCategoriesApi, categoriesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { Category, CategoryInput } from "@/types/api"

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: categoriesApi.list,
    // Only admins change the list, and their mutations invalidate this key.
    staleTime: Infinity,
  })
}

/** id → Category lookup. `GET /entries` returns only `categoryId`, not the relation. */
export function useCategoryMap() {
  const { data } = useCategories()
  return useMemo(() => new Map<string, Category>(data?.map((c) => [c.id, c])), [data])
}

export function useAdminCategories() {
  return useQuery({ queryKey: qk.adminCategories, queryFn: adminCategoriesApi.list })
}

/**
 * `categories` is a prefix of the admin key, so one call refreshes both. Reports
 * read category names in SQL, and entry details may embed the category.
 */
function useCategoryMutation<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.categories }),
        queryClient.invalidateQueries({ queryKey: qk.entries.all }),
        queryClient.invalidateQueries({ queryKey: qk.reports.all }),
      ]),
  })
}

export const useCreateCategory = () =>
  useCategoryMutation((body: CategoryInput & { name: string }) => adminCategoriesApi.create(body))
export const useUpdateCategory = () =>
  useCategoryMutation(({ id, input }: { id: string; input: CategoryInput }) => adminCategoriesApi.update(id, input))
export const useDeleteCategory = () => useCategoryMutation((id: string) => adminCategoriesApi.remove(id))
