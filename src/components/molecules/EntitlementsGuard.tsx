"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanModal } from "./settings/PlanModal";
import {
  type EntitlementKey,
  useEntitlementGate,
} from "@/hooks/use-entitlement-gate";

interface EntitlementsGuardProps {
  children: React.ReactNode;
  entitlement: EntitlementKey;
  businessId?: string;
  alertMessage?: string;
}

export function EntitlementsGuard({
  children,
  entitlement,
  businessId,
  alertMessage,
}: EntitlementsGuardProps) {
  const [planModalDismissed, setPlanModalDismissed] = useState(false);
  const {
    business,
    effectiveBusinessId,
    entitled,
    gateLoading,
    subscriptionLoading,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  } = useEntitlementGate({ entitlement, businessId, alertMessage });

  // If no business selected/available, render children (let other guards handle)
  if (!effectiveBusinessId) {
    return <>{children}</>;
  }

  if (entitled) {
    return <>{children}</>;
  }

  // Prevent modal flicker: don't render upgrade UI until we have resolved subscription/profile state.
  if (gateLoading) {
    return null;
  }

  const handleSubscribeWithClose = async (
    planName: string,
    action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE"
  ) => {
    if (!business) return;
    await handleSubscribe(planName, action);
    setPlanModalDismissed(true);
  };

  return (
    <>
      {!planModalDismissed ? (
        <PlanModal
          open={true}
          onClose={() => setPlanModalDismissed(true)}
          currentPlan={getCurrentPlan()}
          showFooterButtons={true}
          showAlertBar={true}
          alertSeverity="error"
          alertMessage={computedAlertMessage}
          isDescription={false}
          onSelectPlan={handleSubscribeWithClose}
          loading={subscriptionLoading}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh] w-full">
          <p className="text-muted-foreground text-lg">
            Upgrade your plan to access this feature.
          </p>
          <Button className="mt-4" onClick={() => setPlanModalDismissed(false)}>
            View Plans
          </Button>
        </div>
      )}
    </>
  );
}
