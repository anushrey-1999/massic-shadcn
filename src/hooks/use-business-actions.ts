import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CancelSubscriptionParams {
  businessId: string;
}

interface UpdateBusinessStatusParams {
  businessId: string;
  businessDbId: string;
  isActive: boolean;
  softDelete?: boolean;
}

/**
 * Hook to cancel a business subscription
 */
export function useCancelSubscription() {
  return useMutation<void, Error, CancelSubscriptionParams>({
    mutationFn: async ({ businessId }) => {
      await api.post(`/billing/businesses/${businessId}/cancel`, "node");
    },
    onError: (error) => {
      // Log error but don't show toast - this is best-effort
      console.warn("Subscription cancellation failed:", error);
    },
  });
}

/**
 * Hook to update business status (unlink or delete)
 */
export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, UpdateBusinessStatusParams>({
    mutationFn: async ({ businessDbId, isActive, softDelete = false }) => {
      const payload = {
        businessId: businessDbId,
        isActive,
        softDelete,
      };

      const response = await api.put<{ err?: boolean; message?: string }>(
        "/business-status",
        "node",
        payload
      );

      if (response.err !== false) {
        throw new Error(
          response.message || "Failed to update business status"
        );
      }
    },
    onSuccess: (_, variables) => {
      const action = variables.softDelete ? "deleted" : "unlinked";
      toast.success(`Business ${action} successfully`);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["linkedBusinesses"] });
      queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });

      // Redirect to home after successful action
      router.push("/");
    },
    onError: (error, variables) => {
      const action = variables.softDelete ? "delete" : "unlink";
      toast.error(`Failed to ${action} business`, {
        description: error.message || "Please try again later.",
      });
    },
  });
}

/**
 * Combined hook to unlink/delete business with subscription cancellation
 */
export function useUnlinkOrDeleteBusiness() {
  const cancelSubscription = useCancelSubscription();
  const updateBusinessStatus = useUpdateBusinessStatus();

  return useMutation<
    void,
    Error,
    {
      businessId: string;
      businessDbId: string;
      hasLinkedAuth: boolean;
      isActive: boolean;
    }
  >({
    mutationFn: async ({ businessId, businessDbId, hasLinkedAuth, isActive }) => {
      if (!isActive) {
        throw new Error(
          `Business is already ${hasLinkedAuth ? "unlinked" : "deleted"}`
        );
      }

      // Step 1: Cancel subscription (best-effort)
      try {
        await cancelSubscription.mutateAsync({ businessId });
      } catch (error) {
        // Ignore - business might not have a subscription
        console.warn("Subscription cancellation skipped:", error);
      }

      // Step 2: Update business status
      // If has LinkedAuthId: just unlink (set IsActive: false)
      // If no LinkedAuthId: delete (soft delete with deleted_at)
      await updateBusinessStatus.mutateAsync({
        businessId,
        businessDbId,
        isActive: false,
        softDelete: !hasLinkedAuth, // Only soft delete when no LinkedAuthId
      });
    },
  });
}
