"use client";

import { PlanActionsAccordion } from "./plan-actions-accordion";

export function PostsActionsDropdown({ businessId, ready = true, readinessLoading = false }: { businessId: string; ready?: boolean; readinessLoading?: boolean }) {
  return <PlanActionsAccordion businessId={businessId} type="social_channels_plan" ready={ready} readinessLoading={readinessLoading} />;
}
