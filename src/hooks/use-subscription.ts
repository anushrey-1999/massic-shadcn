import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useApi, UseApiReturn } from "./use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface SubscriptionData {
  id?: string;
  status?: string;
  whitelisted?: boolean;
  [key: string]: any;
}

export interface SubscribeParams {
  business?: any;
  planName: string;
  action: "SUBSCRIBE" | "UPGRADE" | "DOWNGRADE";
  closeAllModals?: () => void;
}

interface UseSubscriptionResult {
  loading: boolean;
  isFetched: boolean;
  handleCreateAgencySubscription: (params: { business: any; planName: string }) => Promise<void>;
  handleAddBusinessToSubscription: (params: { business: any; planName: string }) => Promise<void>;
  handleChangePlan: (params: { business: any; planName: string; action: string; closeAllModals?: () => void }) => Promise<void>;
  handleSubscribeToPlan: (params: SubscribeParams) => Promise<void>;
  refetchData: () => Promise<any>;
  data: any;
}

export const useSubscription = (): UseSubscriptionResult => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  // We use the node platform for billing APIs as per old UI "seedmain"
  const api: UseApiReturn = useApi({ platform: "node" });
  const [loading, setLoading] = useState(false);

  // -- Fetch Subscription Data --
  const {
    data: subscriptionData,
    refetch: refetchSubscriptionQuery,
    isFetching: isRefetching,
    isFetched,
  } = useQuery({
    queryKey: ["subscription", user?.uniqueId],
    queryFn: async () => {
      if (!user?.uniqueId) return null;
      try {
        const response = await api.execute(`/billing/users/${user.uniqueId}/agencies/subscription`, { method: "GET" });
        if (response?.success) {
          return response.data;
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch subscription data", error);
        return null;
      }
    },
    enabled: !!user?.uniqueId,
  });

  const isWhitelisted = subscriptionData?.whitelisted === true || subscriptionData?.status === "whitelisted";

  // -- Actions --

  const handleCreateAgencySubscription = useCallback(async ({ business, planName }: { business: any; planName: string }) => {
    try {
      setLoading(true);
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";

      const payload = {
        userUniqueId: user?.uniqueId,
        businessId: business?.UniqueId,
        planType: planName?.toLowerCase(),
        returnUrl: currentUrl,
      };

      const response = await api.execute("/billing/agencies/add-subscription", {
        method: "POST",
        data: payload,
      });

      if (response?.success) {
        const checkoutUrl = response?.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } else {
        toast.error(response?.message || "Failed to create subscription");
      }
    } catch (error: any) {
      console.error("Create subscription error", error);
      toast.error("Failed to create subscription");
    } finally {
      setLoading(false);
    }
  }, [user?.uniqueId, api]);

  const handleAddBusinessToSubscription = useCallback(async ({ business, planName }: { business: any; planName: string }) => {
    try {
      setLoading(true);
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";

      const payload = {
        userUniqueId: user?.uniqueId,
        businessId: business?.UniqueId,
        planType: planName?.toLowerCase(),
        returnUrl: currentUrl,
      };

      const response = await api.execute("/billing/agencies/businesses/add-to-subscription", {
        method: "POST",
        data: payload,
      });

      if (response?.success) {
        const checkoutUrl = response?.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          toast.success("Business added to subscription successfully");
          refetchData();
        }
      } else {
        toast.error(response?.message || "Failed to add business to subscription");
      }
    } catch (error: any) {
      console.error("Add business to subscription error", error);
      toast.error("Failed to add business to subscription");
    } finally {
      setLoading(false);
    }
  }, [user?.uniqueId, api]);

  const handleChangePlan = useCallback(async ({ business, planName, action, closeAllModals }: { business: any; planName: string; action: string; closeAllModals?: () => void }) => {
    if (isWhitelisted) {
      toast.info("Your agency has unlimited access. No plan changes needed.");
      closeAllModals?.();
      return;
    }

    try {
      setLoading(true);
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";

      const payload = {
        newPlanType: planName?.toLowerCase(),
        returnUrl: currentUrl,
      };

      const response = await api.execute(`/billing/businesses/${business?.UniqueId}/plan`, {
        method: "PUT",
        data: payload,
      });

      if (response?.success) {
        if (action === "UPGRADE") {
          const checkoutUrl = response?.checkoutUrl;
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
            return;
          }
        }

        if (action === "DOWNGRADE") {
          toast.success("Plan downgraded successfully");
        }

        await refetchData();
        closeAllModals?.();
      } else {
        toast.error(response?.message || "Failed to change plan");
      }
    } catch (error: any) {
      console.error("Change plan error", error);
      toast.error("Failed to change plan");
    } finally {
      setLoading(false);
    }
  }, [isWhitelisted, api, user?.uniqueId]);

  const refetchData = async () => {
    const result = await refetchSubscriptionQuery();
    // Invalidate business profiles query if it exists
    // Assuming there is a query key for business profiles like 'business-profiles' or similar
    await queryClient.invalidateQueries({ queryKey: ["business-profiles"] });
    // Also try to reload window if we really need a hard refresh for some reason, 
    // but usually query invalidation is enough. 
    // For now, we'll just stick to query invalidation.
    return result?.data ?? null;
  };

  const handleSubscribeToPlan = useCallback(async ({ business, planName, action, closeAllModals }: SubscribeParams) => {
    if (isWhitelisted) {
      toast.info("Your agency has unlimited access.");
      closeAllModals?.();
      return;
    }

    if (action === "SUBSCRIBE") {
      if (subscriptionData?.id) {
        await handleAddBusinessToSubscription({ business, planName });
      } else {
        await handleCreateAgencySubscription({ business, planName });
      }
    } else if (action === "UPGRADE" || action === "DOWNGRADE") {
      await handleChangePlan({ business, planName, action, closeAllModals });
    }
  }, [isWhitelisted, subscriptionData, handleAddBusinessToSubscription, handleCreateAgencySubscription, handleChangePlan]);

  return {
    loading: loading || isRefetching,
    isFetched,
    handleCreateAgencySubscription,
    handleAddBusinessToSubscription,
    handleChangePlan,
    handleSubscribeToPlan,
    refetchData,
    data: subscriptionData,
  };
};
