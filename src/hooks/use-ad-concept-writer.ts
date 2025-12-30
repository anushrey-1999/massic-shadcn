"use client";

import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AdConceptWriterStatus =
  | "success"
  | "error"
  | "pending"
  | "processing"
  | string;

export interface AdConceptWriterResponse {
  status?: AdConceptWriterStatus;
  message?: string;
  output_data?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

const AD_CONCEPT_WRITER_QUERY_KEY = "ad-concept-writer";

function getStatusLowercase(data: AdConceptWriterResponse | undefined): string {
  return (data?.status || "").toString().toLowerCase();
}

export function useAdConceptWriterContentQuery(params: {
  businessId: string;
  adConceptId: string;
  enabled?: boolean;
  pollingDisabled?: boolean;
  pollingIntervalMs?: number;
}) {
  const api = useApi({ platform: "python" });

  const {
    businessId,
    adConceptId,
    enabled = true,
    pollingDisabled = false,
    pollingIntervalMs = 6000,
  } = params;

  return useQuery({
    queryKey: [AD_CONCEPT_WRITER_QUERY_KEY, businessId, adConceptId],
    enabled: enabled && !!businessId && !!adConceptId,
    queryFn: async () => {
      const endpoint = `/client/ad-concept-writer?business_id=${encodeURIComponent(
        businessId
      )}&ad_concept_id=${encodeURIComponent(adConceptId)}`;

      return api.execute(endpoint, { method: "GET" }) as Promise<AdConceptWriterResponse>;
    },
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (pollingDisabled) return false;
      const status = getStatusLowercase(query.state.data as AdConceptWriterResponse | undefined);
      return status === "pending" || status === "processing" ? pollingIntervalMs : false;
    },
    staleTime: 0,
  });
}

export function useAdConceptWriterActions() {
  const api = useApi({ platform: "python" });
  const queryClient = useQueryClient();

  const getContent = async (businessId: string, adConceptId: string) => {
    const endpoint = `/client/ad-concept-writer?business_id=${encodeURIComponent(
      businessId
    )}&ad_concept_id=${encodeURIComponent(adConceptId)}`;

    return api.execute(endpoint, { method: "GET" }) as Promise<AdConceptWriterResponse>;
  };

  const startGeneration = async (businessId: string, adConceptId: string) => {
    const endpoint = `/client/ad-concept-writer?business_id=${encodeURIComponent(
      businessId
    )}&ad_concept_id=${encodeURIComponent(adConceptId)}`;

    return api.execute(endpoint, { method: "POST" }) as Promise<AdConceptWriterResponse>;
  };

  return {
    getContent,
    startGeneration,
    invalidateContent: (businessId: string, adConceptId: string) =>
      queryClient.invalidateQueries({ queryKey: [AD_CONCEPT_WRITER_QUERY_KEY, businessId, adConceptId] }),
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
