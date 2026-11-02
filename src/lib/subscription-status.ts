/** Matches backend subscriptionAccess.util activeStatuses */
export const SUBSCRIPTION_ACCESS_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

export type SubscriptionAccessStatus =
  (typeof SUBSCRIPTION_ACCESS_STATUSES)[number];

export function isSubscriptionAccessStatus(
  status?: string | null,
): status is SubscriptionAccessStatus {
  if (!status) return false;
  return (SUBSCRIPTION_ACCESS_STATUSES as readonly string[]).includes(status);
}

export function isPastDueSubscription(status?: string | null): boolean {
  return status === "past_due";
}

export function hasBusinessPlanAccess(
  subscription?: { status?: string | null; plan_type?: string | null } | null,
): boolean {
  if (!subscription?.plan_type) return false;
  if (subscription.status === "cancelled") return false;
  return isSubscriptionAccessStatus(subscription.status);
}

type BusinessSubscription = {
  status?: string | null;
  plan_type?: string | null;
  planType?: string | null;
  plan?: string | null;
  whitelisted?: boolean;
};

export function hasWhitelistAccess(
  ...sources: Array<
    | { isWhitelisted?: boolean; whitelisted?: boolean; status?: string | null }
    | null
    | undefined
  >
): boolean {
  return sources.some(
    (source) =>
      source?.isWhitelisted === true ||
      source?.whitelisted === true ||
      source?.status === "whitelisted",
  );
}

/** Billing supplies live status; the business profile supplies the plan name. */
export function resolveBusinessSubscription(
  billing: BusinessSubscription | null | undefined,
  business: BusinessSubscription | null | undefined,
): BusinessSubscription | null | undefined {
  if (billing === null) return null;
  if (billing === undefined) return business;
  return {
    ...billing,
    plan_type:
      billing.plan_type ??
      billing.planType ??
      billing.plan ??
      business?.plan_type,
  };
}

export function hasActiveCoreOrGrowthPlan(
  subscription?: BusinessSubscription | null,
  isWhitelisted = false,
): boolean {
  if (isWhitelisted || hasWhitelistAccess(subscription)) return true;
  if (!hasBusinessPlanAccess(subscription)) return false;

  const planType = subscription?.plan_type?.trim().toLowerCase();
  return planType === "core" || planType === "growth";
}

export function hasActiveGrowthPlan(
  subscription?: BusinessSubscription | null,
  isWhitelisted = false,
): boolean {
  if (isWhitelisted || hasWhitelistAccess(subscription)) return true;
  if (!hasBusinessPlanAccess(subscription)) return false;
  return subscription?.plan_type?.trim().toLowerCase() === "growth";
}

export function hasMassicOpportunitiesAccess(
  status?: {
    has_subscription?: boolean;
    status?: string;
    whitelisted?: boolean;
  } | null,
): boolean {
  if (!status?.has_subscription) return false;
  return isSubscriptionAccessStatus(status.status);
}

export function getMassicOpportunitiesLinkLabel(
  status?: {
    has_subscription?: boolean;
    status?: string;
    cancel_at_period_end?: boolean;
    current_period_end?: Date | string;
  } | null,
): string {
  if (!hasMassicOpportunitiesAccess(status)) return "Inactive";

  if (isPastDueSubscription(status?.status)) return "Past due";

  if (status?.cancel_at_period_end && status.current_period_end) {
    const end = new Date(status.current_period_end);
    return `Cancels ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  return "Active";
}
