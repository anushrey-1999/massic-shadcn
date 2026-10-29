import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import type { TimePeriodValue } from "@/utils/analytics-period"

export const SMART_SITEMAP_STATUSES = [
  "indexed",
  "crawled_not_indexed",
  "discovered_not_indexed",
  "excluded",
  "error",
  "other",
  "unknown",
  "pending",
  "mixed",
] as const

export type SmartSitemapStatus = (typeof SMART_SITEMAP_STATUSES)[number]
export type InspectionFreshness = "fresh" | "due" | "overdue" | "pending" | "not_monitored" | "unknown"

export const SMART_SITEMAP_SORTS = [
  "gsc.clicks",
  "gsc.impressions",
  "gsc.position",
  "ga4.sessions",
  "ga4.keyEvents",
] as const

export type SmartSitemapSort = (typeof SMART_SITEMAP_SORTS)[number]

export interface GscMetrics {
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}

export interface Ga4Metrics {
  sessions: number
  engagedSessions: number
  engagementRate: number | null
  keyEvents: number
  revenue: number
}

export interface IndexingSummary {
  status: SmartSitemapStatus
  /** Google's coverage text for the status, e.g. "Not found (404)". */
  coverageState: string | null
  /** The variant that stands for the path: bare URL on the business host, else the newest inspected. */
  primaryPageUrl: string | null
  lastInspectedAt: string | null
  oldestInspectedAt: string | null
  nextInspectionAt: string | null
  inspectionFreshness: InspectionFreshness
  monitoringEnabled: boolean
  variantCount: number
  inspectedVariantCount: number
}

export interface SourceMeta {
  status: "available" | "no_data" | "scope_replacement_pending" | "not_requested"
  dataThrough: string | null
  ingestionStatus: string | null
  materialized: boolean
}

export interface DateRange {
  period: string
  from: string
  to: string
}

export interface SitePageIdentity {
  id: string
  businessId: string
  path: string
  sources: string[]
  firstSeenAt: string | null
  lastSeenAt: string | null
}

export interface SmartSitemapListPage extends SitePageIdentity {
  gsc: GscMetrics | null
  ga4: Ga4Metrics | null
  indexing: IndexingSummary
  keywordCount: number
}

export interface SmartSitemapListResult {
  pages: SmartSitemapListPage[]
  total: number
  pagination: { page: number; limit: number; totalPages: number; hasNextPage: boolean }
  meta: {
    range: DateRange
    sources: { gsc: SourceMeta; ga4: SourceMeta; keywords: SourceMeta }
    indexing: { statusCounts: Record<SmartSitemapStatus, number> }
  }
}

export interface SeriesPoint {
  date: string
  clicks: number | null
  impressions: number | null
  ctr: number | null
  position: number | null
  sessions: number | null
  keyEvents: number | null
}

export interface SmartSitemapPageResult {
  page: SitePageIdentity
  gsc: GscMetrics | null
  ga4: Ga4Metrics | null
  previous: { range: DateRange; gsc: GscMetrics | null; ga4: Ga4Metrics | null }
  series: SeriesPoint[]
  keywords: string[]
  indexing: IndexingSummary
  meta: { range: DateRange; sources: { gsc: SourceMeta; ga4: SourceMeta; keywords: SourceMeta } }
}

export interface InspectionDetails {
  pageUrl: string
  inspectionDate: string
  recordedAt: string
  status: string
  coverageState: string | null
  indexingState: string | null
  verdict: string | null
  robotsTxtState: string | null
  pageFetchState: string | null
  lastCrawlAt: string | null
  googleCanonical: string | null
  userCanonical: string | null
  crawledAs: string | null
  sitemaps: string[]
}

export interface IndexingVariant {
  pageUrl: string
  storedPageUrls: string[]
  status: SmartSitemapStatus
  coverageState: string | null
  trackingActive: boolean
  monitoringEnabled: boolean
  lastInspectedAt: string | null
  inspectionDate: string | null
  nextInspectionAt: string | null
  inspectionFreshness: InspectionFreshness
  latestInspection: InspectionDetails | null
}

export type IndexingHistoryEvent =
  | ({ eventType: "inspection_snapshot"; eventKey: string } & InspectionDetails)
  | {
      eventType: "indexing_change"
      eventKey: string
      recordedAt: string
      pageUrl: string
      beforeStatus: string | null
      afterStatus: string | null
      beforeState: string | null
      afterState: string | null
      changeType: string
    }

export interface SmartSitemapPageIndexingResult {
  pageId: string
  path: string
  current: IndexingSummary
  variants: IndexingVariant[]
  history: IndexingHistoryEvent[]
  pagination: { limit: number; hasNextPage: boolean; nextCursor: string | null }
}

export interface SmartSitemapListParams {
  period: TimePeriodValue
  page: number
  limit: number
  sortBy: SmartSitemapSort
  sortOrder: "asc" | "desc"
  search?: string
  indexingStatuses?: SmartSitemapStatus[]
}

interface ApiEnvelope<T> {
  data: T
  err: boolean
  message: string
}

const STALE_TIME = 5 * 60 * 1000
// Large inventories read every page and its keywords; the API can take tens of seconds.
const REQUEST_TIMEOUT = 120000

function listQueryString(businessId: string, params: SmartSitemapListParams) {
  const search = new URLSearchParams({
    businessId,
    period: params.period,
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    keywords: "count",
  })
  if (params.search) search.set("search", params.search)
  if (params.indexingStatuses?.length) search.set("indexingStatuses", params.indexingStatuses.join(","))
  return search.toString()
}

export function useSmartSitemapList(businessId: string | null, params: SmartSitemapListParams) {
  return useQuery<SmartSitemapListResult>({
    queryKey: ["smart-sitemap", businessId, params],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<SmartSitemapListResult>>(
        `/smart-sitemap?${listQueryString(businessId as string, params)}`,
        "node",
        { timeout: REQUEST_TIMEOUT }
      )
      return res.data
    },
    enabled: Boolean(businessId),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  })
}

export function useSmartSitemapPage(businessId: string | null, pageId: string | null, period: TimePeriodValue) {
  return useQuery<SmartSitemapPageResult>({
    queryKey: ["smart-sitemap-page", businessId, pageId, period],
    queryFn: async () => {
      const search = new URLSearchParams({ businessId: businessId as string, period })
      const res = await api.get<ApiEnvelope<SmartSitemapPageResult>>(
        `/smart-sitemap/pages/${encodeURIComponent(pageId as string)}?${search.toString()}`,
        "node",
        { timeout: REQUEST_TIMEOUT }
      )
      return res.data
    },
    enabled: Boolean(businessId && pageId),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  })
}

export function useSmartSitemapPageIndexing(
  businessId: string | null,
  pageId: string | null,
  period: TimePeriodValue
) {
  return useInfiniteQuery<SmartSitemapPageIndexingResult>({
    queryKey: ["smart-sitemap-page-indexing", businessId, pageId, period],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({ businessId: businessId as string, period, limit: "20" })
      if (typeof pageParam === "string") search.set("cursor", pageParam)
      const res = await api.get<ApiEnvelope<SmartSitemapPageIndexingResult>>(
        `/smart-sitemap/pages/${encodeURIComponent(pageId as string)}/indexing?${search.toString()}`,
        "node",
        { timeout: REQUEST_TIMEOUT }
      )
      return res.data
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: Boolean(businessId && pageId),
    staleTime: STALE_TIME,
  })
}
