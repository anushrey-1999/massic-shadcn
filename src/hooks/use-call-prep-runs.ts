"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApi, type ApiPlatform } from "./use-api"
import type {
  CallPrepRunDetail,
  CallPrepRunsListResponse,
  CallPrepRunListItem,
} from "./use-primary-drivers"

export interface ListCallPrepRunsParams {
  business_id: string
  page: number
  perPage: number
  sort?: Array<{ field: string; desc: boolean }>
}

export interface CallPrepRunsTableResponse {
  data: CallPrepRunListItem[]
  pageCount: number
  pagination: {
    page: number
    page_size: number
    total: number | null
  }
}

export function useCallPrepRuns() {
  const platform: ApiPlatform = "node"
  const listApi = useApi<CallPrepRunsListResponse>({ platform })

  const fetchCallPrepRuns = useCallback(
    async (params: ListCallPrepRunsParams): Promise<CallPrepRunsTableResponse> => {
      const queryParams = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.perPage),
      })

      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort))
      }

      const endpoint = `/analytics/business/${params.business_id}/call-prep-runs?${queryParams.toString()}`
      const response = await listApi.execute(endpoint, { method: "GET" })
      const items = Array.isArray(response?.items) ? response.items : []
      const total = typeof response?.total === "number" ? response.total : null

      return {
        data: items,
        pageCount: total === null ? 0 : Math.ceil(total / params.perPage),
        pagination: {
          page: typeof response?.page === "number" ? response.page : params.page,
          page_size: typeof response?.page_size === "number" ? response.page_size : params.perPage,
          total,
        },
      }
    },
    [listApi],
  )

  return {
    fetchCallPrepRuns,
    loading: listApi.loading,
    error: listApi.error,
    reset: listApi.reset,
  }
}

export function useCallPrepRunDetail(params: {
  callPrepRunId: string | null
  enabled?: boolean
}) {
  const platform: ApiPlatform = "node"
  const api = useApi<CallPrepRunDetail>({ platform })
  const { callPrepRunId, enabled = true } = params

  return useQuery({
    queryKey: ["call-prep-run-detail", callPrepRunId],
    enabled: enabled && !!callPrepRunId,
    queryFn: async () => {
      if (!callPrepRunId) {
        throw new Error("Call prep run ID is required")
      }

      return api.execute(
        `/analytics/call-prep-runs/${encodeURIComponent(callPrepRunId)}`,
        { method: "GET" },
      ) as Promise<CallPrepRunDetail>
    },
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000,
  })
}
