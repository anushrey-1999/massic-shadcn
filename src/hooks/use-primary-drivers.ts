"use client"

import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { api } from "./use-api"

// ─── v2.2 Types ────────────────────────────────────────────────────────────────

export type PrimaryDriversWindowBucket = "7d" | "28d" | "90d" | "365d"
export type PrimaryDriversSeverity = "HIGH" | "MEDIUM" | "LOW"
export type PrimaryDriversDirection = "up" | "down" | "flat"

export interface PrimaryDriversQuery {
  query: string
  brand: boolean
  clicks_delta: number
  impressions_delta: number
  ctr_pp_change: number
  position_delta: number  // inverted: positive = improvement
  flags: string[]
}

export interface PrimaryDriversDriver {
  metric: string
  driver_type: string
  direction: "up" | "down"
  value_delta: number        // absolute delta (position_delta for AVG_POSITION, pp_change for CVR/CTR, absolute_delta for counts)
  pct_change: number | null  // null for AVG_POSITION
  driver_score: number
  delta_traffic: number | null  // CVR only
  delta_cvr: number | null      // CVR only
  cvr_share: number | null      // CVR only
  flags: string[]
}

export interface PrimaryDriversContributor {
  dimension: string
  value: string
  absolute_delta: number
  contribution_share: number
  contributor_score: number
  flags: string[]
  children?: PrimaryDriversContributor[]   // PAGE-level children (or CHANNEL under DEVICE)
  queries?: PrimaryDriversQuery[] | null   // populated only when dimension=PAGE and parent=Organic
}

export interface PrimaryDriversResponse {
  window_bucket: PrimaryDriversWindowBucket
  severity: PrimaryDriversSeverity
  date_range: {
    start: string
    end: string
    comparison_start: string
    comparison_end: string
  }
  drivers: PrimaryDriversDriver[]
  contributors: PrimaryDriversContributor[]
  edge_case_flags: string[]
  error?: string
  message?: string
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
