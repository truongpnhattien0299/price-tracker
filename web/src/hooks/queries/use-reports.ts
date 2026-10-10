"use client"

import { useQuery } from "@tanstack/react-query"

import { reportsApi } from "@/lib/api/endpoints"
import { qk } from "@/lib/query/keys"
import type { GroupBy, ReportRange } from "@/types/api"

export function useReportSummary(range: ReportRange) {
  return useQuery({
    queryKey: qk.reports.summary(range),
    queryFn: () => reportsApi.summary(range),
  })
}

export function useCategoryBreakdown(range: ReportRange) {
  return useQuery({
    queryKey: qk.reports.byCategory(range),
    queryFn: () => reportsApi.byCategory(range),
  })
}

export function useTimeSeries(groupBy: GroupBy, range: ReportRange, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.reports.timeSeries(groupBy, range),
    queryFn: () => reportsApi.timeSeries(groupBy, range),
    enabled,
  })
}

export function useTopStores(range: ReportRange) {
  return useQuery({
    queryKey: qk.reports.topStores(range),
    queryFn: () => reportsApi.topStores(range),
  })
}
