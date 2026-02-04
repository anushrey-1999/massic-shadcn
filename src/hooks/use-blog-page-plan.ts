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
      id: item.page_id || item.keyword || `web-page-${index}`,
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

      if (params.sort && params.sort.length > 0) {
        const mappedSort = params.sort
          .filter(sortItem => sortItem.field !== 'actions') // Exclude actions from backend sort
          .map(sortItem => {
            let field = sortItem.field;
            if (field === 'sub_topics_count') {
              field = 'total_supporting_keywords_count';
            }
            return { ...sortItem, field };
          });
        if (mappedSort.length > 0) {
          queryParams.append("sort", JSON.stringify(mappedSort));
        }
      }

      if (params.filters && params.filters.length > 0) {
        queryParams.append("filters", JSON.stringify(params.filters));
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

      const endpoint = `/client/create-blog-page-plan?${queryParams.toString()}`;

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
                typeof metricsFirst?.total_supporting_keywords === "number"
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
      const endpoint = `/client/create-blog-page-plan?business_id=${businessId}&page=1&page_size=1000`;
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
