"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetTvRadioAdsSchema,
  TvRadioAdsApiResponse,
  TvRadioAdConceptRow,
  TvRadioAdsApiItem,
  TvRadioAdsMetrics,
} from "@/types/tv-radio-ads-types";

function getAvgCpc(item: TvRadioAdsApiItem): number {
  const candidates = [
    item.roles?.problem_keyword_info?.cpc_avg,
    item.roles?.solution_keyword_info?.cpc_avg,
    item.roles?.proof_keyword_info?.cpc_avg,
    item.roles?.action_keyword_info?.cpc_avg,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (candidates.length === 0) return 0;
  return candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
}

function getOppScore(item: TvRadioAdsApiItem): number {
  const score =
    item.channel === "Radio"
      ? item.scores?.rcas
      : item.scores?.tcas;

  if (typeof score === "number" && Number.isFinite(score)) return score;

  const fallback = item.channel === "Radio" ? item.scores?.avg_radio_affinity : item.scores?.avg_tv_affinity;
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;

  return 0;
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function normalizeTvRadioType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "tv") return "tv";
  if (normalized === "radio") return "radio";
  return value;
}

function mapTvRadioApiField(field: string): string {
  switch (field) {
    case "subtopic":
      return "display_name";
    case "type":
      return "channel";
    case "relevance":
      return "avg_business_relevance";
    case "volume":
      return "total_search_volume";
    default:
      return field;
  }
}

export function useTvRadioAds(_businessId: string) {
  const platform: ApiPlatform = "python";

  const api = useApi<TvRadioAdsApiResponse>({ platform });

  const transformToTableRows = useCallback((items: TvRadioAdsApiItem[]): TvRadioAdConceptRow[] => {
    return (items || []).map((item) => {
      const totals = {
        total_search_volume: Number(item.supporting_data?.totals?.total_search_volume || 0),
        avg_business_relevance: Number(item.supporting_data?.totals?.avg_business_relevance || 0),
        avg_competition: Number(item.supporting_data?.totals?.avg_competition || 0),
      };

      return {
        id: String(item.ad_concept_id || ""),
        subtopic: String(item.display_name || ""),
        type: item.channel,
        status: item.status || undefined,
        opp_score: getOppScore(item),
        volume: totals.total_search_volume,
        avg_cpc: getAvgCpc(item),
        comp: totals.avg_competition,
        comp_level: String(item.supporting_data?.metadata?.score_level || ""),
        relevance: totals.avg_business_relevance,

        problem_head_term: item.roles?.problem_keyword_info?.head_term || undefined,
        solution_head_term: item.roles?.solution_keyword_info?.head_term || undefined,
        proof_head_term: item.roles?.proof_keyword_info?.head_term || undefined,
        action_head_term: item.roles?.action_keyword_info?.head_term || undefined,

        problem_keywords: toArray(item.supporting_data?.by_role_keywords?.problem),
        solution_keywords: toArray(item.supporting_data?.by_role_keywords?.solution),
        proof_keywords: toArray(item.supporting_data?.by_role_keywords?.proof),
        action_keywords: toArray(item.supporting_data?.by_role_keywords?.action),

        totals,
      };
    });
  }, []);

  const fetchTvRadioAds = useCallback(
    async (params: GetTvRadioAdsSchema) => {
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) queryParams.append("search", params.search);

      if (params.sort && params.sort.length > 0) {
        const modifiedSort = params.sort.map((item) => ({
          ...item,
          field: mapTvRadioApiField(item.field),
        }));

        queryParams.append("sort", JSON.stringify(modifiedSort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters.map((filter) => ({
          field: mapTvRadioApiField(filter.field),
          value:
            mapTvRadioApiField(filter.field) === "channel"
              ? Array.isArray(filter.value)
                ? filter.value.map(normalizeTvRadioType)
                : normalizeTvRadioType(String(filter.value))
              : filter.value,
          operator: filter.operator,
        }));

        if (modifiedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(modifiedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const endpoint = `/client/ad-concept-generator?${queryParams.toString()}`;

      const response = await api.execute(endpoint, { method: "GET" });

      const items = response?.output_data?.items || [];
      const rows = transformToTableRows(items);
      const pagination = response?.output_data?.pagination;

      const pageCount = Number(pagination?.total_pages || 0);

      const metricsMaybe =
        (response as any)?.output_data?.metrics ?? (response as any)?.metrics;
      const metricsFirst = Array.isArray(metricsMaybe) ? metricsMaybe[0] : metricsMaybe;
      const metrics: TvRadioAdsMetrics | null = metricsFirst
        ? {
            total_ads:
              typeof metricsFirst?.total_ads === "number" ? metricsFirst.total_ads : 0,
          }
        : null;

      return {
        data: rows,
        pageCount,
        pagination,
        metadata: response?.metadata,
        metrics,
      };
    },
    [api, transformToTableRows]
  );

  return {
    fetchTvRadioAds,
    loading: api.loading,
    error: api.error,
    reset: () => {
      api.reset();
    },
  };
}
