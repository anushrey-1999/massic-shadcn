"use client"

import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { api } from "./use-api"

export type PrimaryDriversStatus = "needs_attention" | "watch_closely" | "stable"
export type PrimaryDriversConfidence = "high" | "medium" | "low"
export type PrimaryDriverTag = "internal" | "external" | "opportunity"

export interface PrimaryDriversMetricValue {
  current: number | null
  previous: number | null
  abs_change: number | null
  pct_change: number | null
}

export interface PrimaryDriversTopDriver {
  name: string
  tag: PrimaryDriverTag
  value: string
  explanation: string
  score: number
}

export interface PrimaryDriversChannelBreakdownRow {
  channel: string
  sessions: number
  sessions_change_pct: number | null
  conversions: number
  conversions_change_pct: number | null
}

export interface PrimaryDriversDeviceBreakdownRow {
  device: string
  sessions: number
  sessions_change_pct: number | null
  conversion_rate: number
  conversion_rate_change_pct: number | null
}

export interface PrimaryDriversTopPageRow {
  url: string
  clicks_change: number
  conversion_rate_change: number
}

export interface PrimaryDriversResponse {
  headline: string
  status: PrimaryDriversStatus
  primary_metric: "conversions" | "traffic" | "visibility" | "flat"
  confidence: PrimaryDriversConfidence
  metric_strip: {
    conversions: PrimaryDriversMetricValue
    sessions: PrimaryDriversMetricValue
    clicks: PrimaryDriversMetricValue
    impressions: PrimaryDriversMetricValue
    ctr: PrimaryDriversMetricValue
    avg_position: PrimaryDriversMetricValue
    conversion_rate: PrimaryDriversMetricValue
  }
  top_drivers: PrimaryDriversTopDriver[]
  segment_breakdowns: {
    channels: PrimaryDriversChannelBreakdownRow[]
    devices: PrimaryDriversDeviceBreakdownRow[]
    top_pages: PrimaryDriversTopPageRow[]
  }
  edge_case_flags: string[]
  date_range: {
    start: string
    end: string
    comparison_start: string
    comparison_end: string
  }
}

interface ApiResponse<T> {
  data: T
  err: boolean
  message?: string
}

interface UsePrimaryDriversOptions {
  businessId: string | null
  startDate: string | null
  endDate: string | null
  enabled?: boolean
}

interface UsePrimaryDriversReturn {
  data: PrimaryDriversResponse | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: string | null
  refetch: () => Promise<void>
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>
  return (
    axiosError?.response?.data?.message ||
    (error instanceof Error ? error.message : "Failed to fetch primary drivers")
  )
}

export function usePrimaryDrivers({
  businessId,
  startDate,
  endDate,
  enabled = true,
}: UsePrimaryDriversOptions): UsePrimaryDriversReturn {
  const query = useQuery({
    queryKey: ["primary-drivers", businessId, startDate, endDate],
    queryFn: async () => {
      if (!businessId || !startDate || !endDate) return null

      const response = await api.post<ApiResponse<PrimaryDriversResponse>>(
        "/analytics/primary-drivers",
        "node",
        {
          business_id: businessId,
          start_date: startDate,
          end_date: endDate,
        }
      )

      if (response.err) {
        throw new Error(response.message || "Failed to fetch primary drivers")
      }

      return response.data ?? null
    },
    enabled: enabled && !!businessId && !!startDate && !!endDate,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
