import type { EntryQuery, GroupBy, MapQuery, ReportRange } from "@/types/api"

// Single source of truth for React Query keys. Prefix keys (`entries.all`,
// `reports.all`, `["calendar"]`) exist so mutations can invalidate a whole family.
export const qk = {
  me: ["me"] as const,
  entitlement: ["entitlement"] as const,
  categories: ["categories"] as const,
  entries: {
    all: ["entries"] as const,
    list: (q: EntryQuery) => ["entries", "list", q] as const,
    detail: (id: string) => ["entries", "detail", id] as const,
    // Under `entries`, so every entry mutation refreshes the map too.
    map: (q: MapQuery) => ["entries", "map", q] as const,
  },
  calendar: {
    all: ["calendar"] as const,
    month: (month: string) => ["calendar", month] as const,
  },
  reports: {
    all: ["reports"] as const,
    summary: (r: ReportRange) => ["reports", "summary", r] as const,
    byCategory: (r: ReportRange) => ["reports", "by-category", r] as const,
    timeSeries: (g: GroupBy, r: ReportRange) => ["reports", "time-series", g, r] as const,
    topStores: (r: ReportRange) => ["reports", "top-stores", r] as const,
  },
  photoUrl: (key: string) => ["photo-url", key] as const,
  /** `keys` must be sorted + unique so the same set maps to one cache entry. */
  photoUrls: (keys: string[]) => ["photo-urls", keys] as const,
}
