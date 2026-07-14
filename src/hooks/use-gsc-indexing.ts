import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import { api } from "@/hooks/use-api"

export interface IndexingPageRow {
  page_url: string
  coverage_state: string | null
  indexing_state: string | null
  verdict: string | null
  robots_txt_state: string | null
  page_fetch_state: string | null
  last_crawl_time: string | null
  google_canonical: string | null
  user_canonical: string | null
  crawled_as: string | null
  rich_results_verdict: string | null
  rich_results_items: unknown
  mobile_usability_verdict: string | null
  index_bucket: string
  source: string | null
  last_inspected_time: string | null
  clicks: number
  impressions: number
}

export interface IndexingPagesResult {
  rows: IndexingPageRow[]
  pagination: { total: number; limit: number; offset: number }
  window: { from: string; to: string }
}

export interface IndexingSeriesPoint {
  date: string
  [bucket: string]: number | string
}

export interface IndexingSummaryResult {
  totalInspected: number
  indexedCount: number
  notIndexedCount: number
  percentIndexed: number
  distribution: Record<string, number>
  lastSnapshot: string | null
  series: IndexingSeriesPoint[]
  window: { from: string; to: string }
}

export interface IndexingMovementRow {
  page_url: string
  before_state: string | null
  after_state: string | null
  before_bucket: string | null
  after_bucket: string | null
  detected_at: string
}

export interface IndexingMovementsResult {
  rows: IndexingMovementRow[]
  pagination: { total: number; limit: number; offset: number }
}

export interface IndexingStatusResult {
  status: "queued" | "in_progress" | "completed" | "failed" | "skipped" | null
  lastRunAt: string | null
  totalTracked: number
  inspectedCount: number
  pendingCount: number
  coverageProgress: number
  runProcessed: number
  runTotal: number
  runProgress: number
  lastSnapshot: string | null
}

export interface IndexingRunResult {
  success: boolean
  message: string
  mode?: "queued" | "inline"
  alreadyRunning?: boolean
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

function basePayload(businessUniqueId: string | null, website: string | null) {
  return {
    businessUniqueId: businessUniqueId || undefined,
    site_url: website || undefined,
  }
}

export interface IndexingPagesParams {
  from?: string
  to?: string
  status?: string | null
  indexBuckets?: string[] | null
  needsAttention?: boolean
  richResultState?: string | null
  crawlRecency?: string | null
  inspectionRecency?: string | null
  search?: string | null
  sort?: string
  dir?: "asc" | "desc"
  limit?: number
  offset?: number
}

export function useIndexingSummary(
  businessUniqueId: string | null,
  website: string | null,
  range?: { from?: string; to?: string }
) {
  const enabled = Boolean(businessUniqueId || website)
  return useQuery<IndexingSummaryResult>({
    queryKey: ["indexing-summary", businessUniqueId, website, range?.from, range?.to],
    queryFn: async () => {
      const res = await api.post<ApiEnvelope<IndexingSummaryResult>>(
        "/analytics/gsc/indexing/summary",
        "node",
        { ...basePayload(businessUniqueId, website), from: range?.from, to: range?.to }
      )
      return res.data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useIndexingPages(
  businessUniqueId: string | null,
  website: string | null,
  params: IndexingPagesParams
) {
  const enabled = Boolean(businessUniqueId || website)
  return useQuery<IndexingPagesResult>({
    queryKey: ["indexing-pages", businessUniqueId, website, params],
    queryFn: async () => {
      const res = await api.post<ApiEnvelope<IndexingPagesResult>>(
        "/analytics/gsc/indexing/pages",
        "node",
        { ...basePayload(businessUniqueId, website), ...params }
      )
      return res.data
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useIndexingMovements(
  businessUniqueId: string | null,
  website: string | null,
  params: { limit?: number; offset?: number } = {}
) {
  const enabled = Boolean(businessUniqueId || website)
  return useQuery<IndexingMovementsResult>({
    queryKey: ["indexing-movements", businessUniqueId, website, params],
    queryFn: async () => {
      const res = await api.post<ApiEnvelope<IndexingMovementsResult>>(
        "/analytics/gsc/indexing/movements",
        "node",
        { ...basePayload(businessUniqueId, website), ...params }
      )
      return res.data
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useIndexingStatus(
  businessUniqueId: string | null,
  website: string | null
) {
  const enabled = Boolean(businessUniqueId || website)
  return useQuery<IndexingStatusResult>({
    queryKey: ["indexing-status", businessUniqueId, website],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (businessUniqueId) search.set("businessUniqueId", businessUniqueId)
      if (website) search.set("site_url", website)
      const res = await api.get<ApiEnvelope<IndexingStatusResult>>(
        `/analytics/gsc/indexing/status?${search.toString()}`,
        "node"
      )
      return res.data
    },
    enabled,
    // Poll while an ingestion run is active so the banner/progress stays fresh.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "queued" || status === "in_progress" ? 5000 : false
    },
    staleTime: 60 * 1000,
  })
}

export function useTriggerIndexing(
  businessUniqueId: string | null,
  website: string | null
) {
  const queryClient = useQueryClient()
  return useMutation<IndexingRunResult>({
    mutationFn: async () => {
      const res = await api.post<IndexingRunResult>(
        "/analytics/gsc/indexing/run",
        "node",
        basePayload(businessUniqueId, website)
      )
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indexing-status", businessUniqueId, website],
      })
    },
  })
}
