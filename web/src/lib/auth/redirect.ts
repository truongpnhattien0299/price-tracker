/**
 * Validates a `?next=` value before redirecting to it. Only same-site paths
 * are allowed: `//evil.test` and `/\evil.test` are protocol-relative URLs to
 * another host, so they fall back to the dashboard.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback
  }
  return next
}

export function loginUrl(next?: string) {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login"
}
