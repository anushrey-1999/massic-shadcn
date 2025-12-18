"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetSocialSchema,
  SocialApiResponse,
  SocialRow,
  SocialCounts,
  SocialItem,
} from "@/types/social-types";

export function useSocial(businessId: string) {
  const platform: ApiPlatform = "python";

  const socialApi = useApi<SocialApiResponse>({
    platform,
  });

  const countsApi = useApi<SocialCounts>({
    platform,
  });

  const transformToTableRows = useCallback((items: SocialItem[]): SocialRow[] => {
    return items.map((item, index) => ({
      id: item.id || `social-${index}`,
      channel_name: item.channel_name || "",
      campaign_name: item.campaign_name || "",
      campaign_relevance: item.campaign_relevance || 0,
      tactics: item.tactics || [],
      ...item,
    }));
  }, []);

  const fetchSocial = useCallback(
    async (params: GetSocialSchema) => {
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

      if (params.channel_name) {
        queryParams.append("channel_name", params.channel_name);
      }

      const endpoint = `/client/channel-analyzer?${queryParams.toString()}`;

      try {
        const response = await socialApi.execute(endpoint, {
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
        console.error("Error fetching social data:", error);
        throw error;
      }
    },
    [socialApi, transformToTableRows]
  );

  const fetchSocialCounts = useCallback(async () => {
    try {
      const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=1000`;
      const response = await socialApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];
      
      return {
        // Will be populated based on actual filter needs
      };
    } catch (error) {
      console.error("Error fetching social counts:", error);
      return {};
    }
  }, [businessId, socialApi]);

  const fetchChannels = useCallback(async () => {
    try {
      const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=1000`;
      const response = await socialApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];
      const uniqueChannels = Array.from(
        new Set(items.map((item: SocialItem) => item.channel_name).filter(Boolean))
      ).sort() as string[];
      
      return uniqueChannels;
    } catch (error) {
      console.error("Error fetching channels:", error);
      return [];
    }
  }, [businessId, socialApi]);

  return {
    fetchSocial,
    fetchSocialCounts,
    fetchChannels,
    loading: socialApi.loading || countsApi.loading,
    error: socialApi.error || countsApi.error,
    reset: () => {
      socialApi.reset();
      countsApi.reset();
    },
  };
}
