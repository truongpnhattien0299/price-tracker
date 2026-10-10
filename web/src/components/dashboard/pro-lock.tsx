"use client"

import { LockIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** No checkout yet (plans/07 E1): "upgrade" leads to the plans on the landing page. */
export const UPGRADE_HREF = "/#pricing"

export function UpgradeButton({ className, size }: { className?: string; size?: "sm" | "default" }) {
  return (
    <Button asChild size={size} className={className}>
      <Link href={UPGRADE_HREF}>Xem gói Pro</Link>
    </Button>
  )
}

/** Why something is locked, with the window start from `/me/entitlement`. */
export function useHistoryNotice() {
  const { data } = useEntitlement()
  const months = data?.limits?.historyMonths ?? 3
  const from = data?.historyFrom ? ` (từ ${formatDate(data.historyFrom)})` : ""
  return `Gói Free xem được ${months} tháng gần nhất${from}. Nâng cấp Pro để mở lại toàn bộ lịch sử, dữ liệu cũ vẫn được giữ nguyên.`
}

/** Stand-in for a photo the API withheld. Decorative: the caller labels it. */
export function LockedTile({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted text-muted-foreground flex items-center justify-center", className)}>
      <LockIcon className="size-5" />
    </div>
  )
}

/** Opened from a locked calendar day or row: what is hidden and how to get it back. */
export function ProLockDialog({
  open,
  onOpenChange,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}) {
  const notice = useHistoryNotice()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{notice}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
          <UpgradeButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
