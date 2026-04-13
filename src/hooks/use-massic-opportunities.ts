import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { api } from "./use-api";
import { toast } from "sonner";

export interface MassicOpportunitiesStatus {
  status: string;
  has_subscription: boolean;
  whitelisted?: boolean;
  subscription_id?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end?: boolean;
  usage?: {
    detailed_pitch?: {
      used: number;
      limit: number;
      remaining: number;
      period_start: Date;
      period_end: Date;
    };
    snapshot_report?: {
      used: number;
      limit: number;
      remaining: number;
      period_start: Date;
      period_end: Date;
    };
  };
  free_snapshots?: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export function useMassicOpportunitiesStatus() {
  const { user } = useAuthStore();
  const userUniqueId = user?.uniqueId;

  return useQuery<MassicOpportunitiesStatus | null>({
    queryKey: ["massic-opportunities", "status", userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) return null;

      try {
        const response = await api.get<{ success: boolean; data: MassicOpportunitiesStatus }>(
          `/massic-opportunities/${userUniqueId}/status`,
          "node"
        );

        if (response?.success && response?.data) {
          return response.data;
        }

        return null;
      } catch (error) {
        console.error("Failed to fetch Massic Opportunities status:", error);
        return null;
      }
    },
    enabled: !!userUniqueId,
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}

export function useCanExecuteMassicOpportunities() {
  const { data: status, isLoading } = useMassicOpportunitiesStatus();

  const canExecuteSnapshot = () => {
    if (isLoading) return false;
    if (!status) return false;

    if (status.whitelisted) return true;

    if (status.has_subscription && status.status === "active") {
      return true;
    }

    if (status.free_snapshots && status.free_snapshots.remaining > 0) {
      return true;
    }

    return false;
  };

  const canExecuteDetailed = () => {
    if (isLoading) return false;
    if (!status) return false;

    if (status.whitelisted) return true;

    if (status.has_subscription && status.status === "active") {
      return true;
    }

    return false;
  };

  const needsUpgrade = (type: "snapshot" | "detailed") => {
    if (isLoading) return false;
    if (!status) return true;

    if (status.whitelisted) return false;

    if (status.has_subscription && status.status === "active") {
      return false;
    }

    if (type === "snapshot" && status.free_snapshots && status.free_snapshots.remaining > 0) {
      return false;
    }

    return true;
  };

  const getSnapshotChipsData = () => {
    if (isLoading || !status) return null;

    const hasSubscription = status.has_subscription && status.status === "active";

    if (hasSubscription) {
      const used = status.usage?.snapshot_report?.used ?? 0;
      const limit = status.usage?.snapshot_report?.limit ?? 15;

      return {
        usageChip: `${used} of ${limit} used`,
        creditsChip: "10 credits after"
      };
    } else {
      const used = status.free_snapshots?.used ?? 0;
      const limit = status.free_snapshots?.limit ?? 3;
      return {
        usageChip: `${used} of ${limit} used`,
        creditsChip: null,
      };
    }
  };

  const getDetailedChipsData = () => {
    if (isLoading || !status) return null;

    const hasSubscription = status.has_subscription && status.status === "active";

    if (hasSubscription) {
      const used = status.usage?.detailed_pitch?.used ?? 0;
      const limit = status.usage?.detailed_pitch?.limit ?? 3;

      return {
        usageChip: `${used} of ${limit} used`,
        creditsChip: "100 credits after",
      };
    } else {
      return {
        usageChip: null,
        creditsChip: "100 credits",
      };
    }
  };

  return {
    canExecuteSnapshot: canExecuteSnapshot(),
    canExecuteDetailed: canExecuteDetailed(),
    needsUpgradeForSnapshot: needsUpgrade("snapshot"),
    needsUpgradeForDetailed: needsUpgrade("detailed"),
    isLoading,
    status,
    getSnapshotChipsData,
    getDetailedChipsData,
  };
}

export function useCancelMassicOpportunities() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.uniqueId) {
        throw new Error("User not authenticated");
      }

      const response = await api.post<{
        success: boolean;
        message?: string;
        cancel_at?: string;
      }>(
        "/massic-opportunities/cancel",
        "node",
        { userUniqueId: user.uniqueId }
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to cancel subscription");
      }

      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Subscription will be cancelled at the end of the billing period");
      queryClient.invalidateQueries({
        queryKey: ["massic-opportunities", "status", user?.uniqueId],
      });
    },
    onError: (error: any) => {
      console.error("Cancel subscription error:", error);
      toast.error(error?.response?.data?.message || error.message || "Failed to cancel subscription");
    },
  });
}

export function useReactivateMassicOpportunities() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.uniqueId) {
        throw new Error("User not authenticated");
      }

      const response = await api.post<{
        success: boolean;
        message?: string;
      }>(
        "/massic-opportunities/reactivate",
        "node",
        { userUniqueId: user.uniqueId }
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to reactivate subscription");
      }

      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Subscription has been reactivated successfully");
      queryClient.invalidateQueries({
        queryKey: ["massic-opportunities", "status", user?.uniqueId],
      });
    },
    onError: (error: any) => {
      console.error("Reactivate subscription error:", error);
      toast.error(error?.response?.data?.message || error.message || "Failed to reactivate subscription");
    },
  });
}

export function useSubscribeMassicOpportunities() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ returnUrl }: { returnUrl: string }) => {
      if (!user?.uniqueId) {
        throw new Error("User not authenticated");
      }

      const response = await api.post<{
        success: boolean;
        checkoutUrl?: string;
        sessionId?: string;
        message?: string;
      }>(
        "/massic-opportunities/subscribe",
        "node",
        { userUniqueId: user.uniqueId, returnUrl }
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to start subscription");
      }

      if (!response?.checkoutUrl) {
        throw new Error("No checkout URL received");
      }

      return response;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      console.error("Subscription error:", error);
      toast.error(error?.response?.data?.message || error.message || "Failed to start subscription");
    },
  });
}
