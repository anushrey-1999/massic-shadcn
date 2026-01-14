"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi, api, type ApiPlatform } from "./use-api";
import type { ListReportRunsResponse, ReportRunListItem, ReportRunDetail } from "@/types/report-runs-types";

export interface ListReportRunsParams {
  business_id: string;
  page: number;
  perPage: number;
  sort?: Array<{ field: string; desc: boolean }>;
}

export interface ReportRunsTableResponse {
  data: ReportRunListItem[];
  pageCount: number;
  pagination: {
    page: number;
    page_size: number;
    total: number | null;
  };
}

function getStatusLowercase(status: string | undefined): string {
  return (status || "").toString().toLowerCase();
}

export function useReportRuns() {
  const platform: ApiPlatform = "node";

  const listApi = useApi<ListReportRunsResponse>({
    platform,
  });

  const fetchReportRuns = useCallback(
    async (params: ListReportRunsParams): Promise<ReportRunsTableResponse> => {
      const queryParams = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.perPage),
      });

      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort));
      }

      const endpoint = `/analytics/business/${params.business_id}/report-runs?${queryParams.toString()}`;
      const response = await listApi.execute(endpoint, { method: "GET" });

      const items = Array.isArray(response?.items) ? response.items : [];
      const total = typeof response?.total === "number" ? response.total : null;

      const pageCount = total === null ? 0 : Math.ceil(total / params.perPage);

      return {
        data: items,
        pageCount,
        pagination: {
          page: typeof response?.page === "number" ? response.page : params.page,
          page_size:
            typeof response?.page_size === "number" ? response.page_size : params.perPage,
          total,
        },
      };
    },
    [listApi]
  );

  return {
    fetchReportRuns,
    loading: listApi.loading,
    error: listApi.error,
    reset: listApi.reset,
  };
}

export function useReportRunDetail(params: {
  reportRunId: string | null;
  enabled?: boolean;
  pollingDisabled?: boolean;
  pollingIntervalMs?: number;
}) {
  const platform: ApiPlatform = "node";
  const api = useApi<ReportRunDetail>({ platform });

  const {
    reportRunId,
    enabled = true,
    pollingDisabled = false,
    pollingIntervalMs = 6000
  } = params;

  return useQuery({
    queryKey: ["report-run-detail", reportRunId],
    enabled: enabled && !!reportRunId,
    queryFn: async () => {
      if (!reportRunId) throw new Error("Report run ID is required");

      const endpoint = `/analytics/report-runs/${encodeURIComponent(reportRunId)}`;
      return api.execute(endpoint, { method: "GET" }) as Promise<ReportRunDetail>;
    },
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (pollingDisabled) return false;
      const status = getStatusLowercase(query.state.data?.status);
      return status === "pending" || status === "processing" ? pollingIntervalMs : false;
    },
    staleTime: 0,
  });
}

export interface GenerateReportParams {
  businessId: string;
  period: string;
}

export interface GenerateReportResponse {
  id: string;
  status: string;
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation<GenerateReportResponse, Error, GenerateReportParams>({
    mutationFn: async ({ businessId, period }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      const response = await api.post<GenerateReportResponse>(
        `/analytics/generate-performance-report`,
        "node",
        { businessId, period }
      );

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate report runs list to show the new report
      queryClient.invalidateQueries({
        queryKey: ["report-runs", variables.businessId],
      });
    },
  });
}
