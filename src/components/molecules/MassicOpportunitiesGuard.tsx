"use client";

import * as React from "react";
import { useMassicOpportunitiesStatus } from "@/hooks/use-massic-opportunities";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { MassicOpportunitiesModal } from "./MassicOpportunitiesModal";

type MassicOpportunitiesGuardProps = {
  children: React.ReactNode;
};

export function MassicOpportunitiesGuard({ children }: MassicOpportunitiesGuardProps) {
  const { data: status, isLoading } = useMassicOpportunitiesStatus();
  const { user } = useAuthStore();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [subscribing, setSubscribing] = React.useState(false);

  const handleUpgrade = React.useCallback(async () => {
    if (!user?.uniqueId) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setSubscribing(true);
      const currentUrl = typeof window !== "undefined" ? window.location.href : "";

      const payload = {
        userUniqueId: user.uniqueId,
        returnUrl: currentUrl,
      };

      const response = await api.post<{ success: boolean; checkoutUrl?: string; message?: string }>(
        "/massic-opportunities/subscribe",
        "node",
        payload
      );

      if (response?.success && response?.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        toast.error(response?.message || "Failed to start subscription");
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error?.response?.data?.message || "Failed to start subscription");
    } finally {
      setSubscribing(false);
    }
  }, [user]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      {children}
      <MassicOpportunitiesModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onUpgrade={handleUpgrade}
        alertMessage="Subscribe to Massic Opportunities to access this feature."
      />
    </>
  );
}
