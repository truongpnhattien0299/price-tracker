import {
  CalendarDaysIcon,
  ChartPieIcon,
  LayoutDashboardIcon,
  MapIcon,
  ReceiptTextIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const dashboardNav: NavItem[] = [
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Khoản chi", href: "/dashboard/entries", icon: ReceiptTextIcon },
  { title: "Lịch", href: "/dashboard/calendar", icon: CalendarDaysIcon },
  { title: "Bản đồ", href: "/dashboard/map", icon: MapIcon },
  { title: "Báo cáo", href: "/dashboard/reports", icon: ChartPieIcon },
]

export const dashboardSecondaryNav: NavItem[] = [
  { title: "Cài đặt", href: "/dashboard/settings", icon: SettingsIcon },
]
