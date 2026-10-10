import { cookies } from "next/headers"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// Auth gate lives in src/middleware.ts.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
