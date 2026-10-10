import type {
  CalendarDay,
  Category,
  CategoryBreakdown,
  Entry,
  EntryQuery,
  GroupBy,
  Paginated,
  ReportRange,
  ReportSummary,
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

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),
}

export const entriesApi = {
  list: (query: EntryQuery = {}) => apiFetch<Paginated<Entry>>("/entries", { query }),
  get: (id: string) => apiFetch<Entry>(`/entries/${id}`),
  calendar: (month: string, tz?: string) =>
    apiFetch<CalendarDay[]>("/entries/calendar", { query: { month, tz } }),
  remove: (id: string) => apiFetch<void>(`/entries/${id}`, { method: "DELETE" }),
}

export const uploadsApi = {
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
