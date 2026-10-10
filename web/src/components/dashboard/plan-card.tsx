"use client"

import { UpgradeButton } from "@/components/dashboard/pro-lock"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TRIAL_DAYS } from "@/config/pricing"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { daysUntil, formatDate } from "@/lib/format"

/**
 * Plan status above the user menu (plans/07): trial days left, or the Free
 * plan's monthly count. Paid Pro has nothing to say, so it renders nothing.
 * Hidden when the sidebar collapses to icons.
 */
export function PlanCard() {
  const { data } = useEntitlement()
  if (!data || (data.isPro && data.proSource !== "trial")) return null

  if (data.isPro) {
    const left = daysUntil(data.proExpiresAt!)
    return (
      <Card size="sm" className="shadow-none group-data-[collapsible=icon]:hidden">
        <CardHeader>
          <CardTitle>Đang dùng thử Pro</CardTitle>
          <CardDescription>
            Còn {left} ngày, đến {formatDate(data.proExpiresAt!)}. Hết hạn tự về Free, không trừ tiền.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(left / TRIAL_DAYS) * 100} aria-label={`Còn ${left} trên ${TRIAL_DAYS} ngày dùng thử`} />
        </CardContent>
      </Card>
    )
  }

  const { entriesPerMonth } = data.limits!
  const used = data.usage.entriesThisMonth
  return (
    <Card size="sm" className="shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader>
        <CardTitle>Gói Free</CardTitle>
        <CardDescription>
          {used >= entriesPerMonth
            ? `Đã dùng hết ${entriesPerMonth} khoản chi tháng này.`
            : `Đã ghi ${used}/${entriesPerMonth} khoản chi tháng này.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress
          value={Math.min(100, (used / entriesPerMonth) * 100)}
          aria-label={`${used} trên ${entriesPerMonth} khoản chi tháng này`}
        />
        <UpgradeButton size="sm" className="w-full" />
      </CardContent>
    </Card>
  )
}
