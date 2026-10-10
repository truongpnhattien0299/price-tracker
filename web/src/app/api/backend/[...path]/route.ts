import { NextResponse, type NextRequest } from "next/server"

import {
  backendFetch,
  backendUnreachable,
  crossOriginRejected,
  errorResponse,
  refreshTokens,
} from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants"
import { isSameOrigin } from "@/lib/auth/origin"
import { clearSession, setSession } from "@/lib/auth/session"
import type { TokenPair } from "@/types/api"

type Context = { params: Promise<{ path: string[] }> }

/**
 * Same-origin proxy to the NestJS API: `/api/backend/<path>` → `API_URL/<path>`
 * with the access cookie attached as a Bearer token.
 *
 * Refresh: if the access cookie has expired, or the backend answers 401, the
 * refresh cookie is exchanged once and the request retried. Concurrent
 * requests may each refresh — harmless, since the backend neither stores nor
 * rotates refresh tokens; the last Set-Cookie wins.
 */
async function handler(req: NextRequest, { params }: Context) {
  if (!isSameOrigin(req)) return crossOriginRejected()

  const { path } = await params
  // Block `..` so the proxy can't be steered outside the API prefix.
  if (path.some((s) => s === "." || s === "..")) return errorResponse(400, "Đường dẫn không hợp lệ.")
  const target = "/" + path.map(encodeURIComponent).join("/") + req.nextUrl.search

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text()
  const call = (accessToken?: string) =>
    backendFetch(target, {
      method: req.method,
      body: body || undefined,
      contentType: req.headers.get("content-type"),
      accessToken,
    })

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  let rotated: TokenPair | null = null
  let refreshed = false

  let res: Response
  try {
    if (!accessToken && refreshToken) {
      rotated = await refreshTokens(refreshToken)
      refreshed = true
      accessToken = rotated?.accessToken
    }
    res = await call(accessToken)
    if (res.status === 401 && refreshToken && !refreshed) {
      rotated = await refreshTokens(refreshToken)
      if (rotated) res = await call(rotated.accessToken)
    }
  } catch {
    return backendUnreachable()
  }

  const out = new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  })
  if (rotated) setSession(out, rotated)
  // Dead session: drop cookies so middleware stops treating the user as logged in.
  else if (res.status === 401) clearSession(out)
  return out
}

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT }
