import { NextResponse, type NextRequest } from "next/server"

import { crossOriginRejected } from "@/lib/api/backend"
import { isSameOrigin } from "@/lib/auth/origin"
import { clearSession } from "@/lib/auth/session"

// Auth is stateless on the backend (no stored refresh tokens), so logging out
// is purely dropping the cookies.
export function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossOriginRejected()
  const res = new NextResponse(null, { status: 204 })
  clearSession(res)
  return res
}
