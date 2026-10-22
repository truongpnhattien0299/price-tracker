import { NextResponse, type NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants"
import { createCache } from "@/lib/geocode"
import { mapsLinkKind, parseMapsUrl } from "@/lib/maps-link"
import { reverseGeocode } from "@/lib/nominatim"
import type { PlaceSuggestion } from "@/types/api"

/**
 * A pasted Google Maps link → a place for the entry / store form. A short
 * link (maps.app.goo.gl) is resolved here, not in the browser, because the
 * redirect has no CORS headers. Only the redirect's `Location` is read: every
 * hop must be another Google Maps URL (no open proxy), and google.com itself
 * is never fetched — the full URL already names the place and its pin. Google
 * puts no address in it, so that comes from Nominatim like a map tap.
 */

const MAX_HOPS = 5

// Per server instance. Share links do not change what they point at.
const cache = createCache<PlaceSuggestion>(500)

/** The full Maps URL behind `link`, or null when it leads anywhere else. */
async function resolve(link: URL): Promise<URL | null> {
  let url = link
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    // An EU server is sent to the cookie wall first, carrying the real target along.
    if (url.hostname === "consent.google.com") {
      const next = url.searchParams.get("continue")
      if (!next) return null
      url = new URL(next)
      continue
    }
    const kind = mapsLinkKind(url)
    if (kind === "full") return url
    if (kind !== "short" || hop === MAX_HOPS) return null

    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(6000), cache: "no-store" })
    const location = res.headers.get("location")
    if (res.status < 300 || res.status >= 400 || !location) return null
    url = new URL(location, url)
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!req.cookies.has(ACCESS_COOKIE) && !req.cookies.has(REFRESH_COOKIE)) {
    return errorResponse(401, "Chưa đăng nhập.")
  }
  const raw = req.nextUrl.searchParams.get("url") ?? ""
  let link: URL
  try {
    link = new URL(raw)
  } catch {
    return errorResponse(400, "Link không hợp lệ.")
  }
  if (raw.length > 2000 || !mapsLinkKind(link)) return errorResponse(400, "Không phải link Google Maps.")

  const hit = cache.get(link.href)
  if (hit) return NextResponse.json(hit)

  let full: URL | null
  try {
    full = await resolve(link)
  } catch {
    return errorResponse(502, "Không mở được link Google Maps.")
  }
  const place = full && parseMapsUrl(full)
  if (!place) return errorResponse(422, "Link này không có vị trí cụ thể.")

  const geo = await reverseGeocode(place.lat, place.lng)
  const address = geo?.address ?? null
  const result: PlaceSuggestion = {
    id: `gmaps:${place.lat},${place.lng}`,
    name: place.name ?? address ?? `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`,
    address: address && address !== place.name ? address : null,
    lat: place.lat,
    lng: place.lng,
    // A /place/ link names the business itself, so it is the store name.
    placeName: place.name ?? geo?.placeName ?? null,
  }
  // Without an address the answer is worth asking for again.
  if (geo) cache.set(link.href, result)
  return NextResponse.json(result)
}
