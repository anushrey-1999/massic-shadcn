"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetDigitalAdsSchema,
  DigitalAdsApiResponse,
  DigitalAdsRow,
  DigitalAdsMetrics,
} from "@/types/digital-ads-types";

export function useDigitalAds(businessId: string) {
  const platform: ApiPlatform = "python";

  const digitalAdsApi = useApi<DigitalAdsApiResponse>({
    platform,
  });

  const transformToTableRows = useCallback((items: any[]): DigitalAdsRow[] => {
    return items.map((item, index) => ({
      id: `${item.cluster_name || item.cluster}-${index}`,
      cluster_name: item.cluster_name || item.cluster || "",
      opportunity_score: item.opportunity_score ?? item.intent_cluster_opportunity_score ?? 0,
      total_search_volume: item.total_search_volume || 0,
      avg_cpc: item.avg_cpc || 0,
      avg_competition: item.avg_competition ?? item.comp_sum ?? 0,
      business_relevance_score: item.business_relevance_score || 0,
      keywords: item.keywords || [],
      offerings: item.offerings || [],
      cluster: item.cluster_name || item.cluster || "",
      intent_cluster_opportunity_score: item.opportunity_score ?? item.intent_cluster_opportunity_score ?? 0,
      comp_sum: item.avg_competition ?? item.comp_sum ?? 0,
    }));
  }, []);

  const fetchDigitalAds = useCallback(
    async (params: GetDigitalAdsSchema) => {
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      const mapFieldToApiName = (field: string): string => {
        const fieldMap: Record<string, string> = {
          cluster: "cluster_name",
          cluster_name: "cluster_name",
          intent_cluster_opportunity_score: "opportunity_score",
          opportunity_score: "opportunity_score",
          comp_sum: "avg_competition",
          avg_competition: "avg_competition",
        };
        return fieldMap[field] ?? field;
      };

      const percentageFields = new Set(["opportunity_score", "business_relevance_score"]);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const toDecimal = (pct: string) => parseFloat(pct) / 100;

      const normalizePercentageFilter = (filter: { field: string; value: string | string[]; operator: string }) => {
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
        const mappedSort = params.sort.map((sortItem) => ({
          ...sortItem,
          field: mapFieldToApiName(sortItem.field),
        }));
        queryParams.append("sort", JSON.stringify(mappedSort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters.flatMap((filter) => {
          const mappedFilter = {
            field: mapFieldToApiName(filter.field),
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

        const offeringFilter = modifiedFilters.find(
          (f) => f.field === "offerings"
        ) as { value: string | string[] } | undefined;

        if (offeringFilter) {
          const values = Array.isArray(offeringFilter.value)
            ? offeringFilter.value
            : [offeringFilter.value];
          const offeringsValue = values.filter(Boolean).join(",");
          if (offeringsValue) {
            queryParams.append("offerings", offeringsValue);
          }
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const endpoint = `/strategies/digital-ads-opportunities?${queryParams.toString()}`;

      try {
        const response = await digitalAdsApi.execute(endpoint, {
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
        const metrics: DigitalAdsMetrics | null = metricsFirst
          ? {
              total_clusters:
                typeof metricsFirst?.total_clusters === "number"
                  ? metricsFirst.total_clusters
                  : undefined,
              total_ads:
                typeof metricsFirst?.total_ads === "number"
                  ? metricsFirst.total_ads
                  : undefined,
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
        console.error("Error fetching digital ads data:", error);
        throw error;
      }
    },
    [digitalAdsApi, transformToTableRows]
  );

  return {
    fetchDigitalAds,
    loading: digitalAdsApi.loading,
    error: digitalAdsApi.error,
    reset: () => {
      digitalAdsApi.reset();
    },
  };
}
