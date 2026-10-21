// Mirrors backend DTOs (DESIGN.md §5). Prisma.Decimal serializes as a string —
// never parse money into a float for arithmetic; format it for display only.
// Exception: /reports/* aggregates are converted with Number() server-side, so
// they arrive as plain numbers.

export type ProSource = "none" | "trial" | "subscription"

/** Only shows or hides admin UI; the API enforces it on every admin route (plans/09 S1). */
export type Role = "user" | "admin"

export type User = {
  id: string
  email: string
  displayName: string
  proSource: ProSource
  proExpiresAt: string | null
  role: Role
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

/** `GET /admin/categories`: `entryCount` counts every user's entries. */
export type AdminCategory = Category & { entryCount: number }

/** Admin create/update. `icon: null` (or "") clears it. */
export type CategoryInput = { name?: string; icon?: string | null }

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
  /** Linked store; `storeName` / `address` / coordinates are then a copy of it (plans/09 S6). */
  storeId: string | null
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
  /** Set: the server fills store name, address and coordinates from the store. */
  storeId?: string | null
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

/** BFF `GET /api/geocode/search` (Photon): one suggestion under the map's search box. */
export type PlaceSuggestion = {
  id: string
  /** First line: the place or street name. */
  name: string
  /** Second line: street, ward, city — also what goes in the entry's address field. */
  address: string | null
  lat: number
  lng: number
  /** Set when the place is a shop, market or eatery: becomes the entry's store name. */
  placeName: string | null
}

/**
 * personal → (user proposes) pending → (admin approves) global (plans/09 S2).
 * Global stores are visible to everyone and only admins may change them.
 */
export type StoreStatus = "personal" | "pending" | "global"

/** `GET /stores`: a store the user may pick. Coordinates are numbers. */
export type Store = {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  status: StoreStatus
  /** Created by the current user. */
  mine: boolean
  /** Metres from the `lat`/`lng` the list was asked for. */
  distanceM?: number
}

/** `GET /stores/mine`. `reviewNote` = why an admin turned the last proposal down. */
export type MyStore = Store & {
  reviewNote: string | null
  proposedAt: string | null
  createdAt: string
  entryCount: number
}

export type StoreInput = {
  name?: string
  address?: string | null
  latitude?: number
  longitude?: number
}

export type NearbyStore = { id: string; name: string; address: string | null; distanceM: number }

/** `GET /admin/stores`. `nearbyGlobal` (pending only) = merge candidates within 100 m. */
export type AdminStore = Store & {
  ownerName: string | null
  proposedAt: string | null
  createdAt: string
  updatedAt: string
  entryCount: number
  nearbyGlobal?: NearbyStore[]
}

export type AdminStoreQuery = { status: "pending" | "global"; q?: string; page?: number; limit?: number }

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

/** `GET /reports/category-series`. `categoryIds`: ids, or "none" for uncategorized; omitted = all. */
export type CategorySeriesQuery = ReportRange & { groupBy: "month" | "year"; categoryIds?: string[] }

/** One (period, category) pair that has entries; `categoryId` null = uncategorized. */
export type CategorySeriesPoint = {
  period: string
  categoryId: string | null
  categoryName: string
  total: number
  count: number
}

export type TopStore = { storeName: string; total: number; count: number }

/** `code` comes with 402s (plans/07 E9). */
export type PaywallCode = "ENTRY_LIMIT" | "HISTORY_LOCKED" | "PRO_ONLY"

export type ApiError = {
  statusCode: number
  message: string | string[]
  error?: string
  /**
   * 402 paywall codes, `STORE_GLOBAL` (403: only an admin may change a global store)
   * or `CATEGORY_EXISTS` (409: duplicate category name).
   */
  code?: PaywallCode | "STORE_GLOBAL" | "CATEGORY_EXISTS"
}
