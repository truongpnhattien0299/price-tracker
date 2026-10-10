import type { Metadata } from "next"
import { Suspense } from "react"

import { CalendarView } from "@/components/dashboard/calendar-view"
import { PageHeader } from "@/components/dashboard/page-header"

export const metadata: Metadata = { title: "Lịch" }

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Lịch" description="Mỗi ngày một ô ảnh — chạm để xem các khoản chi trong ngày." />
      {/* useSearchParams() needs a Suspense boundary to keep the page shell static. */}
      <Suspense>
        <CalendarView />
      </Suspense>
    </>
  )
}
