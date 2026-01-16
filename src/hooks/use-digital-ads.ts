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
      id: `${item.cluster}-${index}`,
      cluster: item.cluster || "",
      intent_cluster_opportunity_score: item.intent_cluster_opportunity_score || 0,
      total_search_volume: item.total_search_volume || 0,
      avg_cpc: item.avg_cpc || 0,
      comp_sum: item.comp_sum || 0,
      business_relevance_score: item.business_relevance_score || 0,
      keywords: item.keywords || [],
      offerings: item.offerings || [],
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

      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters.map((filter) => ({
          field: filter.field,
          value: filter.value,
          operator: filter.operator,
        }));

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

      const endpoint = `/client/digital-ads-opportunity-scorer?${queryParams.toString()}`;

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
