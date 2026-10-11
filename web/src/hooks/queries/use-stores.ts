"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { adminStoresApi, storesApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { Coords } from "@/lib/photo-location"
import type { AdminStoreQuery, StoreInput } from "@/types/api"

type NewStore = Required<Pick<StoreInput, "name" | "latitude" | "longitude">> & StoreInput

/**
 * Stores the user may pick (own + global), nearest first when `near` is known,
 * else most used. An empty `q` lists them all: the picker opens on suggestions.
 * `q` must already be debounced.
 */
export function useStoreSearch(q: string, near: Coords | null, { enabled = true } = {}) {
  const term = q.trim().replace(/\s+/g, " ").toLowerCase()
  // ~100 m grid: a pin nudge inside one shop reuses the list.
  const bias = near ? { lat: Math.round(near.lat * 1000) / 1000, lng: Math.round(near.lng * 1000) / 1000 } : null
  return useQuery({
    queryKey: qk.stores.search(term, bias),
    queryFn: ({ signal }) => storesApi.search({ q: term || undefined, lat: bias?.lat, lng: bias?.lng, limit: 8 }, signal),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useMyStores() {
  return useQuery({ queryKey: qk.stores.mine, queryFn: storesApi.mine })
}

export function useAdminStores(query: AdminStoreQuery) {
  return useQuery({
    queryKey: qk.stores.admin(query),
    queryFn: () => adminStoresApi.list(query),
    placeholderData: keepPreviousData,
  })
}

/**
 * Editing, deleting or merging a store rewrites the copy held by every entry
 * linked to it (plans/09 S7): lists, the map (under `entries`) and the
 * top-stores report all show that copy.
 */
function invalidateStoreData(queryClient: QueryClient, { entries }: { entries: boolean }) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.stores.all }),
    ...(entries
      ? [
          queryClient.invalidateQueries({ queryKey: qk.entries.all }),
          queryClient.invalidateQueries({ queryKey: qk.reports.all }),
        ]
      : []),
  ])
}

function useStoreMutation<V, R>(fn: (v: V) => Promise<R>, opts: { entries: boolean }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateStoreData(queryClient, opts),
  })
}

export const useCreateStore = () => useStoreMutation((body: NewStore) => storesApi.create(body), { entries: false })
export const useUpdateStore = () =>
  useStoreMutation(({ id, input }: { id: string; input: StoreInput }) => storesApi.update(id, input), { entries: true })
export const useDeleteStore = () => useStoreMutation((id: string) => storesApi.remove(id), { entries: true })
export const useProposeStore = () => useStoreMutation((id: string) => storesApi.propose(id), { entries: false })
export const useWithdrawStore = () => useStoreMutation((id: string) => storesApi.withdraw(id), { entries: false })

export const useAdminCreateStore = () =>
  useStoreMutation((body: NewStore) => adminStoresApi.create(body), { entries: false })
export const useAdminUpdateStore = () =>
  useStoreMutation(({ id, input }: { id: string; input: StoreInput }) => adminStoresApi.update(id, input), {
    entries: true,
  })
export const useAdminDeleteStore = () => useStoreMutation((id: string) => adminStoresApi.remove(id), { entries: true })
export const useApproveStore = () => useStoreMutation((id: string) => adminStoresApi.approve(id), { entries: false })
export const useRejectStore = () =>
  useStoreMutation(({ id, note }: { id: string; note?: string }) => adminStoresApi.reject(id, note), { entries: false })
export const useMergeStore = () =>
  useStoreMutation(({ id, targetId }: { id: string; targetId: string }) => adminStoresApi.merge(id, targetId), {
    entries: true,
  })
