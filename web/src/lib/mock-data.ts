import type { CategoryBreakdown, Entry, ReportSummary, TimeSeriesPoint, TopStore } from "@/types/api"

// Placeholder data so the dashboard renders before it is wired to the API.
// Delete this file once every page fetches through `lib/api/endpoints`.

export const mockSummary: ReportSummary = {
  totalSpent: "4235000",
  entryCount: 38,
  avgPerEntry: "111447.37",
  currency: "VND",
}

export const mockTimeSeries: TimeSeriesPoint[] = [
  { period: "2026-05", total: "3120000" },
  { period: "2026-06", total: "3580000" },
  { period: "2026-07", total: "2940000" },
  { period: "2026-08", total: "4010000" },
  { period: "2026-09", total: "3760000" },
  { period: "2026-10", total: "4235000" },
]

export const mockByCategory: CategoryBreakdown[] = [
  { categoryName: "Thịt cá", total: "1520000", percentage: 35.9 },
  { categoryName: "Rau củ", total: "860000", percentage: 20.3 },
  { categoryName: "Trái cây", total: "640000", percentage: 15.1 },
  { categoryName: "Đồ uống", total: "515000", percentage: 12.2 },
  { categoryName: "Khác", total: "700000", percentage: 16.5 },
]

export const mockTopStores: TopStore[] = [
  { storeName: "Chợ Bến Thành", total: "1240000", count: 9 },
  { storeName: "Co.opmart", total: "980000", count: 6 },
  { storeName: "Bách hoá Xanh", total: "730000", count: 8 },
]

const cat = (name: string, icon: string) => ({ id: name, name, icon, isDefault: true })

export const mockEntries: Entry[] = [
  ["Rau muống", "15000", "Rau củ", "🥬", "Chợ Bến Thành", "2026-10-09T02:10:00Z"],
  ["Cá basa", "85000", "Thịt cá", "🍖", "Co.opmart", "2026-10-08T10:30:00Z"],
  ["Xoài cát", "60000", "Trái cây", "🍎", "Chợ Bến Thành", "2026-10-07T01:45:00Z"],
  ["Trà sữa", "45000", "Đồ uống", "🥤", null, "2026-10-06T08:20:00Z"],
  ["Thịt ba chỉ", "120000", "Thịt cá", "🍖", "Bách hoá Xanh", "2026-10-05T11:00:00Z"],
].map(([productName, price, category, icon, storeName, purchasedAt], i) => ({
  id: String(i),
  categoryId: category,
  category: cat(category!, icon!),
  productName,
  price: price!,
  currency: "VND",
  unit: null,
  photoKey: null,
  blurhash: null,
  latitude: null,
  longitude: null,
  address: null,
  storeName,
  note: null,
  purchasedAt: purchasedAt!,
  createdAt: purchasedAt!,
}))
