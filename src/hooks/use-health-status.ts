import { useQuery } from "@tanstack/react-query"
import { api } from "./use-api"

// ─── Types ───────────────────────────────────────────────────────────────────

export type HealthColor = "green" | "amber" | "red" | "gray" | null
export type TrendArrow  = "up" | "flat" | "down" | "none" | null
export type Confidence  = "high" | "medium" | "low" | null

export interface HealthStatusRow {
  business_id:        string
  computed_date:      string          // 'YYYY-MM-DD' — the anchor date
  health_color:       HealthColor
  trend_arrow:        TrendArrow
  confidence:         Confidence
  reason_text:        string | null
  health_score:       number | null   // 0–100 weighted score (for debugging/future use)
  recent_leads:       number | null
  baseline_leads:     number | null
  lead_change_pct:    number | null   // decimal, e.g. −0.31
  recent_traffic:     number | null
  baseline_traffic:   number | null
  traffic_change_pct: number | null
  leads_score:        number | null
  traffic_score:      number | null
  gsc_connected:      boolean
  ga4_connected:      boolean
  is_stale:           boolean         // true when row is older than current anchor date
  updated_at:         string
}

interface ApiResponse<T> {
  data:    T
  err:     boolean
  message?: string
}

// ─── Single-business hook (latest status + history) ──────────────────────────

interface UseHealthStatusReturn {
  status:      HealthStatusRow | null
  history:     HealthStatusRow[]
  isLoading:   boolean
  isError:     boolean
  error:       string | null
  refetch:     () => Promise<void>
}

/**
 * Fetches the latest stored health status and 30-day history for one business.
 * Maps to:
 *   GET /api/1/analytics/health-status/:businessId/latest
 *   GET /api/1/analytics/health-status/:businessId/history?days=30
 */
export function useHealthStatus(
  businessId: string | null,
  historyDays = 30
): UseHealthStatusReturn {
  const latestQuery = useQuery({
    queryKey: ["health-status-latest", businessId],
    queryFn: async () => {
      if (!businessId) return null
      const res = await api.get<ApiResponse<HealthStatusRow | null>>(
        `/analytics/health-status/${businessId}/latest`,
        "node"
      )
      return res.data ?? null
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  })

  const historyQuery = useQuery({
    queryKey: ["health-status-history", businessId, historyDays],
    queryFn: async () => {
      if (!businessId) return []
      const res = await api.get<ApiResponse<HealthStatusRow[]>>(
        `/analytics/health-status/${businessId}/history`,
        "node",
        { params: { days: historyDays } }
      )
      return res.data ?? []
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  })

  const isLoading = latestQuery.isLoading || historyQuery.isLoading
  const isError   = latestQuery.isError   || historyQuery.isError
  const errorMsg  =
    (latestQuery.error  ? String(latestQuery.error)  : null) ??
    (historyQuery.error ? String(historyQuery.error) : null)

  async function refetch() {
    await Promise.all([latestQuery.refetch(), historyQuery.refetch()])
  }

  return {
    status:    latestQuery.data  ?? null,
    history:   historyQuery.data ?? [],
    isLoading,
    isError,
    error: errorMsg,
    refetch,
  }
}

// ─── Compute hook (trigger on-demand computation for one business) ───────────

interface UseComputeHealthStatusReturn {
  compute:   (businessId: string) => Promise<HealthStatusRow>
  isLoading: boolean
  error:     string | null
}

/**
 * Returns a `compute` function that triggers on-demand health status
 * computation for one business and returns the stored result.
 * Maps to: POST /api/1/analytics/health-status/compute
 */
export function useComputeHealthStatus(): UseComputeHealthStatusReturn {
  // We use a simple state-free wrapper; callers invalidate their own queries
  // after calling compute() if they want the UI to refresh.
  let isLoading = false
  let error: string | null = null

  async function compute(businessId: string): Promise<HealthStatusRow> {
    isLoading = true
    error = null
    try {
      const res = await api.post<ApiResponse<HealthStatusRow>>(
        "/analytics/health-status/compute",
        "node",
        { businessId }
      )
      if (res.err) throw new Error(res.message || "Computation failed")
      return res.data
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      isLoading = false
    }
  }

  return { compute, isLoading, error }
}

// ─── Batch hook (home dashboard — all business cards) ────────────────────────

interface UseHealthStatusBatchReturn {
  statusMap:  Record<string, HealthStatusRow>  // keyed by business_id
  isLoading:  boolean
  isError:    boolean
  error:      string | null
  refetch:    () => Promise<void>
}

/**
 * Fetches the latest stored health status for multiple businesses in one call.
 * Businesses with no stored row are absent from `statusMap`.
 * Maps to: POST /api/1/analytics/health-status/batch-latest
 */
export function useHealthStatusBatch(
  businessIds: string[] | null
): UseHealthStatusBatchReturn {
  const ids = businessIds ?? []

  const query = useQuery({
    queryKey: ["health-status-batch", ids],
    queryFn: async () => {
      if (ids.length === 0) return []
      const res = await api.post<ApiResponse<HealthStatusRow[]>>(
        "/analytics/health-status/batch-latest",
        "node",
        { businessIds: ids }
      )
      return res.data ?? []
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  })

  // Index by business_id for O(1) lookup in card rendering
  const statusMap: Record<string, HealthStatusRow> = {}
  for (const row of query.data ?? []) {
    statusMap[row.business_id] = row
  }

  return {
    statusMap,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error ? String(query.error) : null,
    refetch:   async () => { await query.refetch() },
  }
}
