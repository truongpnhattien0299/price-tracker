"use client"

import { CircleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { HttpError } from "@/lib/api/client"
import { authApi } from "@/lib/api/endpoints"
import { safeNextPath } from "@/lib/auth/redirect"

type Mode = "login" | "register"

const copy = {
  login: {
    title: "Đăng nhập",
    description: "Tiếp tục ghi lại những gì bạn mua.",
    submit: "Đăng nhập",
    pending: "Đang đăng nhập…",
    switchText: "Chưa có tài khoản?",
    switchLabel: "Tạo tài khoản",
    switchHref: "/register",
  },
  register: {
    title: "Tạo tài khoản",
    description: "30 ngày đầu dùng đủ tính năng Pro, không cần thẻ.",
    submit: "Tạo tài khoản",
    pending: "Đang tạo tài khoản…",
    switchText: "Đã có tài khoản?",
    switchLabel: "Đăng nhập",
    switchHref: "/login",
  },
} satisfies Record<Mode, Record<string, string>>

type FieldName = "email" | "password"
type FormError = { message: string; fields: FieldName[] }

/** Turns a backend/BFF failure into something the user can act on. */
function toFormError(err: unknown, mode: Mode): FormError {
  if (!(err instanceof HttpError)) {
    return { message: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", fields: [] }
  }
  switch (err.status) {
    case 401:
      return { message: "Email hoặc mật khẩu không đúng.", fields: ["email", "password"] }
    case 409:
      return { message: "Email này đã có tài khoản. Đăng nhập bằng email này.", fields: ["email"] }
    case 400:
      return {
        message:
          mode === "register"
            ? "Kiểm tra lại email, và mật khẩu cần ít nhất 8 ký tự."
            : "Kiểm tra lại email và mật khẩu.",
        fields: ["email", "password"],
      }
    case 429:
      return { message: "Thử quá nhiều lần. Đợi một phút rồi thử lại.", fields: [] }
    default:
      return {
        message: err.status >= 500 ? err.message : "Không đăng nhập được. Thử lại.",
        fields: [],
      }
  }
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const invalid = (f: FieldName) => error?.fields.includes(f) || undefined
  const t = copy[mode]
  // Carry ?next= across the login ↔ register switch.
  const switchHref = next ? `${t.switchHref}?next=${encodeURIComponent(next)}` : t.switchHref

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get("email"))
    const password = String(form.get("password"))

    setPending(true)
    setError(null)
    try {
      if (mode === "login") {
        await authApi.login({ email, password })
      } else {
        await authApi.register({ email, password, displayName: String(form.get("displayName")) })
      }
      router.replace(safeNextPath(next))
      router.refresh()
    } catch (err) {
      setError(toFormError(err, mode))
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup>
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {mode === "register" && (
            <Field>
              <FieldLabel htmlFor="displayName">Tên của bạn</FieldLabel>
              <Input id="displayName" name="displayName" required autoComplete="name" />
            </Field>
          )}
          <Field data-invalid={invalid("email")}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              aria-invalid={invalid("email")}
            />
          </Field>
          <Field data-invalid={invalid("password")}>
            <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-invalid={invalid("password")}
            />
            {mode === "register" && <FieldDescription>Ít nhất 8 ký tự.</FieldDescription>}
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? t.pending : t.submit}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-muted-foreground text-sm">
        {t.switchText}{" "}
        <Link href={switchHref} className="text-foreground font-medium underline underline-offset-4">
          {t.switchLabel}
        </Link>
      </p>
    </div>
  )
}
