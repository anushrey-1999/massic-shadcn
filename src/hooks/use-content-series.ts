"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  ContentSeriesApiItem,
  ContentSeriesApiResponse,
  ContentSeriesMetrics,
  ContentSeriesRow,
  GetContentSeriesSchema,
} from "@/types/content-series-types";

export const NO_CONTENT_SERIES_CODE = "NO_CONTENT_SERIES";

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mapContentSeriesApiField(field: string): string {
  switch (field) {
    case "id":
      return "content_series_id";
    case "relevance":
    case "business_relevance_score":
      return "br_score";
    case "volume":
    case "total_search_volume":
      return "search_volume";
    default:
      return field;
  }
}

export function isNoContentSeriesError(error: unknown): boolean {
  const anyError = error as any;
  return anyError?.code === NO_CONTENT_SERIES_CODE || anyError?.response?.status === 404;
}

export function useContentSeries(_businessId: string) {
  const platform: ApiPlatform = "python";
  const api = useApi<ContentSeriesApiResponse>({ platform });

  const transformToTableRows = useCallback((items: ContentSeriesApiItem[]): ContentSeriesRow[] => {
    return (items || []).map((item, index) => ({
      id: String(item.content_series_id || `content-series-${index}`),
      title: String(item.title || ""),
      cluster_name: String(item.cluster_name || ""),
      intent: String(item.intent || ""),
      final_score: toNumber(item.final_score),
      search_volume: toNumber(item.search_volume),
      br_score: toNumber(item.br_score),
      signal_score: toNumber(item.signal_score),
      tension_score: toNumber(item.tension_score),
      intent_score: toNumber(item.intent_score),
      signals: toStringArray(item.signals),
      tensions: toStringArray(item.tensions),
      status: item.status ?? null,
    }));
  }, []);

  const fetchContentSeries = useCallback(
    async (params: GetContentSeriesSchema) => {
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) queryParams.append("search", params.search);

      const percentageFields = new Set([
        "final_score",
        "br_score",
        "signal_score",
        "tension_score",
        "intent_score",
      ]);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const toDecimal = (pct: string) => parseFloat(pct) / 100;

      const RELEVANCE_BANDS: Record<string, { min: number; max: number }> = {
        low: { min: 0, max: 25 },
        medium: { min: 26, max: 50 },
        high: { min: 51, max: 100 },
      };

      const expandRelevanceFilter = (filter: {
        field: string;
        value: string | string[];
        operator: string;
      }) => {
        const levels = (Array.isArray(filter.value) ? filter.value : [filter.value])
          .map((v) => String(v).toLowerCase())
          .filter((v) => v in RELEVANCE_BANDS);
        if (levels.length === 0 || levels.length === Object.keys(RELEVANCE_BANDS).length) return [];
        const minPct = Math.min(...levels.map((l) => RELEVANCE_BANDS[l].min));
        const maxPct = Math.max(...levels.map((l) => RELEVANCE_BANDS[l].max));
        const result: { field: string; value: string | string[]; operator: string }[] = [];
        if (minPct > 0) result.push({ ...filter, operator: "gte", value: String(clamp(toDecimal(String(minPct)) - 0.005)) });
        if (maxPct < 100) result.push({ ...filter, operator: "lte", value: String(clamp(toDecimal(String(maxPct)) + 0.005)) });
        return result;
      };

      const volumeFields = new Set(["search_volume"]);

      const parseVolumeValue = (raw: string): number => {
        const s = raw.trim().toLowerCase();
        if (s.endsWith("m")) return parseFloat(s) * 1_000_000;
        if (s.endsWith("k")) return parseFloat(s) * 1_000;
        return parseFloat(s);
      };

      const normalizeVolumeFilter = (filter: {
        field: string;
        value: string | string[];
        operator: string;
      }) => {
        const { value, operator } = filter;
        const parseOne = (v: string) => {
          const n = parseVolumeValue(v);
          return Number.isNaN(n) ? null : String(Math.round(n));
        };
        if (operator === "isBetween" && Array.isArray(value)) {
          const [minVal, maxVal] = value;
          const result: { field: string; value: string | string[]; operator: string }[] = [];
          const parsedMin = minVal !== "" && minVal !== undefined ? parseOne(minVal) : null;
          const parsedMax = maxVal !== "" && maxVal !== undefined ? parseOne(maxVal) : null;
          if (!parsedMin && !parsedMax) return [filter];
          if (parsedMin) result.push({ ...filter, operator: "gte", value: parsedMin });
          if (parsedMax) result.push({ ...filter, operator: "lte", value: parsedMax });
          return result;
        }
        if (!Array.isArray(value) && value !== "") {
          const parsed = parseOne(value);
          return parsed ? [{ ...filter, value: parsed }] : [filter];
        }
        return [filter];
      };

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

          if (Number.isNaN(minNum) || Number.isNaN(maxNum)) return [filter];

          return [
            { ...filter, operator: "gte", value: String(clamp(minNum - 0.005)) },
            { ...filter, operator: "lte", value: String(clamp(maxNum + 0.005)) },
          ];
        }

        if ((operator === "eq" || operator === "ne") && !Array.isArray(value)) {
          const num = toDecimal(value);
          if (Number.isNaN(num)) return [filter];

          if (operator === "eq") {
            return [
              { ...filter, operator: "gte", value: String(clamp(num - 0.005)) },
              { ...filter, operator: "lte", value: String(clamp(num + 0.005)) },
            ];
          }

          return [{ ...filter, value: String(num) }];
        }

        if (operator === "gte" && !Array.isArray(value)) {
          const num = toDecimal(value);
          return Number.isNaN(num) ? [filter] : [{ ...filter, value: String(clamp(num - 0.005)) }];
        }

        if (operator === "lte" && !Array.isArray(value)) {
          const num = toDecimal(value);
          return Number.isNaN(num) ? [filter] : [{ ...filter, value: String(clamp(num + 0.005)) }];
        }

        if (!Array.isArray(value)) {
          const num = toDecimal(value);
          return Number.isNaN(num) ? [filter] : [{ ...filter, value: String(num) }];
        }

        return [filter];
      };

      if (params.sort && params.sort.length > 0) {
        const mappedSort = params.sort.map((sortItem) => ({
          ...sortItem,
          field: mapContentSeriesApiField(sortItem.field),
        }));
        queryParams.append("sort", JSON.stringify(mappedSort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters.flatMap((filter) => {
          const mappedFilter = {
            field: mapContentSeriesApiField(filter.field),
            value: filter.value,
            operator: filter.operator,
          };

          if (mappedFilter.field === "br_score" && mappedFilter.operator === "inArray") {
            return expandRelevanceFilter(mappedFilter);
          }
          if (percentageFields.has(mappedFilter.field)) {
            return normalizePercentageFilter(mappedFilter);
          }
          if (volumeFields.has(mappedFilter.field)) {
            return normalizeVolumeFilter(mappedFilter);
          }
          return [mappedFilter];
        });

        if (modifiedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(modifiedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      try {
        const response = await api.execute(`/strategies/content-series?${queryParams.toString()}`, {
          method: "GET",
        });

        const items = response?.output_data?.items || [];
        const rows = transformToTableRows(items);
        const pagination = response?.output_data?.pagination;
        const pageCount = Number(
          pagination?.total_pages ||
          (pagination?.total_count ? Math.ceil(pagination.total_count / params.perPage) : 0)
        );

        const metricsMaybe = response?.output_data?.metrics;
        const metricsFirst = Array.isArray(metricsMaybe) ? metricsMaybe[0] : metricsMaybe;
        const metrics: ContentSeriesMetrics = {
          total_cards:
            typeof metricsFirst?.total_cards === "number"
              ? metricsFirst.total_cards
              : typeof pagination?.total_count === "number"
                ? pagination.total_count
                : rows.length,
          total_with_title:
            typeof metricsFirst?.total_with_title === "number"
              ? metricsFirst.total_with_title
              : undefined,
        };

        return {
          data: rows,
          pageCount,
          pagination,
          metadata: response?.metadata,
          metrics,
        };
      } catch (error: any) {
        if (error?.response?.status === 404) {
          const noContentError = new Error("No content series generated yet");
          (noContentError as any).code = NO_CONTENT_SERIES_CODE;
          throw noContentError;
        }
        throw error;
      }
    },
    [api, transformToTableRows]
  );

  const generateContentSeries = useCallback(
    async (businessId: string) => {
      const queryParams = new URLSearchParams({ business_id: businessId });
      return api.execute(`/strategies/content-series?${queryParams.toString()}`, {
        method: "POST",
      });
    },
    [api]
  );

  return {
    fetchContentSeries,
    generateContentSeries,
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
