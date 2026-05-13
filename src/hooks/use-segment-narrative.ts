"use client";

import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type SegmentNarrativeStatus =
  | "success"
  | "error"
  | "pending"
  | "processing"
  | string;

export interface SegmentNarrativeResponse {
  status?: SegmentNarrativeStatus;
  message?: string;
  output_data?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export const SEGMENT_NARRATIVE_QUERY_KEY = "segment-narrative";

function getStatusLowercase(data: SegmentNarrativeResponse | null | undefined): string {
  return (data?.status || "").toString().toLowerCase();
}

export function isSegmentNarrativeNotFound(error: unknown): boolean {
  const anyError = error as any;
  return anyError?.response?.status === 404;
}

export function useSegmentNarrativeContentQuery(params: {
  businessId: string;
  contentSeriesId: string;
  enabled?: boolean;
  pollingDisabled?: boolean;
  pollingIntervalMs?: number;
}) {
  const api = useApi({ platform: "python" });
  const queryClient = useQueryClient();
  const {
    businessId,
    contentSeriesId,
    enabled = true,
    pollingDisabled = false,
    pollingIntervalMs = 6000,
  } = params;

  return useQuery({
    queryKey: [SEGMENT_NARRATIVE_QUERY_KEY, businessId, contentSeriesId],
    enabled: enabled && !!businessId && !!contentSeriesId,
    queryFn: async () => {
      const endpoint = `/content/segment-narrative?business_id=${encodeURIComponent(
        businessId
      )}&content_series_id=${encodeURIComponent(contentSeriesId)}`;

      try {
        return await api.execute(endpoint, { method: "GET" }) as SegmentNarrativeResponse;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const cached = queryClient.getQueryData<SegmentNarrativeResponse>([
            SEGMENT_NARRATIVE_QUERY_KEY,
            businessId,
            contentSeriesId,
          ]);
          const cachedStatus = getStatusLowercase(cached);
          if (cachedStatus === "pending" || cachedStatus === "processing") {
            return cached;
          }

          return null;
        }
        throw err;
      }
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (pollingDisabled) return false;
      const status = getStatusLowercase(query.state.data as SegmentNarrativeResponse | null | undefined);
      return status === "pending" || status === "processing" ? pollingIntervalMs : false;
    },
    staleTime: 0,
  });
}

export function useSegmentNarrativeActions() {
  const api = useApi({ platform: "python" });
  const queryClient = useQueryClient();

  const getContent = async (businessId: string, contentSeriesId: string) => {
    const endpoint = `/content/segment-narrative?business_id=${encodeURIComponent(
      businessId
    )}&content_series_id=${encodeURIComponent(contentSeriesId)}`;

    return api.execute(endpoint, { method: "GET" }) as Promise<SegmentNarrativeResponse>;
  };

  const startGeneration = async (businessId: string, contentSeriesId: string) => {
    const endpoint = `/content/segment-narrative?business_id=${encodeURIComponent(
      businessId
    )}&content_series_id=${encodeURIComponent(contentSeriesId)}`;

    return api.execute(endpoint, { method: "POST" }) as Promise<SegmentNarrativeResponse>;
  };

  return {
    getContent,
    startGeneration,
    invalidateContent: (businessId: string, contentSeriesId: string) =>
      queryClient.invalidateQueries({ queryKey: [SEGMENT_NARRATIVE_QUERY_KEY, businessId, contentSeriesId] }),
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
