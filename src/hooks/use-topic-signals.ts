"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type { TopicSignalsApiResponse } from "@/types/topic-signals-types";
import type { ExtendedColumnFilter } from "@/types/data-table-types";
import type { TopicSignalRow } from "@/types/topic-signals-types";

interface FetchTopicSignalsParams {
  monthYear?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: Array<{ field: string; desc: boolean }>;
  filters?: ExtendedColumnFilter<TopicSignalRow>[];
  joinOperator?: "and" | "or";
}

export function useTopicSignals(businessId: string) {
  const platform: ApiPlatform = "python";
  const getApi = useApi<TopicSignalsApiResponse>({ platform });
  const postApi = useApi<TopicSignalsApiResponse>({ platform });

  const fetchTopicSignals = useCallback(
    async ({
      monthYear,
      page = 1,
      pageSize = 100,
      search,
      sort,
      filters,
      joinOperator = "and",
    }: FetchTopicSignalsParams = {}) => {
      const params = new URLSearchParams({
        business_id: businessId,
        page: String(page),
        page_size: String(pageSize),
      });
      if (monthYear) params.set("month_year", monthYear);
      if (search?.trim()) params.set("search", search.trim());
      if (sort?.length) params.set("sort", JSON.stringify(sort));
      if (filters?.length) {
        params.set(
          "filters",
          JSON.stringify(
            filters.map((filter) => ({
              ...filter,
              joinOperator,
            }))
          )
        );
      }
      return getApi.execute(`/strategies/topic-signals?${params.toString()}`, {
        method: "GET",
      });
    },
    [businessId, getApi]
  );

  const triggerTopicSignals = useCallback(
    async (monthYear?: string) => {
      const params = new URLSearchParams({ business_id: businessId });
      if (monthYear) params.set("month_year", monthYear);
      return postApi.execute(`/strategies/topic-signals?${params.toString()}`, {
        method: "POST",
      });
    },
    [businessId, postApi]
  );

  return {
    fetchTopicSignals,
    triggerTopicSignals,
    loading: getApi.loading || postApi.loading,
    error: getApi.error || postApi.error,
  };
}
