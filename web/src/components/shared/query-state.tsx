"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { InboxIcon, RotateCwIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

export function ErrorState({
  error,
  onRetry,
  retrying,
}: {
  error?: Error | null
  onRetry?: () => void
  retrying?: boolean
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Không tải được dữ liệu</EmptyTitle>
        <EmptyDescription>{error?.message ?? "Đã có lỗi xảy ra. Vui lòng thử lại."}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            {retrying ? <Spinner data-icon="inline-start" /> : <RotateCwIcon data-icon="inline-start" />}
            Thử lại
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}

/**
 * Picks loading / error / empty / data rendering for one query. Widgets keep
 * their own card chrome and pass a matching skeleton.
 */
export function QueryContent<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  children,
}: {
  query: UseQueryResult<T>
  skeleton: React.ReactNode
  isEmpty?: (data: T) => boolean
  empty?: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
  if (query.isPending) return skeleton
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
  }
  if (empty && isEmpty?.(query.data)) return empty
  return children(query.data)
}
