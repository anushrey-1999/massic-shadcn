import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useApi, UseApiReturn } from "./use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ExecutionCreditsBalance {
  current_balance: number;
  total_purchased: number;
  total_used: number;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
  last_auto_topup_at?: string | null;
}

export interface PurchaseCreditsParams {
  quantity?: number; // Number of 100-credit packs to purchase
}

export interface UseExecutionCreditsResult {
  loading: boolean;
  creditsBalance: ExecutionCreditsBalance | null;
  purchaseCredits: (params?: PurchaseCreditsParams) => Promise<void>;
  fetchCreditsBalance: () => Promise<void>;
  refetchData: () => Promise<void>;
}

export const useExecutionCredits = (): UseExecutionCreditsResult => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const api: UseApiReturn = useApi({ platform: "node" });
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // -- Fetch Credits Balance --
  const {
    data: creditsBalance,
    refetch: refetchCreditsQuery,
    isFetching: isFetchingBalance
  } = useQuery({
    queryKey: ["execution-credits-balance", user?.uniqueId],
    queryFn: async () => {
      if (!user?.uniqueId) return null;
      try {
        const response = await api.execute(`/execution-credits/balance/${user.uniqueId}`, { method: "GET" });
        if (response?.success) {
          return response.data;
        }
        // Don't toast error here as new users might not have a record yet
        return null;
      } catch (error) {
        console.error("Failed to fetch credits balance", error);
        return null;
      }
    },
    enabled: !!user?.uniqueId,
  });

  // -- Actions --

  const purchaseCredits = useCallback(async (params?: PurchaseCreditsParams) => {
    if (!user?.uniqueId) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setPurchaseLoading(true);
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";

      const payload = {
        userUniqueId: user.uniqueId,
        quantity: params?.quantity || 1, // Default to 1 pack (100 credits)
        returnUrl: currentUrl,
      };

      const response = await api.execute("/execution-credits/purchase", {
        method: "POST",
        data: payload,
      });

      if (response?.success) {
        const checkoutUrl = response?.checkoutUrl || response?.data?.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          toast.error("No checkout URL received");
        }
      } else {
        toast.error(response?.message || "Failed to purchase credits");
      }
    } catch (error: any) {
      console.error("Purchase credits error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to purchase credits";
      toast.error(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  }, [user?.uniqueId, api]);

  const refetchData = async () => {
    await refetchCreditsQuery();
  };

  return {
    loading: isFetchingBalance || purchaseLoading,
    creditsBalance: creditsBalance || null,
    purchaseCredits,
    fetchCreditsBalance: async () => { await refetchCreditsQuery(); },
    refetchData,
  };
};
