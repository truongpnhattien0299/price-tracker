import "server-only"

import type { NextRequest } from "next/server"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * CSRF defence on top of SameSite=Lax: state-changing requests must carry an
 * Origin matching the host they were sent to. Browsers always attach Origin
 * to non-GET fetches, so a missing header is treated as cross-site.
 */
export function isSameOrigin(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true
  const origin = req.headers.get("origin")
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
