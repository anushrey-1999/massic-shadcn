import { useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { BillingReconciliationReport } from "@/types/billing-reconciliation-types";

interface BillingReconciliationResponse {
  success: boolean;
  data?: BillingReconciliationReport;
  message?: string;
}

export function useBillingReconciliation() {
  return useMutation<BillingReconciliationReport, Error, { month: string; agencyId?: string }>({
    mutationFn: async ({ month, agencyId = "self" }) => {
      if (!month) {
        throw new Error("Month is required");
      }

      const response = await api.get<BillingReconciliationResponse>(
        `/billing/agencies/${agencyId}/reconciliation-report?month=${encodeURIComponent(month)}`,
        "node"
      );

      if (!response?.success || !response?.data) {
        throw new Error(response?.message || "Failed to load billing reconciliation report");
      }

      return response.data;
    },
  });
}
