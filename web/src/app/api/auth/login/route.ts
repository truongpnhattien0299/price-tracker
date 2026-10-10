import type { NextRequest } from "next/server"

import { forwardAuth } from "@/lib/auth/auth-route"

export function POST(req: NextRequest) {
  return forwardAuth(req, "/auth/login")
}
