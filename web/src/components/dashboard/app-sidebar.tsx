"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/dashboard/nav-user"
import { Logo } from "@/components/shared/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { dashboardNav, dashboardSecondaryNav, type NavItem } from "@/config/dashboard"

function NavGroup({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname()
  return (
    <SidebarGroup className={className}>
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo href="/dashboard" className="px-1 py-1.5 group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={dashboardNav} />
        <NavGroup items={dashboardSecondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
