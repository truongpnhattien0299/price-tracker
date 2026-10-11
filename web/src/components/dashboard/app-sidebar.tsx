"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/dashboard/nav-user"
import { PlanCard } from "@/components/dashboard/plan-card"
import { Logo } from "@/components/shared/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { dashboardAdminNav, dashboardNav, dashboardSecondaryNav, type NavItem } from "@/config/dashboard"
import { useMe } from "@/hooks/queries/use-me"

function NavGroup({ items, label, className }: { items: NavItem[]; label?: string; className?: string }) {
  const pathname = usePathname()
  return (
    <SidebarGroup className={className}>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const { data: user } = useMe()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo href="/dashboard" className="px-1 py-1.5 group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={dashboardNav} />
        {user?.role === "admin" && <NavGroup items={dashboardAdminNav} label="Quản trị" />}
        <NavGroup items={dashboardSecondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <PlanCard />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
