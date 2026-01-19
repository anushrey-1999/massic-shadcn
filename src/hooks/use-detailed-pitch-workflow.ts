"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export type WorkflowStatus = "pending" | "processing" | "success" | "error" | string;

export interface WorkflowStatusResponse {
  status?: WorkflowStatus;
  business_id?: string;
  [key: string]: any;
}

export interface DetailedReportResponse {
  report?: string;
  content?: string;
  status?: WorkflowStatus;
  [key: string]: any;
}

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

// Trigger workflow for detailed report and poll its status
export function useTriggerWorkflow() {
  return useMutation<WorkflowStatusResponse, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      const response = await api.post<WorkflowStatusResponse>(
        "/trigger-workflow",
        "python",
        { business_id: businessId }
      );
      return response;
    },
    onError: (error) => {
      toast.error("Failed to prepare workflow", {
        description: error.message || "Please try again.",
      });
    },
  });
}

// Poll workflow status by re-triggering the endpoint
export function usePollWorkflowStatus(businessId: string | null, enabled: boolean) {
  return useQuery<WorkflowStatusResponse | null, Error>({
    queryKey: ["poll-workflow-status", businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const response = await api.post<WorkflowStatusResponse>(
        "/trigger-workflow",
        "python",
        { business_id: businessId }
      );
      return response;
    },
    enabled: enabled && !!businessId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowStatusResponse | null;
      const status = String(data?.status || "").toLowerCase().trim();
      
      if (status === "pending" || status === "processing") {
        return 20000; // Poll every 20 seconds
      }
      return false; // Stop polling when success or error
    },
  });
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
        const response = await api.get<DetailedReportResponse>("/client/pitches", "python", {
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

      const response = await api.post<DetailedReportResponse>("/client/pitches", "python", undefined, {
        params: { business_id: businessId },
      });
      return response;
    },
    onError: (error) => {
      toast.error("Failed to generate detailed report", {
        description: error.message || "Please try again.",
      });
    },
  });
}
