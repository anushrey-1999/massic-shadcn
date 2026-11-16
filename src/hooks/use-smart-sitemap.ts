import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { TimePeriodValue } from "@/utils/analytics-period";

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
] as const;

export type SmartSitemapStatus = (typeof SMART_SITEMAP_STATUSES)[number];
export type InspectionFreshness =
  "fresh" | "due" | "overdue" | "pending" | "not_monitored" | "unknown";

export const SMART_SITEMAP_SORTS = [
  "path",
  "indexing.status",
  "gsc.clicks",
  "gsc.impressions",
  "gsc.ctr",
  "gsc.position",
  "ga4.sessions",
  "ga4.keyEvents",
] as const;

export type SmartSitemapSort = (typeof SMART_SITEMAP_SORTS)[number];

export interface GscMetrics {
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface Ga4Metrics {
  sessions: number;
  engagedSessions: number;
  engagementRate: number | null;
  keyEvents: number;
  revenue: number;
}

export interface IndexingSummary {
  status: SmartSitemapStatus;
  /** Google's coverage text for the status, e.g. "Not found (404)". */
  coverageState: string | null;
  /** The variant that stands for the path: bare URL on the business host, else the newest inspected. */
  primaryPageUrl: string | null;
  lastInspectedAt: string | null;
  oldestInspectedAt: string | null;
  nextInspectionAt: string | null;
  inspectionFreshness: InspectionFreshness;
  monitoringEnabled: boolean;
  variantCount: number;
  inspectedVariantCount: number;
}

export interface SourceMeta {
  status:
    "available" | "no_data" | "scope_replacement_pending" | "not_requested";
  dataThrough: string | null;
  ingestionStatus: string | null;
  materialized: boolean;
}

export interface DateRange {
  period: string;
  from: string;
  to: string;
}

export interface SitePageIdentity {
  id: string;
  businessId: string;
  path: string;
  sources: string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface SmartSitemapListPage extends SitePageIdentity {
  gsc: GscMetrics | null;
  ga4: Ga4Metrics | null;
  indexing: IndexingSummary;
}

export interface SmartSitemapListResult {
  pages: SmartSitemapListPage[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  meta: {
    range: DateRange;
    sources: { gsc: SourceMeta; ga4: SourceMeta; keywords: SourceMeta };
    indexing: { statusCounts: Record<SmartSitemapStatus, number> };
  };
}

export interface SeriesPoint {
  date: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  sessions: number | null;
  keyEvents: number | null;
}

export type FirstSeenSource = "gsc" | "ga4" | "discovery";

export interface SmartSitemapPageResult {
  page: SitePageIdentity & {
    firstSeen: { date: string | null; source: FirstSeenSource };
  };
  gsc: GscMetrics | null;
  ga4: Ga4Metrics | null;
  previous: {
    range: DateRange;
    gsc: GscMetrics | null;
    ga4: Ga4Metrics | null;
  };
  series: SeriesPoint[];
  indexing: IndexingSummary;
  meta: {
    range: DateRange;
    sources: { gsc: SourceMeta; ga4: SourceMeta; keywords: SourceMeta };
  };
}

export interface InspectionDetails {
  pageUrl: string;
  inspectionDate: string;
  recordedAt: string;
  status: string;
  coverageState: string | null;
  indexingState: string | null;
  verdict: string | null;
  robotsTxtState: string | null;
  pageFetchState: string | null;
  lastCrawlAt: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
  sitemaps: string[];
}

export interface IndexingVariant {
  pageUrl: string;
  storedPageUrls: string[];
  status: SmartSitemapStatus;
  coverageState: string | null;
  trackingActive: boolean;
  monitoringEnabled: boolean;
  lastInspectedAt: string | null;
  inspectionDate: string | null;
  nextInspectionAt: string | null;
  inspectionFreshness: InspectionFreshness;
  latestInspection: InspectionDetails | null;
}

export type IndexingHistoryEvent =
  | ({ eventType: "inspection_snapshot"; eventKey: string } & InspectionDetails)
  | {
      eventType: "indexing_change";
      eventKey: string;
      recordedAt: string;
      pageUrl: string;
      beforeStatus: string | null;
      afterStatus: string | null;
      beforeState: string | null;
      afterState: string | null;
      changeType: string;
    };

export interface SmartSitemapPageIndexingResult {
  pageId: string;
  path: string;
  current: IndexingSummary;
  variants: IndexingVariant[];
  history: IndexingHistoryEvent[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

export type SortOrder = "asc" | "desc";

/** Inputs shared by the table and tree reads. */
export interface SmartSitemapQueryParams {
  period: TimePeriodValue;
  sortBy: SmartSitemapSort;
  sortOrder: SortOrder;
  search?: string;
  indexingStatuses?: SmartSitemapStatus[];
}

export interface SmartSitemapListParams extends SmartSitemapQueryParams {
  page: number;
  limit: number;
}

export interface FolderIndexing {
  /** Only statuses present in the folder. */
  statusCounts: Partial<Record<SmartSitemapStatus, number>>;
  indexedCount: number;
}

export interface SitemapRollup {
  pageCount: number;
  gsc: GscMetrics | null;
  ga4: Ga4Metrics | null;
  indexing: FolderIndexing;
}

export interface SitemapTreeFolder extends SitemapRollup {
  type: "folder";
  path: string;
  /** Folder path relative to the parent; several segments when single-child folders merge. */
  label: string;
  /** Set when the folder path is itself an inventory page. */
  page: { id: string; path: string } | null;
}

export interface SitemapTreePage extends SmartSitemapListPage {
  type: "page";
  /** The parent folder's own page, pinned first in its level. */
  isFolderIndex?: boolean;
}

export type SitemapTreeNode = SitemapTreeFolder | SitemapTreePage;

export interface SitemapTreeResult {
  parent: SitemapRollup & { path: string };
  nodes: SitemapTreeNode[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  meta: {
    range: DateRange;
    sources: { gsc: SourceMeta; ga4: SourceMeta; keywords: SourceMeta };
    /** `statusCounts` is present on the root level only. */
    indexing: { statusCounts?: Record<SmartSitemapStatus, number> };
  };
}

interface ApiEnvelope<T> {
  data: T;
  err: boolean;
  message: string;
}

const STALE_TIME = 5 * 60 * 1000;
// Matches the API's own read deadline, so a stuck read fails visibly instead of spinning.
const REQUEST_TIMEOUT = 30000;
/** The API caps one keyword-count request at this many page ids. */
const KEYWORD_COUNT_BATCH = 100;

function sitemapQueryString(
  businessId: string,
  params: SmartSitemapQueryParams,
  extra: Record<string, string>,
) {
  const search = new URLSearchParams({
    businessId,
    period: params.period,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    ...extra,
  });
  if (params.search) search.set("search", params.search);
  if (params.indexingStatuses?.length)
    search.set("indexingStatuses", [...params.indexingStatuses].sort().join(","));
  return search.toString();
}

async function getSitemap<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(path, "node", {
    timeout: REQUEST_TIMEOUT,
    signal,
  });
  return res.data;
}

export function useSmartSitemapList(
  businessId: string | null,
  params: SmartSitemapListParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const query = businessId
    ? sitemapQueryString(businessId, params, {
        page: String(params.page),
        limit: String(params.limit),
        keywords: "none",
      })
    : "";
  return useQuery<SmartSitemapListResult>({
    queryKey: ["smart-sitemap", businessId, query],
    queryFn: ({ signal }) => getSitemap(`/smart-sitemap?${query}`, signal),
    enabled: Boolean(businessId) && enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  });
}

export const SITEMAP_TREE_PAGE_SIZE = 50;

/** One folder level; each "show more" appends the next page of that level. */
export function useSmartSitemapTree(
  businessId: string | null,
  params: SmartSitemapQueryParams,
  parent: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const query = businessId
    ? sitemapQueryString(businessId, params, {
        parent,
        limit: String(SITEMAP_TREE_PAGE_SIZE),
        keywords: "none",
      })
    : "";
  return useInfiniteQuery<SitemapTreeResult>({
    queryKey: ["smart-sitemap-tree", businessId, query],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getSitemap(`/smart-sitemap/tree?${query}&page=${pageParam}`, signal),
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.page + 1 : undefined,
    enabled: Boolean(businessId) && enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  });
}

export interface SmartSitemapKeywordCountsResult {
  counts: Record<string, number>;
  meta: { range: DateRange; sources: { keywords: SourceMeta } };
}

/**
 * Keyword counts for rows already on screen. Ids are sorted so re-sorting the same rows
 * reuses the cached counts; pass `enabled: false` while the rows are placeholders.
 * Counts from another period are never shown in place of loading ones.
 */
export function useSmartSitemapKeywordCounts(
  businessId: string | null,
  period: TimePeriodValue,
  pageIds: readonly string[],
  { enabled = true }: { enabled?: boolean } = {},
) {
  const ids = [...new Set(pageIds)].sort().slice(0, KEYWORD_COUNT_BATCH).join(",");
  return useQuery<SmartSitemapKeywordCountsResult>({
    queryKey: ["smart-sitemap-keyword-counts", businessId, period, ids],
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({
        businessId: businessId as string,
        period,
        pageIds: ids,
      });
      return getSitemap(`/smart-sitemap/keyword-counts?${search.toString()}`, signal);
    },
    enabled: Boolean(businessId && ids) && enabled,
    staleTime: STALE_TIME,
  });
}

export function useSmartSitemapPage(
  businessId: string | null,
  pageId: string | null,
  period: TimePeriodValue,
) {
  return useQuery<SmartSitemapPageResult>({
    queryKey: ["smart-sitemap-page", businessId, pageId, period],
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({
        businessId: businessId as string,
        period,
        keywords: "none",
      });
      return getSitemap(
        `/smart-sitemap/pages/${encodeURIComponent(pageId as string)}?${search.toString()}`,
        signal,
      );
    },
    enabled: Boolean(businessId && pageId),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  });
}

export interface SmartSitemapPageKeywordsResult {
  pageId: string;
  path: string;
  keywords: string[];
  meta: { range: DateRange; sources: { keywords: SourceMeta } };
}

export function useSmartSitemapPageKeywords(
  businessId: string | null,
  pageId: string | null,
  period: TimePeriodValue,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<SmartSitemapPageKeywordsResult>({
    queryKey: ["smart-sitemap-page-keywords", businessId, pageId, period],
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({ businessId: businessId as string, period });
      return getSitemap(
        `/smart-sitemap/pages/${encodeURIComponent(pageId as string)}/keywords?${search.toString()}`,
        signal,
      );
    },
    enabled: Boolean(businessId && pageId) && enabled,
    staleTime: STALE_TIME,
  });
}

export function useSmartSitemapPageIndexing(
  businessId: string | null,
  pageId: string | null,
  period: TimePeriodValue,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery<SmartSitemapPageIndexingResult>({
    queryKey: ["smart-sitemap-page-indexing", businessId, pageId, period],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      const search = new URLSearchParams({
        businessId: businessId as string,
        period,
        limit: "20",
      });
      if (typeof pageParam === "string") search.set("cursor", pageParam);
      return getSitemap(
        `/smart-sitemap/pages/${encodeURIComponent(pageId as string)}/indexing?${search.toString()}`,
        signal,
      );
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: Boolean(businessId && pageId) && enabled,
    staleTime: STALE_TIME,
  });
}
