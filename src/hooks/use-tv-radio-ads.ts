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
  // New API fields (item-level)
  if (typeof item.cas_score === "number" && Number.isFinite(item.cas_score)) return item.cas_score;
  if (typeof item.avg_channel_affinity === "number" && Number.isFinite(item.avg_channel_affinity)) return item.avg_channel_affinity;

  // Legacy fallback
  const legacyScore = item.channel === "Radio" ? item.scores?.rcas : item.scores?.tcas;
  if (typeof legacyScore === "number" && Number.isFinite(legacyScore)) return legacyScore;

  const legacyFallback = item.channel === "Radio" ? item.scores?.avg_radio_affinity : item.scores?.avg_tv_affinity;
  if (typeof legacyFallback === "number" && Number.isFinite(legacyFallback)) return legacyFallback;

  return 0;
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function normalizeTvRadioType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "tv") return "TV";
  if (normalized === "radio") return "Radio";
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
    case "opp_score":
      return "cas_score";
    case "volume":
      return "supporting_data.totals.total_search_volume";
    case "total_search_volume":
      return "supporting_data.totals.total_search_volume";
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

      const percentageFields = new Set([
        "avg_business_relevance",
        "cas_score",
      ]);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const toDecimal = (pct: string) => parseFloat(pct) / 100;

      const normalizePercentageFilter = (filter: {
        field: string;
        value: string | string[];
        operator: string;
      }) => {
        const { value, operator } = filter;

        if (operator === "isBetween" && Array.isArray(value)) {
          const [minValue, maxValue] = value;
          const minNum = toDecimal(minValue);
          const maxNum = toDecimal(maxValue);

          if (Number.isNaN(minNum) || Number.isNaN(maxNum)) {
            return [filter];
          }

          return [
            {
              ...filter,
              operator: "gte",
              value: String(clamp(minNum - 0.005)),
            },
            {
              ...filter,
              operator: "lte",
              value: String(clamp(maxNum + 0.005)),
            },
          ];
        }

        if ((operator === "eq" || operator === "ne") && !Array.isArray(value)) {
          const num = toDecimal(value);
          if (Number.isNaN(num)) return [filter];

          if (operator === "eq") {
            return [
              {
                ...filter,
                operator: "gte",
                value: String(clamp(num - 0.005)),
              },
              {
                ...filter,
                operator: "lte",
                value: String(clamp(num + 0.005)),
              },
            ];
          }

          return [{ ...filter, value: String(num) }];
        }

        if (operator === "gte" && !Array.isArray(value)) {
          const num = toDecimal(value);
          if (Number.isNaN(num)) return [filter];
          return [{ ...filter, value: String(clamp(num - 0.005)) }];
        }

        if (operator === "lte" && !Array.isArray(value)) {
          const num = toDecimal(value);
          if (Number.isNaN(num)) return [filter];
          return [{ ...filter, value: String(clamp(num + 0.005)) }];
        }

        if (!Array.isArray(value)) {
          const num = toDecimal(value);
          return Number.isNaN(num) ? [filter] : [{ ...filter, value: String(num) }];
        }

        return [filter];
      };

      if (params.sort && params.sort.length > 0) {
        const modifiedSort = params.sort.map((item) => ({
          ...item,
          field: mapTvRadioApiField(item.field),
        }));

        queryParams.append("sort", JSON.stringify(modifiedSort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters.flatMap((filter) => {
          const apiField = mapTvRadioApiField(filter.field);
          const mappedFilter = {
            field: apiField,
            value:
              apiField === "channel"
                ? Array.isArray(filter.value)
                  ? filter.value.map(normalizeTvRadioType)
                  : normalizeTvRadioType(String(filter.value))
                : filter.value,
            operator: filter.operator,
          };

          return percentageFields.has(apiField)
            ? normalizePercentageFilter(mappedFilter)
            : [mappedFilter];
        });

        if (modifiedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(modifiedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const endpoint = `/strategies/ad-concepts?${queryParams.toString()}`;

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
