import "server-only"

import { NextResponse } from "next/server"

import type { ApiError, TokenPair } from "@/types/api"

// Server-only: the browser never talks to the NestJS API directly. Tokens stay
// in httpOnly cookies and this BFF attaches them as Bearer (see plans/01).
const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1"

type BackendInit = {
  method?: string
  body?: string
  contentType?: string | null
  accessToken?: string
}

/** Throws on network failure — callers turn that into a 502. */
export function backendFetch(path: string, init: BackendInit = {}) {
  const headers = new Headers()
  if (init.body !== undefined) headers.set("Content-Type", init.contentType ?? "application/json")
  if (init.accessToken) headers.set("Authorization", `Bearer ${init.accessToken}`)
  return fetch(API_URL + path, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    cache: "no-store",
  })
}

/** Exchanges a refresh token for a new pair; null if the backend rejects it. */
export async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  const res = await backendFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
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
