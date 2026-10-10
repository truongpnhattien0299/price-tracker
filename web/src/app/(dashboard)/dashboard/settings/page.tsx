import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Cài đặt" }

// TODO(plan): profile from /auth/me, entitlement from /me/entitlement (trial days left).
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt" />
      <Card>
        <CardHeader>
          <CardTitle>Gói dịch vụ</CardTitle>
          <CardDescription>Thông tin gói Pro / trial sẽ hiển thị ở đây.</CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}
