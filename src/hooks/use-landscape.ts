"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  LandscapeApiResponse,
  LandscapeRow,
  LandscapeItem,
} from "@/types/landscape-types";

export function useLandscape(businessId: string) {
  const platform: ApiPlatform = "python";

  const landscapeApi = useApi<LandscapeApiResponse>({
    platform,
  });

  const transformToTableRows = useCallback((landscapes: LandscapeItem[]): LandscapeRow[] => {
    return landscapes.map((item, index) => ({
      id: `landscape-${index}-${item.domain || index}`,
      url: item.domain || "",
      frequency: item.frequency || 0,
    }));
  }, []);

  const fetchLandscape = useCallback(async () => {
    const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=10`;

    try {
      const response = await landscapeApi.execute(endpoint, {
        method: "GET",
      });

      // Try different possible paths for landscapes data
      let landscapes: LandscapeItem[] = [];
      
      if (response?.output_data?.landscapes) {
        landscapes = response.output_data.landscapes;
      } else if (response?.landscapes) {
        landscapes = response.landscapes;
      } else if (response?.output_data?.items) {
        // If landscapes is nested in items, try to find it
        const items = response.output_data.items;
        if (Array.isArray(items) && items.length > 0 && items[0].landscapes) {
          landscapes = items[0].landscapes;
        }
      }

      console.log("Landscape API Response:", response);
      console.log("Extracted landscapes:", landscapes);

      const flatRows = transformToTableRows(landscapes);

      return {
        data: flatRows,
        metadata: response?.metadata,
      };
    } catch (error) {
      console.error("Error fetching landscape data:", error);
      throw error;
    }
  }, [businessId, landscapeApi, transformToTableRows]);

  return {
    fetchLandscape,
    loading: landscapeApi.loading,
    error: landscapeApi.error,
    reset: () => {
      landscapeApi.reset();
    },
  };
}
