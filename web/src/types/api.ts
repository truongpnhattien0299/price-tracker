// Mirrors backend DTOs (DESIGN.md §5). Prisma.Decimal serializes as a string —
// never parse money into a float for arithmetic; format it for display only.

export type ProSource = "none" | "trial" | "subscription"

export type User = {
  id: string
  email: string
  displayName: string
  proSource: ProSource
  proExpiresAt: string | null
  createdAt: string
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

export type CalendarDay = {
  date: string
  count: number
  coverPhotoKey: string | null
}

export type ReportRange = { from?: string; to?: string }

export type ReportSummary = {
  totalSpent: string
  entryCount: number
  avgPerEntry: string
  currency: string
}

export type CategoryBreakdown = {
  categoryName: string
  total: string
  percentage: number
}

export type TimeSeriesPoint = { period: string; total: string }

export type TopStore = { storeName: string; total: string; count: number }

export type ApiError = {
  statusCode: number
  message: string | string[]
  error?: string
}
