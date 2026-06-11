import { useMutation } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";

export type TechnicalAuditCanExecuteResponse = {
  success: boolean;
  can_execute: boolean;
  message?: string;
  feature_type?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  plan_type?: string;
  credits_option?: {
    can_execute_with_credits?: boolean;
    credits_required?: number;
    agency_credits_balance?: number;
  } | null;
  execution_credits?: {
    current_balance?: number;
    total_purchased?: number;
    total_used?: number;
    auto_topup_enabled?: boolean;
    auto_topup_threshold?: number;
  } | null;
};

export type TechnicalAuditUpdateUsageResponse = {
  success: boolean;
  message?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  used_credits?: boolean;
  credits_deducted?: number;
  credits_balance_after?: number;
  auto_topup_triggered?: boolean;
};

export function useTechnicalAuditExecution() {
  const canExecuteMutation = useMutation({
    mutationFn: async ({
      businessId,
    }: {
      businessId: string;
    }): Promise<TechnicalAuditCanExecuteResponse> => {
      return api.get<TechnicalAuditCanExecuteResponse>(
        `/subscription/can-execute/${encodeURIComponent(businessId)}/technical_audit`,
        "node"
      );
    },
  });

  const updateUsageMutation = useMutation({
    mutationFn: async ({
      businessId,
    }: {
      businessId: string;
    }): Promise<TechnicalAuditUpdateUsageResponse> => {
      return api.post<TechnicalAuditUpdateUsageResponse>("/subscription/update-usage", "node", {
        businessId,
        featureType: "technical_audit",
        incrementBy: 1,
      });
    },
  });

  return {
    checkCanExecute: canExecuteMutation.mutateAsync,
    isCheckingCanExecute: canExecuteMutation.isPending,
    canExecuteError: canExecuteMutation.error ?? null,
    updateUsage: updateUsageMutation.mutateAsync,
    isUpdatingUsage: updateUsageMutation.isPending,
    updateUsageError: updateUsageMutation.error ?? null,
  };
}
