import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { ReportsView } from "@/components/dashboard/reports-view"

export const metadata: Metadata = { title: "Báo cáo" }

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Báo cáo" description="Phân tích chi tiêu theo thời gian, danh mục, cửa hàng." />
      <ReportsView />
    </>
  )
}
