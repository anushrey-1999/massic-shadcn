"use client";

import { useCallback } from "react";
import type { AxiosError } from "axios";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  ThemeScatterApiResponse,
  ThemesApiResponse,
  ThemeRow,
} from "@/types/themes-types";

export function useThemes(businessId: string) {
  const platform: ApiPlatform = "python";

  const themesGetApi = useApi<ThemesApiResponse>({ platform });
  const themesPostApi = useApi<ThemesApiResponse>({ platform });
  const scatterPlotApi = useApi<ThemeScatterApiResponse>({ platform });

  const transformToTableRows = useCallback((items: ThemesApiResponse["output_data"]["items"]): ThemeRow[] => {
    return items.map((item, index) => ({
      ...item,
      id: `${item.theme_name}-${index}`,
      theme_name: item.theme_name,
      origin_offering: item.origin_offering,
      topic_count: item.topic_count,
      offerings: item.offerings || [],
      topics: item.topics || [],
      business_relevance_score: item.business_relevance_score,
      theme_coverage: item.theme_coverage,
    }));
  }, []);

  const fetchThemes = useCallback(async (page = 1, pageSize = 100) => {
    const endpoint = `/strategies/themes?business_id=${businessId}&page=${page}&page_size=${pageSize}`;

    try {
      const response = await themesGetApi.execute(endpoint, { method: "GET" });
      const items = response?.output_data?.items || [];
      const metrics = response?.output_data?.metrics?.[0] ?? null;

      return {
        data: transformToTableRows(items),
        metadata: response?.metadata,
        metrics,
        hasData: items.length > 0,
        isNotFound: false,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr?.response?.status === 404) {
        return {
          data: [] as ThemeRow[],
          metadata: undefined,
          metrics: null,
          hasData: false,
          isNotFound: true,
        };
      }
      throw err;
    }
  }, [businessId, themesGetApi, transformToTableRows]);

  const triggerThemes = useCallback(async () => {
    const endpoint = `/strategies/themes?business_id=${businessId}`;
    await themesPostApi.execute(endpoint, { method: "POST" });
  }, [businessId, themesPostApi]);

  const fetchScatterPlot = useCallback(async () => {
    const endpoint = `/tools/topics/scatter-plot?business_id=${businessId}`;
    return scatterPlotApi.execute(endpoint, { method: "GET" });
  }, [businessId, scatterPlotApi]);

  return {
    fetchThemes,
    fetchScatterPlot,
    triggerThemes,
    loading: themesGetApi.loading,
    error: themesGetApi.error,
  };
}
