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
    const endpoint = `/strategies/social-channels/landscape?business_id=${businessId}`;

    try {
      const response = await landscapeApi.execute(endpoint, {
        method: "GET",
      });

      let landscapes: LandscapeItem[] = [];

      if (Array.isArray(response?.output_data?.items)) {
        landscapes = response.output_data.items as LandscapeItem[];
      } else if (Array.isArray(response?.output_data?.landscapes)) {
        landscapes = response.output_data.landscapes;
      }

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
