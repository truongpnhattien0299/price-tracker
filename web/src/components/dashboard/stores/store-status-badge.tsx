import { GlobeIcon, HourglassIcon, LockIcon, ShoppingCartIcon, StoreIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { StoreKind, StoreStatus } from "@/types/api"

const LABELS: Record<StoreStatus, { label: string; icon: typeof LockIcon }> = {
  personal: { label: "Riêng tư", icon: LockIcon },
  pending: { label: "Chờ duyệt", icon: HourglassIcon },
  global: { label: "Công khai", icon: GlobeIcon },
}

export function StoreStatusBadge({ status }: { status: StoreStatus }) {
  const { label, icon: Icon } = LABELS[status]
  return (
    <Badge variant={status === "global" ? "secondary" : "outline"}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  )
}

/** "350 m" / "1,2 km". */
export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} km`
}

/** Shop front for a physical store, a cart for an online one. */
export function StoreKindIcon({ kind, className }: { kind?: StoreKind; className?: string }) {
  const Icon = kind === "online" ? ShoppingCartIcon : StoreIcon
  return <Icon aria-hidden className={className} />
}

/** The line under a store's name: its address, or that it sells online. */
export function storePlace(store: { kind?: StoreKind; address: string | null }) {
  return store.kind === "online" ? "Bán online" : (store.address ?? "Chưa có địa chỉ")
}
