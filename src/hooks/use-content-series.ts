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

          return percentageFields.has(mappedFilter.field)
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
