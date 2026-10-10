"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UpgradeButton } from "@/components/dashboard/pro-lock"
import { ErrorState } from "@/components/shared/query-state"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { useMe } from "@/hooks/queries/use-me"
import { daysUntil, formatDate, initials } from "@/lib/format"
import type { Entitlement } from "@/types/api"

/** Reads the backend's verdict (plans/07): the client never decides Pro by itself. */
function planOf(e: Entitlement) {
  if (e.isPro && e.proSource === "trial") {
    return {
      badge: "Trial",
      title: `Dùng thử Pro còn ${daysUntil(e.proExpiresAt!)} ngày`,
      lines: [`Hết hạn ${formatDate(e.proExpiresAt!)}, sau đó tự về gói Free.`],
    }
  }
  if (e.isPro) {
    return { badge: "Pro", title: "Gói Pro", lines: [`Gia hạn đến ${formatDate(e.proExpiresAt!)}.`] }
  }
  const { entriesPerMonth, historyMonths } = e.limits!
  return {
    badge: "Free",
    title: "Gói miễn phí",
    lines: [
      e.proSource === "trial" ? "Thời gian dùng thử đã kết thúc." : "Bạn đang dùng gói miễn phí.",
      `Tháng này đã ghi ${e.usage.entriesThisMonth}/${entriesPerMonth} khoản chi.`,
      `Xem được ${historyMonths} tháng gần nhất, từ ${formatDate(e.historyFrom!)}.`,
    ],
  }
}

export function SettingsView() {
  const me = useMe()
  const entitlement = useEntitlement()

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
  const plan = entitlement.data && planOf(entitlement.data)

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
              {plan.lines.map((line) => (
                <span key={line} className="text-muted-foreground">
                  {line}
                </span>
              ))}
              {plan.badge === "Free" && <UpgradeButton size="sm" className="mt-2 self-start" />}
            </div>
          ) : entitlement.isError ? (
            <ErrorState
              error={entitlement.error}
              onRetry={() => entitlement.refetch()}
              retrying={entitlement.isFetching}
            />
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
