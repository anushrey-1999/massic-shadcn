"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetWebPageSchema,
  WebPageApiResponse,
  WebPageRow,
  WebPageCounts,
  WebPageItem,
  WebPageMetrics,
} from "@/types/web-page-types";

export function useBlogPagePlan(businessId: string) {
  const platform: ApiPlatform = "python";

  const webPageApi = useApi<WebPageApiResponse>({
    platform,
  });

  const countsApi = useApi<WebPageCounts>({
    platform,
  });

  const transformToTableRows = useCallback((items: WebPageItem[]): WebPageRow[] => {
    return items.map((item, index) => ({
      id: item.page_id || item.cluster_name || item.keyword || `web-page-${index}`,
      cluster_name: item.cluster_name || item.keyword || "",
      sub_topics_count: Array.isArray(item.supporting_keywords)
        ? item.supporting_keywords.length
        : 0,
      ...item,
      offerings: item.offerings || [],
    }));
  }, []);

  const fetchWebPages = useCallback(
    async (params: GetWebPageSchema) => {
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      const getField = (filter: GetWebPageSchema["filters"][number]) => {
        if ("field" in filter && typeof (filter as { field?: string }).field === "string") {
          return (filter as { field?: string }).field;
        }
        if (typeof filter.id === "string" && filter.id.length > 0) {
          return filter.id;
        }
        if (typeof filter.filterId === "string" && filter.filterId.length > 0) {
          return filter.filterId;
        }
        return undefined;
      };

      const mapFieldToApiName = (field: string): string => {
        const fieldMap: Record<string, string> = {
          sub_topics_count: "supporting_keyword_count",
        };
        return fieldMap[field] ?? field;
      };

      const percentageFields = new Set(["business_relevance_score", "page_opportunity_score"]);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const toDecimal = (pct: string) => parseFloat(pct) / 100;

      const normalizePercentageFilter = (filter: { field: string; value: string | string[]; operator: string }) => {
        const value = filter.value;
        const operator = filter.operator;

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
        const mappedSort = params.sort
          .filter(sortItem => sortItem.field !== 'actions') // Exclude actions from backend sort
          .map(sortItem => ({
            ...sortItem,
            field: mapFieldToApiName(sortItem.field),
          }));
        if (mappedSort.length > 0) {
          queryParams.append("sort", JSON.stringify(mappedSort));
        }
      }

      if (params.filters && params.filters.length > 0) {
        const mappedFilters = params.filters
          .flatMap((filter) => {
            const field = getField(filter);
            if (!field) return [];

            const mappedFilter = {
              field: mapFieldToApiName(field),
              value: filter.value,
              operator: filter.operator,
            };

            return percentageFields.has(mappedFilter.field)
              ? normalizePercentageFilter(mappedFilter)
              : [mappedFilter];
          });

        if (mappedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(mappedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const offeringFilter = params.filters?.find((filter) => {
        return filter.id === "offerings" || filter.filterId === "offerings";
      });

      if (offeringFilter) {
        const values = Array.isArray(offeringFilter.value)
          ? offeringFilter.value
          : [offeringFilter.value];
        const offeringsValue = values.filter(Boolean).join(",");

        if (offeringsValue) {
          queryParams.append("offerings", offeringsValue);
        }
      }

      const endpoint = `/strategies/webpages?${queryParams.toString()}`;

      try {
        const response = await webPageApi.execute(endpoint, {
          method: "GET",
        });

        const items = response?.output_data?.items || [];
        const flatRows = transformToTableRows(items);

        const pagination = response?.output_data?.pagination;

        let pageCount = 0;
        if (pagination?.total_pages) {
          pageCount = pagination.total_pages;
        } else if (pagination?.total_count) {
          pageCount = Math.ceil(pagination.total_count / params.perPage);
        } else {
          pageCount = Math.ceil(flatRows.length / params.perPage);
        }

        const metricsMaybe =
          (response as any)?.output_data?.metrics ?? (response as any)?.metrics;
        const metricsFirst = Array.isArray(metricsMaybe)
          ? metricsMaybe[0]
          : metricsMaybe;
        const metrics: WebPageMetrics | null = metricsFirst
          ? {
            total_pages:
              typeof metricsFirst?.total_pages === "number"
                ? metricsFirst.total_pages
                : 0,
            total_supporting_keywords:
              typeof metricsFirst?.total_keywords === "number"
                ? metricsFirst.total_keywords
                : typeof metricsFirst?.total_supporting_keywords === "number"
                  ? metricsFirst.total_supporting_keywords
                  : 0,
          }
          : null;

        return {
          data: flatRows,
          pageCount,
          pagination: pagination || {
            page: params.page,
            page_size: params.perPage,
            fetched: flatRows.length,
            total_count: flatRows.length,
            status: "success" as const,
          },
          metadata: response?.metadata,
          metrics,
        };
      } catch (error) {
        console.error("Error fetching web page data:", error);
        throw error;
      }
    },
    [webPageApi, transformToTableRows]
  );

  const fetchWebPageCounts = useCallback(async () => {
    try {
      const endpoint = `/strategies/webpages?business_id=${businessId}&page=1&page_size=1000`;
      const response = await webPageApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];

      return {
        // Will be populated based on actual filter needs
      };
    } catch (error) {
      console.error("Error fetching web page counts:", error);
      return {};
    }
  }, [businessId, webPageApi]);

  return {
    fetchWebPages,
    fetchWebPageCounts,
    loading: webPageApi.loading || countsApi.loading,
    error: webPageApi.error || countsApi.error,
    reset: () => {
      webPageApi.reset();
      countsApi.reset();
    },
  };
}
