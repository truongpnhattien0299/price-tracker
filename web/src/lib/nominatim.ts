import "server-only"

import { createCache, GEOCODER_USER_AGENT, isSellingPlace, joinAddress } from "@/lib/geocode"
import type { ReverseGeocode } from "@/types/api"

/**
 * Coordinates → a short Vietnamese address (plans/08 M11), via OpenStreetMap
 * Nominatim. Server-side only because the usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/) wants an
 * identifying User-Agent and at most 1 request/second — limits only a single
 * choke point can keep for every user at once. Every BFF route that needs an
 * address goes through `reverseGeocode()`, so they all share one queue.
 */

const NOMINATIM = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org"
const MIN_GAP_MS = 1100

type NominatimAddress = Partial<
  Record<
    | "house_number"
    | "road"
    | "pedestrian"
    | "suburb"
    | "quarter"
    | "neighbourhood"
    | "city_district"
    | "district"
    | "county"
    | "city"
    | "town"
    | "state",
    string
  >
>
type NominatimResult = {
  name?: string
  category?: string
  type?: string
  address?: NominatimAddress
  error?: string
}

function shortAddress(a: NominatimAddress = {}) {
  const street = [a.house_number, a.road ?? a.pedestrian].filter(Boolean).join(" ")
  return joinAddress([
    street,
    a.suburb ?? a.quarter ?? a.neighbourhood,
    a.city_district ?? a.district ?? a.county,
    a.city ?? a.town ?? a.state,
  ])
}

// Per server instance. ~11 m grid: a pin nudged a little re-uses the answer.
const cache = createCache<ReverseGeocode>(500)
let queue: Promise<unknown> = Promise.resolve()
let lastCall = 0

/** Serialises Nominatim calls and spaces them ≥ 1.1 s apart. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCall = Date.now()
    return fn()
  })
  queue = run.catch(() => undefined)
  return run
}

/** null = Nominatim failed or timed out (not cached, so a retry asks again). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const hit = cache.get(key)
  if (hit) return hit

  const url = new URL("/reverse", NOMINATIM)
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "vi",
  }).toString()

  let data: NominatimResult
  try {
    const res = await throttled(() =>
      fetch(url, { headers: { "User-Agent": GEOCODER_USER_AGENT }, signal: AbortSignal.timeout(8000), cache: "no-store" }),
    )
    if (!res.ok) return null
    data = (await res.json()) as NominatimResult
  } catch {
    return null
  }

  const result: ReverseGeocode = data.error
    ? { address: null, placeName: null }
    : {
        address: shortAddress(data.address),
        placeName: data.name && isSellingPlace(data.category, data.type) ? data.name : null,
      }
  cache.set(key, result)
  return result
}
