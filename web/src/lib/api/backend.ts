import "server-only"

import { NextResponse, type NextRequest } from "next/server"

import type { ApiError, TokenPair } from "@/types/api"

// Server-only: the browser never talks to the NestJS API directly. Tokens stay
// in httpOnly cookies and this BFF attaches them as Bearer (see plans/01).
const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1"
// Shared with the backend: lets it trust X-Client-IP for per-user throttling.
const BFF_SECRET = process.env.BFF_SECRET

type BackendInit = {
  method?: string
  body?: string
  contentType?: string | null
  accessToken?: string
  clientIp?: string
}

/**
 * The browser's IP, as stamped by the hosting edge. Vercel overwrites
 * X-Real-IP / X-Forwarded-For with the real client address, so they can't be
 * spoofed there. Undefined in local dev, where the backend falls back to req.ip.
 */
export function clientIp(req: NextRequest): string | undefined {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]
  return ip?.trim() || undefined
}

/** Throws on network failure — callers turn that into a 502. */
export function backendFetch(path: string, init: BackendInit = {}) {
  const headers = new Headers()
  if (init.body !== undefined) headers.set("Content-Type", init.contentType ?? "application/json")
  if (init.accessToken) headers.set("Authorization", `Bearer ${init.accessToken}`)
  // Without this every web user would share the BFF's IP in the API's
  // 60 req/min throttle (backend ClientIpThrottlerGuard).
  if (init.clientIp && BFF_SECRET) {
    headers.set("X-Client-IP", init.clientIp)
    headers.set("X-BFF-Secret", BFF_SECRET)
  }
  return fetch(API_URL + path, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    cache: "no-store",
  })
}

/** Exchanges a refresh token for a new pair; null if the backend rejects it. */
export async function refreshTokens(
  refreshToken: string,
  clientIp?: string,
): Promise<TokenPair | null> {
  const res = await backendFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    clientIp,
  })
  return res.ok ? ((await res.json()) as TokenPair) : null
}

/** Error body in the same `{ statusCode, message }` shape NestJS uses. */
export function errorResponse(statusCode: number, message: string) {
  return NextResponse.json<ApiError>({ statusCode, message }, { status: statusCode })
}

export const backendUnreachable = () =>
  errorResponse(502, "Không kết nối được máy chủ. Thử lại sau ít phút.")

export const crossOriginRejected = () => errorResponse(403, "Yêu cầu bị từ chối.")
