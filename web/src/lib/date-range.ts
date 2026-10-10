import type { GroupBy, ReportRange } from "@/types/api"

// The backend buckets days/months in Asia/Ho_Chi_Minh (DESIGN.md §8), so range
// edges are computed in that zone, not the browser's. It is a fixed UTC+7
// offset with no DST, which keeps this arithmetic simple.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

type Ymd = { y: number; m: number; d: number } // m is 0-based

function vnParts(date: Date): Ymd {
  const v = new Date(date.getTime() + VN_OFFSET_MS)
  return { y: v.getUTCFullYear(), m: v.getUTCMonth(), d: v.getUTCDate() }
}

/** Instant of VN midnight for a calendar day; overflowing m/d roll over like Date.UTC. */
function vnMidnight(y: number, m: number, d = 1) {
  return new Date(Date.UTC(y, m, d) - VN_OFFSET_MS)
}

/** Backend `to` filters are inclusive (`<=`), so a range ends 1 ms before the next start. */
function endBefore(next: Date) {
  return new Date(next.getTime() - 1).toISOString()
}

export function currentMonthRange(now = new Date()): Required<ReportRange> {
  return lastNMonthsRange(1, now)
}

/** The current VN month plus the n-1 months before it. */
export function lastNMonthsRange(n: number, now = new Date()): Required<ReportRange> {
  const { y, m } = vnParts(now)
  return {
    from: vnMidnight(y, m - (n - 1)).toISOString(),
    to: endBefore(vnMidnight(y, m + 1)),
  }
}

/** `YYYY-MM-DD` keys (VN calendar days, both inclusive) → ISO range for the API. */
export function dayKeysToRange(from?: string, to?: string): ReportRange {
  const parse = (key: string) => key.split("-").map(Number) as [number, number, number]
  const range: ReportRange = {}
  if (from) {
    const [y, m, d] = parse(from)
    range.from = vnMidnight(y, m - 1, d).toISOString()
  }
  if (to) {
    const [y, m, d] = parse(to)
    range.to = endBefore(vnMidnight(y, m - 1, d + 1))
  }
  return range
}

const pad = (n: number) => String(n).padStart(2, "0")

/** A date picked in the browser (local midnight) → `YYYY-MM-DD` of that calendar day. */
export function toDayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Inverse of `toDayKey`, for feeding a key back into the date picker. */
export function fromDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** ISO instant → `YYYY-MM-DDTHH:mm` in VN wall time, for `<input type="datetime-local">`. */
export function toVnInput(iso: string | Date) {
  const v = new Date(new Date(iso).getTime() + VN_OFFSET_MS)
  return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}T${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`
}

/**
 * Inverse of `toVnInput`. The input is read as VN time whatever the browser's
 * zone is, so a purchase typed as 08:00 lands on 08:00 in the calendar.
 */
export function fromVnInput(value: string) {
  const [date, time = "00:00"] = value.split("T")
  const [y, m, d] = date!.split("-").map(Number) as [number, number, number]
  const [h, min] = time.split(":").map(Number) as [number, number]
  return new Date(Date.UTC(y, m - 1, d, h, min) - VN_OFFSET_MS).toISOString()
}

function periodKey({ y, m, d }: Ymd, groupBy: GroupBy) {
  if (groupBy === "year") return String(y)
  if (groupBy === "month") return `${y}-${pad(m + 1)}`
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/**
 * Every period label (same format as /reports/time-series) between `from` and
 * `to`, so charts show empty buckets as 0 instead of skipping them.
 */
export function periodsInRange(range: Required<ReportRange>, groupBy: GroupBy): string[] {
  const end = periodKey(vnParts(new Date(range.to)), groupBy)
  const keys: string[] = []
  let cur = vnParts(new Date(range.from))
  // Keys sort lexicographically in chronological order; the cap guards bad input.
  while (keys.length < 1000) {
    const key = periodKey(cur, groupBy)
    if (key > end) break
    keys.push(key)
    const { y, m, d } = cur
    cur = vnParts(
      groupBy === "year"
        ? vnMidnight(y + 1, 0)
        : groupBy === "month"
          ? vnMidnight(y, m + 1)
          : vnMidnight(y, m, d + 1),
    )
  }
  return keys
}

/** `YYYY-MM` of the current VN month. */
export function currentMonthKey(now = new Date()) {
  const { y, m } = vnParts(now)
  return `${y}-${pad(m + 1)}`
}

/** `YYYY-MM-DD` of the current VN day. */
export function todayKey(now = new Date()) {
  const { y, m, d } = vnParts(now)
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** `shiftMonth("2026-01", -1)` → `"2025-12"`. */
export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number) as [number, number]
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`
}

/**
 * Cells of a Monday-first month grid: `null` pads the days before the 1st,
 * then one `YYYY-MM-DD` per day. Pure calendar math, no time zone involved.
 */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number) as [number, number]
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7 // Mon = 0
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ]
}
