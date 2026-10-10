import { NextResponse, type NextRequest } from "next/server"

import { REFRESH_COOKIE } from "@/lib/auth/constants"

// Presence check only — the backend decides whether the token is valid. A dead
// session gets its cookies cleared by the API proxy on the first 401, so this
// can't loop between /login and /dashboard.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(REFRESH_COOKIE)
  const { pathname, search } = req.nextUrl

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = new URL("/login", req.url)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
}
