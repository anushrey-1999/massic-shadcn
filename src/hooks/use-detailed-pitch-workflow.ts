"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { api } from "@/hooks/use-api";
import type { JobResponse } from "@/types/profile-v2";
import { assertProfileStrategyReady } from "@/utils/profile-strategy-gate";

export type WorkflowStatus = "pending" | "processing" | "success" | "error" | string;

export interface DetailedReportResponse {
  report?: string;
  content?: string;
  status?: WorkflowStatus;
  [key: string]: any;
}

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function extractSubscriptionError(error: unknown): string | null {
  return (error as { response?: { status?: number } })?.response?.status === 403 ? apiErrorMessage(error) : null;
}

function is403Error(error: any): boolean {
  return error?.response?.status === 403;
}

async function ensureProfileStrategyReady(businessId: string): Promise<void> {
  const job = await api.get<JobResponse>(
    `/jobs/${encodeURIComponent(businessId)}`,
    "python"
  );
  assertProfileStrategyReady(job);
}

// Get existing detailed report (check if already generated)
export function useGetDetailedReport(
  businessId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery<DetailedReportResponse | null, Error>({
    queryKey: ["detailed-report", businessId],
    queryFn: async () => {
      if (!businessId) return null;

      try {
        const response = await api.get<DetailedReportResponse>("/actions/pitches", "python", {
          params: { business_id: businessId },
        });
        return response;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: options?.enabled ?? !!businessId,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as DetailedReportResponse | null;
      const status = normalizeStatus(data?.status);
      return status === "pending" || status === "processing" ? 4000 : false;
    },
  });
}

// Generate new detailed report
export function useGenerateDetailedReport() {
  return useMutation<DetailedReportResponse, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }
      await ensureProfileStrategyReady(businessId);

      const response = await api.post<DetailedReportResponse>("/actions/pitches", "python", undefined, {
        params: { business_id: businessId },
      });
      return response;
    },
    onError: (error) => {
      if (is403Error(error)) {
        const subscriptionError = extractSubscriptionError(error);
        if (subscriptionError) {
          toast.error("Subscription Required", {
            description: subscriptionError,
          });
          return;
        }
      }

      const errorMessage = apiErrorMessage(error);
      toast.error("Failed to generate detailed report", {
        description: errorMessage,
      });
    },
  });
}
