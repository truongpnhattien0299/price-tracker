import "server-only"

import type { NextResponse } from "next/server"

import type { TokenPair } from "@/types/api"

import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants"

/**
 * Reads `exp` without verifying the signature — Next.js does not hold the JWT
 * secret. Only used to align cookie lifetime with the token; the backend
 * remains the sole judge of validity.
 */
function expiresAt(jwt: string): Date | undefined {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return exp ? new Date(exp * 1000) : undefined
  } catch {
    return undefined
  }
}

const baseOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const

export function setSession(res: NextResponse, tokens: TokenPair) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    expires: expiresAt(tokens.accessToken),
  })
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    expires: expiresAt(tokens.refreshToken),
  })
}

export function clearSession(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...baseOptions, maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, "", { ...baseOptions, maxAge: 0 })
}
