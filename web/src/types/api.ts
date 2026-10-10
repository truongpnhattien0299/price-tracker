// Mirrors backend DTOs (DESIGN.md §5). Prisma.Decimal serializes as a string —
// never parse money into a float for arithmetic; format it for display only.
// Exception: /reports/* aggregates are converted with Number() server-side, so
// they arrive as plain numbers.

export type ProSource = "none" | "trial" | "subscription"

export type User = {
  id: string
  email: string
  displayName: string
  proSource: ProSource
  proExpiresAt: string | null
  createdAt: string
}

/** GET /me/entitlement (plans/07). `limits` / `historyFrom` are null for Pro. */
export type Entitlement = {
  isPro: boolean
  proSource: ProSource
  proExpiresAt: string | null
  limits: { entriesPerMonth: number; historyMonths: number } | null
  usage: { entriesThisMonth: number }
  /** Start of the visible history (VN midnight) for Free; null = nothing locked. */
  historyFrom: string | null
}

export type AuthResponse = {
  user: User
  accessToken: string
  refreshToken: string
}

export type TokenPair = Pick<AuthResponse, "accessToken" | "refreshToken">

export type Category = {
  id: string
  name: string
  icon: string | null
  isDefault: boolean
}

export type Entry = {
  id: string
  categoryId: string | null
  category?: Category | null
  productName: string | null
  price: string
  currency: string
  unit: string | null
  photoKey: string | null
  blurhash: string | null
  latitude: string | null
  longitude: string | null
  address: string | null
  storeName: string | null
  note: string | null
  purchasedAt: string
  createdAt: string
  locked: false
}

/** An entry outside a Free user's history window: no photo, price or name (DESIGN.md §14.6). */
export type LockedEntry = {
  id: string
  purchasedAt: string
  blurhash: string | null
  locked: true
}

/** What entry reads return; narrow on `locked` before touching entry fields. */
export type EntryRow = Entry | LockedEntry

/**
 * Body of POST /entries and PATCH /entries/:id. PATCH sends only changed
 * fields; `null` clears a nullable column. `price` is a number here (the DTO
 * validates `@IsNumber`), unlike the Decimal string the API returns.
 */
export type EntryInput = {
  productName?: string | null
  price?: number
  currency?: string
  unit?: string | null
  categoryId?: string | null
  photoKey?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  storeName?: string | null
  note?: string | null
  purchasedAt?: string
}

export type Paginated<T> = {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export type EntryQuery = {
  page?: number
  limit?: number
  category?: string
  from?: string
  to?: string
  search?: string
  store?: string
}

export type MapQuery = { from?: string; to?: string; category?: string }

/** One entry on the map. Coordinates are numbers here, unlike `Entry.latitude`. */
export type MapPoint = {
  id: string
  lat: number
  lng: number
  photoKey: string | null
  blurhash: string | null
  purchasedAt: string
  price: string
  currency: string
  productName: string | null
  storeName: string | null
  categoryId: string | null
}

/** GET /entries/map. A Free user's range is clamped to the history window; `lockedCount` is what it hid. */
export type MapPoints = { points: MapPoint[]; truncated: boolean; lockedCount: number }

/** BFF `GET /api/geocode/reverse` (Nominatim, plans/08 M11). */
export type ReverseGeocode = {
  /** Street, ward, city — what goes in the entry's address field. */
  address: string | null
  /** The place's own name when the spot is a shop, market or eatery. */
  placeName: string | null
}

export type CalendarDay = {
  date: string
  count: number
  /** Always null on a locked day. */
  coverPhotoKey: string | null
  blurhash: string | null
  locked: boolean
}

export type ReportRange = { from?: string; to?: string }

export type ReportSummary = {
  totalSpent: number
  entryCount: number
  avgPerEntry: number
  currency: string
}

export type CategoryBreakdown = {
  categoryName: string
  total: number
  count: number
  percentage: number
}

export type GroupBy = "day" | "month" | "year"

export type TimeSeriesPoint = { period: string; total: number }

export type TopStore = { storeName: string; total: number; count: number }

/** `code` comes with 402s (plans/07 E9). */
export type PaywallCode = "ENTRY_LIMIT" | "HISTORY_LOCKED" | "PRO_ONLY"

export type ApiError = {
  statusCode: number
  message: string | string[]
  error?: string
  code?: PaywallCode
}
