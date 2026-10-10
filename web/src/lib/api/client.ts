import { loginUrl } from "@/lib/auth/redirect"
import type { ApiError } from "@/types/api"

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    const msg = body?.message
    super(Array.isArray(msg) ? msg.join(", ") : (msg ?? `HTTP ${status}`))
  }
}

type Query = Record<string, string | number | undefined | null>

type RequestOptions = Omit<RequestInit, "body"> & {
  query?: Query
  body?: unknown
}

function withQuery(url: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Same-origin JSON request. Cookies ride along automatically; the browser
 * never sees a token. Throws `HttpError` on non-2xx.
 */
export async function request<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { query, body, headers, ...init } = opts
  const res = await fetch(withQuery(url, query), {
    ...init,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ApiError | null
    throw new HttpError(res.status, errBody)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * Backend call through the BFF proxy (`/api/backend/*`), which handles the
 * access/refresh dance. A 401 here means the session is gone for good.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await request<T>(`/api/backend${path}`, opts)
  } catch (err) {
    if (err instanceof HttpError && err.status === 401 && typeof window !== "undefined") {
      window.location.assign(loginUrl(window.location.pathname + window.location.search))
    }
    throw err
  }
}
