import { NextResponse, type NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants"
import { createCache, GEOCODER_USER_AGENT, isSellingPlace, joinAddress, VN_CENTER } from "@/lib/geocode"
import type { PlaceSuggestion } from "@/types/api"

/**
 * Text → places, for the search box above the entry form's map. Photon
 * (https://photon.komoot.io), not Nominatim: Nominatim's usage policy forbids
 * search-as-you-type on its public server, Photon is built for it. Same OSM
 * data, and it matches without diacritics ("cho ben thanh" → Chợ Bến Thành).
 */

const PHOTON = process.env.PHOTON_URL ?? "https://photon.komoot.io"
const LIMIT = 6

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: Partial<
    Record<
      | "osm_type"
      | "osm_key"
      | "osm_value"
      | "type"
      | "name"
      | "housenumber"
      | "street"
      | "locality"
      | "district"
      | "city"
      | "county"
      | "state"
      | "countrycode",
      string
    >
  > & { osm_id?: number }
}

function toSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const p = f.properties
  const [lng, lat] = f.geometry.coordinates
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const address = joinAddress([street, p.locality, p.district, p.city ?? p.county ?? p.state])
  const name = p.name ?? (street || null)
  if (!name && !address) return null
  return {
    id: `${p.osm_type}${p.osm_id}`,
    name: name ?? address!,
    // The second line repeats nothing the first already says.
    address: address && address !== name ? address : null,
    lat,
    lng,
    placeName: p.name && isSellingPlace(p.osm_key, p.osm_value) ? p.name : null,
  }
}

// Per server instance. Bias rounded to ~1 km so nudging the pin re-uses answers.
const cache = createCache<PlaceSuggestion[]>(500)

export async function GET(req: NextRequest) {
  if (!req.cookies.has(ACCESS_COOKIE) && !req.cookies.has(REFRESH_COOKIE)) {
    return errorResponse(401, "Chưa đăng nhập.")
  }
  const params = req.nextUrl.searchParams
  const q = (params.get("q") ?? "").trim().replace(/\s+/g, " ")
  if (q.length < 2 || q.length > 100) return errorResponse(400, "Từ khoá phải dài 2–100 ký tự.")

  const lat = Number(params.get("lat") ?? VN_CENTER.lat)
  const lng = Number(params.get("lng") ?? VN_CENTER.lng)
  const bias =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat: lat.toFixed(2), lon: lng.toFixed(2) }
      : { lat: VN_CENTER.lat.toFixed(2), lon: VN_CENTER.lng.toFixed(2) }

  const key = `${q.toLowerCase()}|${bias.lat},${bias.lon}`
  const hit = cache.get(key)
  if (hit) return NextResponse.json(hit)

  const url = new URL("/api/", PHOTON)
  url.search = new URLSearchParams({ q, limit: String(LIMIT), ...bias }).toString()

  let features: PhotonFeature[]
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": GEOCODER_USER_AGENT },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    })
    if (!res.ok) return errorResponse(502, "Không tìm được địa điểm.")
    features = ((await res.json()) as { features?: PhotonFeature[] }).features ?? []
  } catch {
    return errorResponse(502, "Không tìm được địa điểm.")
  }

  // Photon often returns one place twice (a market and its bus stop of the same name, same street).
  const seen = new Set<string>()
  const result = features
    .map(toSuggestion)
    .filter((s): s is PlaceSuggestion => {
      if (!s) return false
      const k = `${s.name}|${s.address}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  cache.set(key, result)
  return NextResponse.json(result)
}
