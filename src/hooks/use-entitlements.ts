import { useBusinessStore } from "@/store/business-store";
import { useSubscription } from "./use-subscription";

export type PlanType = "starter" | "core" | "growth" | "whitelisted" | "no_plan";

export interface Entitlements {
  analytics: boolean;
  strategy: boolean;
  content: boolean;
  reviews: boolean;
  aiChat: boolean;
}

const PLAN_LEVELS: Record<PlanType, number> = {
  no_plan: 0,
  starter: 1,
  core: 2,
  growth: 3,
  whitelisted: 999,
};

export const useEntitlements = (businessId?: string) => {
  const { profiles } = useBusinessStore();
  // We need to check global subscription status for whitelist
  // We import useSubscription here. Note: This assumes useSubscription uses React Query caching efficiently.
  const { data: subscriptionData } = useSubscription();
  const isWhitelisted = subscriptionData?.whitelisted === true || subscriptionData?.status === "whitelisted";
  const isCanceled = subscriptionData?.status === "canceled";

  const getPlanType = (id: string): PlanType => {
    if (isWhitelisted) return "whitelisted";
    if (isCanceled) return "no_plan";

    const business = profiles.find((b) => b.UniqueId === id);
    if (!business || !business.SubscriptionItems) return "no_plan";

    // Check if whitelisted (sometimes on business level too, or just status)
    if (business.SubscriptionItems.status === "active") {
      return (business.SubscriptionItems.plan_type?.toLowerCase() as PlanType) || "no_plan";
    }

    return "no_plan";
  };

  const currentBusinessPlan = businessId ? getPlanType(businessId) : (isWhitelisted ? "whitelisted" : "no_plan");
  const planLevel = PLAN_LEVELS[currentBusinessPlan] || 0;

  const entitlements: Entitlements = {
    analytics: planLevel >= PLAN_LEVELS.starter,
    strategy: planLevel >= PLAN_LEVELS.core,
    aiChat: planLevel >= PLAN_LEVELS.core,
    content: planLevel >= PLAN_LEVELS.growth,
    reviews: planLevel >= PLAN_LEVELS.growth,
  };

  return {
    planType: currentBusinessPlan,
    entitlements,
    // Helpers
    canAccessAnalytics: entitlements.analytics,
    canAccessStrategy: entitlements.strategy,
    canAccessContent: entitlements.content,
    canAccessReviews: entitlements.reviews,
  };
};
