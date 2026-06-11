import { useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type {
  BillingReconciliationPeriod,
  BillingReconciliationReport,
} from "@/types/billing-reconciliation-types";

interface BillingReconciliationResponse {
  success: boolean;
  data?: BillingReconciliationReport;
  message?: string;
}

type BillingReconciliationRequest = {
  month?: string;
  period?: Exclude<BillingReconciliationPeriod, "month">;
  agencyId?: string;
};

export function useBillingReconciliation() {
  return useMutation<BillingReconciliationReport, Error, BillingReconciliationRequest>({
    mutationFn: async ({ month, period, agencyId = "self" }) => {
      if (!month && !period) {
        throw new Error("Month or period is required");
      }

      const params = new URLSearchParams();
      if (period) {
        params.set("period", period);
      } else if (month) {
        params.set("month", month);
      }

      const response = await api.get<BillingReconciliationResponse>(
        `/billing/agencies/${agencyId}/reconciliation-report?${params.toString()}`,
        "node"
      );

      if (!response?.success || !response?.data) {
        throw new Error(response?.message || "Failed to load billing reconciliation report");
      }

      return response.data;
    },
  });
}
