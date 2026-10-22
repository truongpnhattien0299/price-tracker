import { NextResponse, type NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants"
import { reverseGeocode } from "@/lib/nominatim"

/** Coordinates → a short Vietnamese address, via the shared Nominatim queue in `lib/nominatim.ts`. */
export async function GET(req: NextRequest) {
  // Signed-in users only. Presence is enough: the throttle in reverseGeocode(),
  // not this check, is what keeps us inside the policy.
  if (!req.cookies.has(ACCESS_COOKIE) && !req.cookies.has(REFRESH_COOKIE)) {
    return errorResponse(401, "Chưa đăng nhập.")
  }
  const lat = Number(req.nextUrl.searchParams.get("lat"))
  const lng = Number(req.nextUrl.searchParams.get("lng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return errorResponse(400, "Toạ độ không hợp lệ.")
  }

  const result = await reverseGeocode(lat, lng)
  return result ? NextResponse.json(result) : errorResponse(502, "Không tra được địa chỉ.")
}
