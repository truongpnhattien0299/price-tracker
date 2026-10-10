import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "Lịch" }

// TODO(plan): month photo grid from GET /entries/calendar?month=YYYY-MM
// (cover photo per day via /uploads/photo-url), click a day → entries of that day.
export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Lịch" description="Mỗi ngày một ô ảnh." />
      <Card>
        <CardContent className="text-muted-foreground py-16 text-center text-sm">
          Lịch ảnh theo tháng — sắp có.
        </CardContent>
      </Card>
    </>
  )
}
