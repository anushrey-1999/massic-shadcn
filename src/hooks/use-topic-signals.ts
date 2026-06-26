"use client";

import { useCallback } from "react";
import type { AxiosError } from "axios";
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

function getAxiosDetail(error: AxiosError): string {
  const data = error.response?.data;
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return "";
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
      try {
        return await getApi.execute(`/strategies/topic-signals?${params.toString()}`, {
          method: "GET",
        });
      } catch (err) {
        const axiosErr = err as AxiosError;
        if (axiosErr?.response?.status === 404) {
          const detail = getAxiosDetail(axiosErr);
          const missingPrerequisite = detail.includes(
            "Successful topics workflow run not found"
          );
          return {
            status: "not_found",
            isNotFound: true,
            missingPrerequisite,
            notFoundDetail: detail,
            metadata: {
              evaluation_month: monthYear,
              workflow: "topic_signals",
            },
            output_data: {
              items: [],
              metrics: [{ total_signals: 0, labels: {} }],
              pagination: {
                page,
                page_size: pageSize,
                fetched: 0,
                total_pages: 1,
              },
              errors: null,
            },
          } satisfies TopicSignalsApiResponse;
        }
        throw err;
      }
    },
    [businessId, getApi]
  );

  const triggerTopicSignals = useCallback(
    async (monthYear?: string, forceRegenerate = false) => {
      const params = new URLSearchParams({ business_id: businessId });
      if (monthYear) params.set("month_year", monthYear);
      if (forceRegenerate) params.set("force_regenerate", "true");
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
