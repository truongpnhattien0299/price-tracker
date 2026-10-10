"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/hooks/queries/use-me"
import { authApi } from "@/lib/api/endpoints"
import { initials } from "@/lib/format"

export function NavUser() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useMe()

  async function logout() {
    await authApi.logout().catch(() => undefined)
    // Drop every cached query so the next account never sees this one's data.
    queryClient.clear()
    // replace, not push: Back must not return to a dashboard page.
    router.replace("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{user ? initials(user.displayName) : ""}</AvatarFallback>
              </Avatar>
              {user ? (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              )}
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <SettingsIcon /> Cài đặt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={logout}>
                <LogOutIcon /> Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
