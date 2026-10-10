import { NextResponse, type NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants"
import { createCache, GEOCODER_USER_AGENT, isSellingPlace, joinAddress } from "@/lib/geocode"
import type { ReverseGeocode } from "@/types/api"

/**
 * Coordinates → a short Vietnamese address (plans/08 M11), via OpenStreetMap
 * Nominatim. Proxied here rather than called from the browser because the
 * usage policy (https://operations.osmfoundation.org/policies/nominatim/)
 * wants an identifying User-Agent and at most 1 request/second — limits only
 * a single server-side choke point can keep for every user at once.
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

export async function GET(req: NextRequest) {
  // Signed-in users only. Presence is enough: the throttle above, not this
  // check, is what keeps us inside the policy.
  if (!req.cookies.has(ACCESS_COOKIE) && !req.cookies.has(REFRESH_COOKIE)) {
    return errorResponse(401, "Chưa đăng nhập.")
  }
  const lat = Number(req.nextUrl.searchParams.get("lat"))
  const lng = Number(req.nextUrl.searchParams.get("lng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return errorResponse(400, "Toạ độ không hợp lệ.")
  }

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const hit = cache.get(key)
  if (hit) return NextResponse.json(hit)

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
    if (!res.ok) return errorResponse(502, "Không tra được địa chỉ.")
    data = (await res.json()) as NominatimResult
  } catch {
    return errorResponse(502, "Không tra được địa chỉ.")
  }

  const result: ReverseGeocode = data.error
    ? { address: null, placeName: null }
    : {
        address: shortAddress(data.address),
        placeName: data.name && isSellingPlace(data.category, data.type) ? data.name : null,
      }
  cache.set(key, result)
  return NextResponse.json(result)
}
