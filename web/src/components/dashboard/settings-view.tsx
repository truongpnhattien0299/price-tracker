"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/shared/query-state"
import { useMe } from "@/hooks/queries/use-me"
import { formatDate, initials } from "@/lib/format"
import type { User } from "@/types/api"

const DAY_MS = 24 * 60 * 60 * 1000

/** Mirrors backend `isPro()`: entitlement is computed from proExpiresAt, never stored. */
function planOf(user: User, now = Date.now()) {
  const expires = user.proExpiresAt ? new Date(user.proExpiresAt).getTime() : null
  const active = expires !== null && now < expires
  if (!active) {
    return {
      badge: "Free",
      title: "Gói miễn phí",
      detail: user.proSource === "trial" ? "Thời gian dùng thử đã kết thúc." : "Bạn đang dùng gói miễn phí.",
    }
  }
  if (user.proSource === "trial") {
    const days = Math.ceil((expires - now) / DAY_MS)
    return {
      badge: "Trial",
      title: `Dùng thử Pro còn ${days} ngày`,
      detail: `Hết hạn ${formatDate(user.proExpiresAt!)}.`,
    }
  }
  return { badge: "Pro", title: "Gói Pro", detail: `Gia hạn đến ${formatDate(user.proExpiresAt!)}.` }
}

export function SettingsView() {
  const me = useMe()

  if (me.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState error={me.error} onRetry={() => me.refetch()} retrying={me.isFetching} />
        </CardContent>
      </Card>
    )
  }

  const user = me.data
  const plan = user && planOf(user)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ</CardTitle>
          <CardDescription>Thông tin tài khoản của bạn.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback>{user ? initials(user.displayName) : ""}</AvatarFallback>
          </Avatar>
          {user ? (
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="truncate font-medium">{user.displayName}</span>
              <span className="text-muted-foreground truncate">{user.email}</span>
              <span className="text-muted-foreground text-xs">Tham gia {formatDate(user.createdAt)}</span>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Gói dịch vụ</CardTitle>
          <CardDescription>Quyền lợi Pro được tính theo ngày hết hạn.</CardDescription>
        </CardHeader>
        <CardContent>
          {plan ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{plan.title}</span>
                <Badge variant={plan.badge === "Free" ? "outline" : "secondary"}>{plan.badge}</Badge>
              </div>
              <span className="text-muted-foreground">{plan.detail}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
