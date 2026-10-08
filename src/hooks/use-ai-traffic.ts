"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useGoogleDataGate } from "@/hooks/use-business-connections";
import type { TimePeriodValue } from "@/utils/analytics-period";
import type { AnalyticsChartRange } from "@/utils/analytics-chart-grouping";

export interface AITrafficMetrics {
  sessions: number;
  engagedSessions: number;
  engagementRate: number | null;
  goals: number;
  sessionGoalRate: number | null;
}
interface ChannelPeriod {
  allSessions: number;
  ai: AITrafficMetrics;
  organic: AITrafficMetrics;
  aiShare: number | null;
}
export interface AIOverview {
  ranges: AnalyticsChartRange;
  current: ChannelPeriod;
  previous: ChannelPeriod;
  daily: { date: string; aiSessions: number; organicSessions: number }[];
}
export interface AISource {
  name: string;
  source: string;
  share: number | null;
  current: AITrafficMetrics;
  previous: AITrafficMetrics;
}
export interface AISourceAudit extends Omit<AISource, "share"> {
  medium: string;
  channel: string;
  campaign: string;
}
interface AIReports {
  overview: AIOverview;
  sources: {
    ranges: AnalyticsChartRange;
    rows: AISource[];
    audit: AISourceAudit[];
  };
  landing_pages: {
    ranges: AnalyticsChartRange;
    rows: (AITrafficMetrics & { page: string })[];
    rowCount: number;
    offset: number;
    limit: number;
  };
  goals: {
    ranges: AnalyticsChartRange;
    rows: { event: string; goals: number }[];
  };
}
export interface AITrafficMeta {
  fetchedAt: string;
  dataThrough: string;
  timeZone: string | null;
  pagePathScope: string | null;
  scopeRevision: number;
  quality: {
    thresholded: boolean;
    sampled: boolean;
    dataLossFromOtherRow: boolean;
  };
}
interface AIResponse<T> {
  success: boolean;
  data: T;
  meta: AITrafficMeta;
  error?: string;
}

function useAIReport<S extends keyof AIReports>(
  section: S,
  businessUniqueId: string | null,
  period: TimePeriodValue,
  scopeRevision: number,
  enabled: boolean,
  pagination?: { offset: number; limit: number },
) {
  return useQuery<AIResponse<AIReports[S]>, Error>({
    queryKey: [
      "ai-traffic",
      businessUniqueId,
      period,
      scopeRevision,
      section,
      pagination,
    ],
    queryFn: async () => {
      const response = await api.post<AIResponse<AIReports[S]>>(
        "/analytics/ga4/ai-traffic",
        "node",
        { businessUniqueId, period, section, ...pagination },
      );
      if (!response.success)
        throw new Error(response.error || "Unable to load AI Traffic");
      return response;
    },
    enabled: enabled && Boolean(businessUniqueId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (count, error) => {
      const status = (error as Error & { response?: { status?: number } })
        .response?.status;
      return ![400, 401, 403, 404, 409, 422].includes(status || 0) && count < 2;
    },
  });
}

export function useAITraffic(
  businessUniqueId: string | null,
  period: TimePeriodValue,
  scopeRevision: number,
  page: number,
  pageSize: number,
  pagesOpen: boolean,
) {
  const gate = useGoogleDataGate(businessUniqueId, "ga4");
  const overview = useAIReport(
    "overview",
    businessUniqueId,
    period,
    scopeRevision,
    gate.enabled,
  );
  const sources = useAIReport(
    "sources",
    businessUniqueId,
    period,
    scopeRevision,
    gate.enabled,
  );
  const landingPages = useAIReport(
    "landing_pages",
    businessUniqueId,
    period,
    scopeRevision,
    gate.enabled,
    { offset: 0, limit: 10 },
  );
  const expandedPages = useAIReport(
    "landing_pages",
    businessUniqueId,
    period,
    scopeRevision,
    gate.enabled && pagesOpen,
    { offset: page * pageSize, limit: pageSize },
  );
  const goals = useAIReport(
    "goals",
    businessUniqueId,
    period,
    scopeRevision,
    gate.enabled,
  );
  return { gate, overview, sources, landingPages, expandedPages, goals };
}

/** Counts use relative change; rates and shares use percentage-point change. */
export function formatAIChange(
  current: number | null,
  previous: number | null,
  rate = false,
): string {
  if (current === null || previous === null) return "—";
  if (!rate && previous === 0) return current > 0 ? "New" : "0%";
  const delta = rate
    ? (current - previous) * 100
    : ((current - previous) / previous) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: 1 })}${rate ? " pp" : "%"}`;
}
