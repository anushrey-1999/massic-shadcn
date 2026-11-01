"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { Button } from "@/components/ui/button";
import { PlanModal } from "@/components/molecules/settings/PlanModal";

export function MassicAgentEntryButton({ businessId }: { businessId: string }) {
  const [plansOpen, setPlansOpen] = useState(false);
  const {
    entitled,
    gateLoading,
    subscriptionLoading,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  } = useEntitlementGate({
    entitlement: "massicAgent",
    businessId,
    alertMessage: "Upgrade to Growth to access Massic Agent.",
  });

  const label = (
    <>
      {gateLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-general-primary" />
      ) : (
        <Bot className="h-4 w-4 text-general-primary" />
      )}
      <span className="bg-linear-to-r from-general-primary to-general-primary-gradient-to bg-clip-text text-transparent">
        Massic Agent
      </span>
    </>
  );

  return (
    <>
      {entitled && !gateLoading ? (
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/business/${encodeURIComponent(businessId)}/agent`}>
            {label}
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={gateLoading}
          aria-busy={gateLoading}
          onClick={() => setPlansOpen(true)}
        >
          {label}
        </Button>
      )}
      <PlanModal
        open={plansOpen && !entitled}
        onClose={() => setPlansOpen(false)}
        showDismissButton
        currentPlan={getCurrentPlan()}
        showFooterButtons
        showAlertBar
        alertSeverity="error"
        alertMessage={computedAlertMessage}
        isDescription={false}
        onSelectPlan={handleSubscribe}
        loading={subscriptionLoading}
      />
    </>
  );
}
