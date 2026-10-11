import type {
  AdminStore,
  AdminStoreQuery,
  CalendarDay,
  Category,
  CategoryBreakdown,
  Entitlement,
  EntryInput,
  EntryQuery,
  EntryRow,
  GroupBy,
  MapPoints,
  MapQuery,
  Paginated,
  ReportRange,
  ReportSummary,
  PlaceSuggestion,
  ReverseGeocode,
  MyStore,
  Store,
  StoreInput,
  TimeSeriesPoint,
  TopStore,
  User,
} from "@/types/api"

import { apiFetch, request } from "./client"

// One function per backend route (DESIGN.md §5). Keep these thin — no state,
// no caching; data-fetching hooks wrap them.

// login/register/logout hit the BFF's own routes (`/api/auth/*`), which set or
// clear the httpOnly session cookies; everything else goes through the proxy.
export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body }),
  register: (body: { email: string; password: string; displayName: string }) =>
    request<{ user: User }>("/api/auth/register", { method: "POST", body }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<{ user: User }>("/auth/me"),
}

export const entitlementApi = {
  get: () => apiFetch<Entitlement>("/me/entitlement"),
}

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),
}

export const entriesApi = {
  // Reads (and writes that land outside a Free user's window) may come back locked.
  list: (query: EntryQuery = {}) => apiFetch<Paginated<EntryRow>>("/entries", { query }),
  get: (id: string) => apiFetch<EntryRow>(`/entries/${id}`),
  calendar: (month: string, tz?: string) =>
    apiFetch<CalendarDay[]>("/entries/calendar", { query: { month, tz } }),
  map: (query: MapQuery = {}) => apiFetch<MapPoints>("/entries/map", { query }),
  create: (body: EntryInput) => apiFetch<EntryRow>("/entries", { method: "POST", body }),
  update: (id: string, body: EntryInput) => apiFetch<EntryRow>(`/entries/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/entries/${id}`, { method: "DELETE" }),
}

export const storesApi = {
  search: (query: { q?: string; lat?: number; lng?: number; limit?: number }, signal?: AbortSignal) =>
    apiFetch<Store[]>("/stores", { query, signal }),
  mine: () => apiFetch<MyStore[]>("/stores/mine"),
  create: (body: Required<Pick<StoreInput, "name" | "latitude" | "longitude">> & StoreInput) =>
    apiFetch<Store>("/stores", { method: "POST", body }),
  update: (id: string, body: StoreInput) => apiFetch<Store>(`/stores/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/stores/${id}`, { method: "DELETE" }),
  propose: (id: string) => apiFetch<Store>(`/stores/${id}/propose`, { method: "POST" }),
  withdraw: (id: string) => apiFetch<Store>(`/stores/${id}/withdraw`, { method: "POST" }),
}

// Admin only (plans/09). Never lists personal stores.
export const adminStoresApi = {
  list: (query: AdminStoreQuery) => apiFetch<Paginated<AdminStore>>("/admin/stores", { query }),
  create: (body: Required<Pick<StoreInput, "name" | "latitude" | "longitude">> & StoreInput) =>
    apiFetch<Store>("/admin/stores", { method: "POST", body }),
  update: (id: string, body: StoreInput) => apiFetch<Store>(`/admin/stores/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/admin/stores/${id}`, { method: "DELETE" }),
  approve: (id: string) => apiFetch<Store>(`/admin/stores/${id}/approve`, { method: "POST" }),
  reject: (id: string, note?: string) =>
    apiFetch<Store>(`/admin/stores/${id}/reject`, { method: "POST", body: { note } }),
  merge: (id: string, targetId: string) =>
    apiFetch<{ movedEntries: number }>(`/admin/stores/${id}/merge`, { method: "POST", body: { targetId } }),
}

// BFF routes (not the NestJS API): Nominatim behind one shared rate limit, Photon for search.
export const geocodeApi = {
  reverse: (lat: number, lng: number) =>
    request<ReverseGeocode>("/api/geocode/reverse", { query: { lat, lng } }),
  search: (q: string, near: { lat: number; lng: number } | null, signal?: AbortSignal) =>
    request<PlaceSuggestion[]>("/api/geocode/search", { query: { q, lat: near?.lat, lng: near?.lng }, signal }),
}

export const uploadsApi = {
  presign: (body: { contentType: string; ext: string }) =>
    apiFetch<{ uploadUrl: string; photoKey: string }>("/uploads/presign", { method: "POST", body }),
  photoUrl: (key: string) => apiFetch<{ url: string }>("/uploads/photo-url", { query: { key } }),
  photoUrls: (keys: string[]) =>
    apiFetch<{ urls: Record<string, string> }>("/uploads/photo-urls", { method: "POST", body: { keys } }),
}

export const reportsApi = {
  summary: (range: ReportRange = {}) =>
    apiFetch<ReportSummary>("/reports/summary", { query: range }),
  byCategory: (range: ReportRange = {}) =>
    apiFetch<CategoryBreakdown[]>("/reports/by-category", { query: range }),
  timeSeries: (groupBy: GroupBy, range: ReportRange = {}) =>
    apiFetch<TimeSeriesPoint[]>("/reports/time-series", { query: { groupBy, ...range } }),
  topStores: (range: ReportRange = {}) =>
    apiFetch<TopStore[]>("/reports/top-stores", { query: range }),
}
