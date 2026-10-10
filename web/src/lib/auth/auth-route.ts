import "server-only"

import { NextResponse, type NextRequest } from "next/server"

import {
  backendFetch,
  backendUnreachable,
  clientIp,
  crossOriginRejected,
} from "@/lib/api/backend"
import type { AuthResponse, User } from "@/types/api"

import { isSameOrigin } from "./origin"
import { setSession } from "./session"

/**
 * Forwards login/register to the backend, moves the returned tokens into
 * httpOnly cookies and replies with the user only — tokens never reach JS.
 */
export async function forwardAuth(req: NextRequest, path: "/auth/login" | "/auth/register") {
  if (!isSameOrigin(req)) return crossOriginRejected()

  let res: Response
  try {
    res = await backendFetch(path, {
      method: "POST",
      body: await req.text(),
      clientIp: clientIp(req),
    })
  } catch {
    return backendUnreachable()
  }

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json(data, { status: res.status })

  const { user, accessToken, refreshToken } = data as AuthResponse
  const out = NextResponse.json<{ user: User }>({ user }, { status: res.status })
  setSession(out, { accessToken, refreshToken })
  return out
}
