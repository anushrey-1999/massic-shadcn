"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetWebPageSchema,
  WebPageApiResponse,
  WebPageRow,
  WebPageCounts,
  WebPageItem,
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
      ...item,
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
        const sortBy = params.sort[0].id;
        const sortOrder = params.sort[0].desc ? "desc" : "asc";
        queryParams.append("sort_by", sortBy);
        queryParams.append("sort_order", sortOrder);
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
