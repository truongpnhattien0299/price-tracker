import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { SettingsView } from "@/components/dashboard/settings-view"

export const metadata: Metadata = { title: "Cài đặt" }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt" />
      <SettingsView />
    </>
  )
}
