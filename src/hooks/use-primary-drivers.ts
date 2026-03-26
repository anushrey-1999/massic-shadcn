"use client"

import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { api } from "./use-api"

// ─── v1.3 Types ────────────────────────────────────────────────────────────────

export type PrimaryDriversWindowBucket = "7d" | "28d" | "90d" | "365d"
export type PrimaryDriversContributorAnchor = "GOALS" | "SESSIONS" | "CLICKS" | "CVR"
export type PrimaryDriversDirection = "up" | "down" | "steady" | "flat"
export type PrimaryDriversBaselineStatus = "FULL" | "PARTIAL" | "NONE"

// Query row — under organic page children
export interface PrimaryDriversQuery {
  query: string       // middle-truncated at 40 chars
  query_full: string  // full query for tooltip
  brand: boolean
  clicks_delta: number
  impressions_delta: number
  ctr_pp_change: number
  position_delta: number  // inverted: positive = improvement
  flags: string[]
}

// Device breakdown — nested under page child when one device > 60% of page delta
export interface PrimaryDriversDeviceBreakdown {
  device: "mobile" | "desktop" | "tablet"
  goals_delta: number
  sessions_delta: number
}

// Driver entry
export interface PrimaryDriversDriver {
  metric: "GOALS" | "SESSIONS" | "CLICKS" | "CVR"
  display_name: string          // e.g. 'Contact Form Submit', 'Sessions'
  driver_type: string           // 'Outcome' | 'Traffic' | 'Organic Traffic' | 'Conversion Efficiency'
  direction: PrimaryDriversDirection
  value_delta: number           // absolute delta (pp_change for CVR)
  pct_change: number | null     // null for CVR
  pp_change: number | null      // CVR only (percentage points)
  cvr_baseline_pct: number | null  // CVR only — 'was X%' context
  driver_score: number
  delta_traffic: number | null  // CVR decomposition
  delta_cvr: number | null      // CVR decomposition
  cvr_share: number | null      // CVR decomposition
  flags: string[]
}

// Page-level contributor (child under CHANNEL)
export interface PrimaryDriversPageContributor {
  dimension: "PAGE"
  value: string
  anchor_delta: number
  goals_delta: number | null
  sessions_delta: number | null
  clicks_delta: number | null
  cvr_pp_delta: number | null
  contribution_share: number
  contributor_score: number
  coverage_pct: number           // cumulative coverage within parent channel
  flags: string[]
  device_breakdown?: PrimaryDriversDeviceBreakdown[]
  queries?: PrimaryDriversQuery[]
}

// Channel-level contributor (top-level)
export interface PrimaryDriversContributor {
  dimension: "CHANNEL"
  value: string
  anchor_delta: number
  goals_delta: number | null
  sessions_delta: number | null
  clicks_delta: number | null
  cvr_pp_delta: number | null
  contribution_share: number
  contributor_score: number
  coverage_pct: number           // cumulative top-level coverage
  page_hidden_count: number      // pages above 5% floor not shown
  flags: string[]
  children: PrimaryDriversPageContributor[]
}

// Baseline per-metric entry
export interface PrimaryDriversBaselineMetric {
  baseline_mean: number | null
  baseline_stddev: number | null
  vs_baseline_pct: number | null   // fraction: 0.10 = 10% above baseline
  yoy_pct: number | null
}

// Baseline section
export interface PrimaryDriversBaseline {
  status: PrimaryDriversBaselineStatus
  baseline_days: number
  yoy_available: boolean
  per_metric: {
    goals: PrimaryDriversBaselineMetric
    sessions: PrimaryDriversBaselineMetric
    clicks: PrimaryDriversBaselineMetric
  }
}

// Wins bar entry
export interface PrimaryDriversWin {
  type: "driver" | "channel" | "query"
  label: string
  value: string
}

// Coverage summary
export interface PrimaryDriversCoverage {
  shown_pct: number
  hidden_count: number
}

// Full response
export interface PrimaryDriversResponse {
  window_bucket: PrimaryDriversWindowBucket
  date_range: {
    start: string
    end: string
    comparison_start: string
    comparison_end: string
  }
  no_goal_tracking: boolean
  anomalous_comparison_period: boolean
  headline: string                         // assembled top-line reel string
  contributor_anchor: PrimaryDriversContributorAnchor
  contributor_divergence: boolean
  drivers: PrimaryDriversDriver[]
  baseline: PrimaryDriversBaseline
  wins: PrimaryDriversWin[]
  contributors: PrimaryDriversContributor[]
  coverage: PrimaryDriversCoverage
  edge_case_flags: string[]
  error?: string
  message?: string
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

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

      if (response.data?.error === "INSUFFICIENT_HISTORY") {
        throw new Error(response.data.message || "No comparison period available.")
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
