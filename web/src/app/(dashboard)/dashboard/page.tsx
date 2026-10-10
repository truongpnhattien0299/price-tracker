import type { Metadata } from "next"

import { OverviewView } from "@/components/dashboard/overview-view"
import { PageHeader } from "@/components/dashboard/page-header"

export const metadata: Metadata = { title: "Tổng quan" }

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Tổng quan" description="Chi tiêu của bạn trong tháng này." />
      <OverviewView />
    </>
  )
}
