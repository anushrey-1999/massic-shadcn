"use client";

import React, { useState } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { PlanModal } from "./settings/PlanModal";
// We need to import defaultPlansData or reuse it. 
// Since it's not exported from BillingSettings and PlanModal has its own default, 
// we will rely on PlanModal's default or we should export it from a shared consts file.
// For now, PlanModal has a default fallback so we might not need to pass plansData if it matches.
// However, looking at PlanModal code, it uses 'defaultPlansData' if not passed.
// I will verify if I need to pass it or if the default in PlanModal is sufficient.
// The default in PlanModal seems to be the full list.

interface EntitlementsGuardProps {
  children: React.ReactNode;
  entitlement: "analytics" | "strategy" | "content" | "reviews";
  businessId?: string;
}

export function EntitlementsGuard({
  children,
  entitlement,
  businessId,
}: EntitlementsGuardProps) {
  const { profiles } = useBusinessStore();
  const [modalOpen, setModalOpen] = useState(false);
  const { handleSubscribeToPlan, loading } = useSubscription();

  const effectiveBusinessId = businessId || (profiles.length === 1 ? profiles[0].UniqueId : undefined);

  const { entitlements } = useEntitlements(effectiveBusinessId);

  // If no business selected/available, render children (let other guards handle)
  if (!effectiveBusinessId) {
    return <>{children}</>;
  }

  if (entitlements[entitlement]) {
    return <>{children}</>;
  }

  const business = profiles.find((b) => b.UniqueId === effectiveBusinessId);

  const getCurrentPlan = () => {
    if (!business?.SubscriptionItems) return "No Plan";
    if (business.SubscriptionItems.status === 'active' && business.SubscriptionItems.plan_type) {
      return business.SubscriptionItems.plan_type.charAt(0).toUpperCase() + business.SubscriptionItems.plan_type.slice(1).toLowerCase();
    }
    return "No Plan";
  };

  const handleSubscribe = async (planName: string, action: 'UPGRADE' | 'DOWNGRADE' | 'SUBSCRIBE') => {
    if (!business) return;
    await handleSubscribeToPlan({
      business,
      planName,
      action,
      closeAllModals: () => setModalOpen(false)
    });
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Upgrade to Access {entitlement.charAt(0).toUpperCase() + entitlement.slice(1)}
        </h3>
        <p className="text-muted-foreground max-w-md mb-6">
          This feature is available on a higher plan. Upgrade your subscription to unlock {entitlement} features and more.
        </p>
        <Button onClick={() => setModalOpen(true)}>
          View Plans & Upgrade
        </Button>
      </div>

      <PlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        // plansData={...} // Use default from component
        currentPlan={getCurrentPlan()}
        showFooterButtons={true}
        onSelectPlan={handleSubscribe}
        loading={loading}
      />
    </>
  );
}
