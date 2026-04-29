import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import type { TimePeriodValue } from "@/utils/analytics-period"

export type { TimePeriodValue }

export const ALL_GOALS_CONVERSION_EVENT = "__all_goals__"

export interface ConversionEventOption {
  eventName: string
  totalConversions: number
}

export interface ConversionOverviewRow {
  channel: string
  pct: number
}

export interface ConversionOverviewOpener extends ConversionOverviewRow {
  users: number
}

export interface ConversionOverviewCloser extends ConversionOverviewRow {
  conversions: number
}

export interface ConversionOverviewPayload {
  source: "timescale" | "ga4"
  totalConversions: number
  dateRange: {
    from: string
    to: string
  }
  conversionEvent: string
  openers: ConversionOverviewOpener[]
  closers: ConversionOverviewCloser[]
  story: {
    topOpeners: string[]
    topClosers: string[]
    tagline: string
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface ConversionEventsData {
  source: "timescale" | "ga4"
  ranges: {
    currentStart: string
    currentEnd: string
    previousStart: string
    previousEnd: string
  }
  events: ConversionEventOption[]
}

interface UseConversionOverviewArgs {
  businessUniqueId: string | null
  siteUrl: string | null
  period: TimePeriodValue
  conversionEvent?: string | null
  enabled?: boolean
}

export function useConversionEvents({
  businessUniqueId,
  siteUrl,
  period,
  enabled = true,
}: Omit<UseConversionOverviewArgs, "conversionEvent">) {
  return useQuery<ApiResponse<ConversionEventsData>>({
    queryKey: ["conversion-events", businessUniqueId, siteUrl, period],
    queryFn: () =>
      api.post<ApiResponse<ConversionEventsData>>("/analytics/ga4/conversion-events", "node", {
        businessUniqueId,
        siteUrl,
        period,
      }),
    enabled: enabled && Boolean(businessUniqueId && siteUrl),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useConversionOverview({
  businessUniqueId,
  siteUrl,
  period,
  conversionEvent,
  enabled = true,
}: UseConversionOverviewArgs) {
  return useQuery<ApiResponse<ConversionOverviewPayload>>({
    queryKey: ["conversion-overview", businessUniqueId, siteUrl, period, conversionEvent],
    queryFn: () =>
      api.post<ApiResponse<ConversionOverviewPayload>>("/analytics/ga4/conversion-overview", "node", {
        businessUniqueId,
        siteUrl,
        period,
        conversionEvent,
      }),
    enabled: enabled && Boolean(businessUniqueId && siteUrl && conversionEvent),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
