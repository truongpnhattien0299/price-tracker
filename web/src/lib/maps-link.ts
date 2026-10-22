// Google Maps share links → a place (name + coordinates). Pure, so the place
// search box can spot a pasted link and the BFF route can parse it.

/** maps.app.goo.gl/…, goo.gl/maps/… — short links that only redirect to a full one. */
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"])
/** google.com, www.google.com.vn, maps.google.com … */
const GOOGLE_HOST = /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/

const LINK_IN_TEXT = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.|maps\.)?google\.[a-z.]{2,6}\/maps)\S*/i

export type MapsLinkKind = "short" | "full"

/** Which kind of Google Maps link `url` is, or null for anything else (never fetched). */
export function mapsLinkKind(url: URL): MapsLinkKind | null {
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  const host = url.hostname.toLowerCase()
  if (SHORT_HOSTS.has(host)) return host === "goo.gl" && !url.pathname.startsWith("/maps/") ? null : "short"
  if (GOOGLE_HOST.test(host) && (host.startsWith("maps.") || url.pathname.startsWith("/maps"))) return "full"
  return null
}

/**
 * The Google Maps link inside pasted text, if any. The Maps app shares
 * "Quán Ăn Tám Gà\nhttps://maps.app.goo.gl/…", not a bare URL.
 */
export function findMapsLink(text: string): string | null {
  const match = LINK_IN_TEXT.exec(text)
  if (!match) return null
  try {
    return mapsLinkKind(new URL(match[0])) ? match[0] : null
  } catch {
    return null
  }
}

const COORD = String.raw`(-?\d{1,3}(?:\.\d+)?)`
const PAIR = new RegExp(String.raw`^\s*${COORD}\s*,\s*${COORD}\s*$`)

function decode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function toCoords(lat: string, lng: string) {
  const c = { lat: Number(lat), lng: Number(lng) }
  return Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180 ? c : null
}

/**
 * Name and position from a full Google Maps URL. The place's own pin is the
 * `!3d<lat>!4d<lng>` pair in `data=`; `@lat,lng,zoom` is only where the
 * viewport was centred, so it is the fallback (e.g. a dropped pin).
 */
export function parseMapsUrl(url: URL): { name: string | null; lat: number; lng: number } | null {
  const path = decode(url.pathname)
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(path)
  const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("ll")
  const queryPair = query ? PAIR.exec(query) : null
  const view = /\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(path)
  const at = pin ?? queryPair ?? view
  const coords = at && toCoords(at[1], at[2])
  if (!coords) return null

  // /maps/place/<Name>/… — the segment is `+`-joined, and a dropped pin's is just "lat,lng".
  const segment = /\/maps\/place\/([^/]+)/.exec(url.pathname)?.[1]
  let name = segment ? decode(segment.replace(/\+/g, " ")).trim() : null
  if (!name && query && !queryPair) name = query.trim()
  if (name && (PAIR.test(name) || /^-?\d+°/.test(name))) name = null
  return { name: name || null, ...coords }
}
