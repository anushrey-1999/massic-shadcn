"use client";

import * as React from "react";
import { useBusinessStore } from "@/store/business-store";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useSubscription } from "@/hooks/use-subscription";

export type EntitlementKey =
  | "analytics"
  | "strategy"
  | "web"
  | "webOptimize"
  | "ads"
  | "content"
  | "reviews"
  | "aiChat";

type UseEntitlementGateArgs = {
  entitlement: EntitlementKey;
  businessId?: string;
  alertMessage?: string;
};

export function useEntitlementGate({
  entitlement,
  businessId,
  alertMessage,
}: UseEntitlementGateArgs) {
  const { profiles } = useBusinessStore();
  const {
    handleSubscribeToPlan,
    loading: subscriptionLoading,
    data: subscriptionData,
    isFetched: subscriptionFetched,
  } = useSubscription();

  const effectiveBusinessId =
    businessId || (profiles.length === 1 ? profiles[0].UniqueId : undefined);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    effectiveBusinessId || null
  );

  const business = React.useMemo(() => {
    if (!effectiveBusinessId) return null;
    return (
      profiles.find((b) => b.UniqueId === effectiveBusinessId) ||
      profileData ||
      null
    );
  }, [profiles, effectiveBusinessId, profileData]);

  const isWhitelisted =
    subscriptionData?.whitelisted === true ||
    subscriptionData?.status === "whitelisted";
  const isCanceled = subscriptionData?.status === "canceled";

  const isTrialActive = (business as any)?.isTrialActive === true;
  const remainingTrialDays =
    typeof (business as any)?.remainingTrialDays === "number"
      ? (business as any).remainingTrialDays
      : undefined;

  const planType = React.useMemo(() => {
    if (isWhitelisted) return "whitelisted";
    if (isCanceled) return "no_plan";
    if (isTrialActive) return "free_trial";

    const plan = business?.SubscriptionItems?.plan_type;
    const status = business?.SubscriptionItems?.status;
    if (status === "active" && typeof plan === "string" && plan.length > 0) {
      return plan.toLowerCase();
    }
    return "no_plan";
  }, [business, isWhitelisted, isCanceled, isTrialActive]);

  const entitlements = React.useMemo(() => {
    if (planType === "whitelisted") {
      return {
        analytics: true,
        strategy: true,
        web: true,
        webOptimize: true,
        ads: true,
        aiChat: true,
        content: true,
        reviews: true,
      };
    }

    if (planType === "free_trial") {
      return {
        analytics: true,
        strategy: false,
        web: false,
        webOptimize: true,
        ads: false,
        aiChat: false,
        content: false,
        reviews: false,
      };
    }

    const levels: Record<string, number> = {
      no_plan: 0,
      starter: 1,
      core: 2,
      growth: 3,
    };

    const level = levels[planType] ?? 0;

    return {
      analytics: level >= 1,
      strategy: level >= 2,
      web: level >= 2,
      webOptimize: level >= 1,
      ads: level >= 2,
      aiChat: level >= 2,
      content: level >= 3,
      reviews: level >= 3,
    };
  }, [planType]);

  const entitled = !effectiveBusinessId ? true : entitlements[entitlement];

  const hasPlanSignal =
    !effectiveBusinessId ||
    isWhitelisted ||
    isTrialActive ||
    typeof business?.SubscriptionItems?.status === "string" ||
    typeof business?.SubscriptionItems?.plan_type === "string";

  const gateLoading =
    !!effectiveBusinessId &&
    (!subscriptionFetched || subscriptionLoading || (profileDataLoading && !hasPlanSignal));

  const getCurrentPlan = React.useCallback(() => {
    const plan = business?.SubscriptionItems?.plan_type;
    const status = business?.SubscriptionItems?.status;
    if (status === "active" && typeof plan === "string" && plan.length > 0) {
      return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
    }
    return "No Plan";
  }, [business]);

  const computedAlertMessage = React.useMemo(() => {
    if (isWhitelisted) {
      return "Your agency has unlimited access.";
    }

    if (alertMessage) return alertMessage;

    const current = getCurrentPlan();
    const requiredPlan =
      entitlement === "analytics" || entitlement === "webOptimize"
        ? "Starter"
        : entitlement === "strategy" ||
          entitlement === "web" ||
          entitlement === "ads" ||
          entitlement === "aiChat"
          ? "Core"
          : "Growth";

    if (planType === "free_trial" && entitlement !== "analytics" && entitlement !== "webOptimize") {
      const trialDaysMessage =
        typeof remainingTrialDays === "number" && remainingTrialDays > 0
          ? ` Your trial expires in ${remainingTrialDays} day${remainingTrialDays === 1 ? "" : "s"}.`
          : "";
      return `You're on a free trial. Upgrade to access this feature.${trialDaysMessage}`;
    }

    if (current === "No Plan") {
      return `Upgrade to ${requiredPlan} to access this feature.`;
    }

    return `You're on ${current}. Upgrade your plan to access this feature.`;
  }, [alertMessage, entitlement, getCurrentPlan, isWhitelisted, planType, remainingTrialDays]);

  const handleSubscribe = React.useCallback(
    async (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => {
      if (!business) return;
      await handleSubscribeToPlan({
        business,
        planName,
        action,
        closeAllModals: () => { },
      });
    },
    [business, handleSubscribeToPlan]
  );

  return {
    business,
    effectiveBusinessId,
    entitled,
    gateLoading,
    subscriptionLoading,
    subscriptionData,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  };
}
