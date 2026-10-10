// Where and when a photo was taken (plans/08). Read in the browser, before
// compressImage() re-encodes the file and drops every EXIF tag — so the GPS
// position ends up in the database, never inside the stored photo.

export type Coords = { lat: number; lng: number }

/** Where the form's coordinates came from; "saved" = already on the entry. */
export type LocationSource = "exif" | "device" | "search" | "manual" | "saved"
/** `accuracy` (metres) is known only for a device fix. */
export type PickedLocation = Coords & { source: LocationSource; accuracy?: number }

export type PhotoMeta = { gps: Coords | null; takenAt: string | null }

// A file this new was most likely just taken with the camera (`capture` input):
// its spot is where the user stands now. Older photos keep no position rather
// than a guessed one.
const FRESH_MS = 2 * 60_000

/** Rejects the junk EXIF often carries: NaN, out-of-range, or exactly 0,0. */
export function validCoords(lat: unknown, lng: unknown): Coords | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

/** Same precision as the DB column (Decimal(10,7)), so unchanged values compare equal. */
export function roundCoord(n: number) {
  return Math.round(n * 1e7) / 1e7
}

/**
 * EXIF `DateTimeOriginal` ("YYYY:MM:DD HH:MM:SS") → ISO. Cameras store wall
 * time; `OffsetTimeOriginal` says which zone, else it is read as Vietnam time
 * like everything else in the app.
 */
function exifDate(value: unknown, offset: unknown): string | null {
  if (typeof value !== "string") return null
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const zone = typeof offset === "string" && /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : "+07:00"
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${zone}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** GPS + capture time from the file's EXIF. Never throws: unreadable metadata is just absent. */
export async function readPhotoMeta(file: Blob): Promise<PhotoMeta> {
  try {
    // Loaded on first pick only; most dashboard visits never need it.
    const { default: exifr } = await import("exifr")
    const [gps, tags] = await Promise.all([
      exifr.gps(file).catch(() => undefined),
      exifr
        .parse(file, { pick: ["DateTimeOriginal", "OffsetTimeOriginal"], reviveValues: false })
        .catch(() => undefined),
    ])
    return {
      gps: validCoords(gps?.latitude, gps?.longitude),
      takenAt: exifDate(tags?.DateTimeOriginal, tags?.OffsetTimeOriginal),
    }
  } catch {
    return { gps: null, takenAt: null }
  }
}

export function isFreshCapture(file: File, now = Date.now()) {
  const age = now - file.lastModified
  return age >= -60_000 && age <= FRESH_MS
}

/** A device fix: `accuracy` is the 68 % radius in metres, as the browser reports it. */
export type DeviceFix = Coords & { accuracy: number }

// Good enough to stop early: a stall in a market, not just the market.
const GOOD_ACCURACY_M = 20
const LOCATE_TIMEOUT_MS = 15_000

/**
 * The device's best position within ~15 s, or null when there is none: no
 * permission, no fix at all, or an insecure origin (geolocation needs HTTPS or
 * localhost — a phone opening the dev server over http://<LAN IP> gets nothing).
 *
 * `watchPosition`, not `getCurrentPosition`: the first fix a phone hands out is
 * usually a coarse Wi-Fi / cell guess (hundreds of metres) while the GPS chip is
 * still warming up. Watching keeps the most accurate fix and stops as soon as
 * one is within 20 m. `maximumAge: 0` refuses a cached position from elsewhere.
 * `onFix` sees every improvement, so the UI can show the accuracy as it narrows.
 */
export function getDevicePosition(onFix?: (fix: DeviceFix) => void): Promise<DeviceFix | null> {
  if (typeof window === "undefined" || !window.isSecureContext || !("geolocation" in navigator)) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let best: DeviceFix | null = null
    let done = false
    const finish = () => {
      if (done) return
      done = true
      navigator.geolocation.clearWatch(watchId)
      clearTimeout(timer)
      resolve(best)
    }
    const timer = setTimeout(finish, LOCATE_TIMEOUT_MS)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = validCoords(pos.coords.latitude, pos.coords.longitude)
        if (!c || done) return
        const fix = { ...c, accuracy: pos.coords.accuracy }
        if (best && fix.accuracy >= best.accuracy) return
        best = fix
        onFix?.(fix)
        if (fix.accuracy <= GOOD_ACCURACY_M) finish()
      },
      (err) => {
        // Denied is final; "unavailable" can still be followed by a fix, so keep waiting for the timer.
        if (err.code === err.PERMISSION_DENIED) finish()
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    )
  })
}
