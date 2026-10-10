// Shared by the BFF geocoding routes (src/app/api/geocode/*). Both upstreams
// are OpenStreetMap-based, so a place is described by the same OSM key/value.

export const GEOCODER_USER_AGENT = "price-tracker-web/0.1 (+https://github.com/truongpnhattien0299/price-tracker)"

/** Ho Chi Minh City, same as the map's default view: search bias when the form has no pin yet. */
export const VN_CENTER = { lat: 10.7769, lng: 106.7009 }

// Places that sell things: any shop, plus the amenities people pay at.
// A church or a town hall next to the pin must not become the "store".
const SELLING_AMENITIES = new Set([
  "marketplace",
  "restaurant",
  "cafe",
  "fast_food",
  "food_court",
  "bar",
  "pub",
  "ice_cream",
  "fuel",
  "pharmacy",
])

export function isSellingPlace(key?: string, value?: string) {
  return key === "shop" || (key === "amenity" && !!value && SELLING_AMENITIES.has(value))
}

/** Address parts, most specific first → "12 Lê Lợi, Bến Nghé, Quận 1, TP.HCM", repeats dropped. */
export function joinAddress(parts: (string | null | undefined)[]) {
  const kept = parts.filter((p): p is string => !!p?.trim())
  return kept.length ? [...new Set(kept)].join(", ") : null
}

/** Small per-instance memo for upstream answers (FIFO eviction). */
export function createCache<T>(max: number) {
  const map = new Map<string, T>()
  return {
    get: (key: string) => map.get(key),
    set(key: string, value: T) {
      if (map.size >= max) map.delete(map.keys().next().value!)
      map.set(key, value)
    },
  }
}
