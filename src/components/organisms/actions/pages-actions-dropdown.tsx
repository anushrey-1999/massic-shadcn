"use client";

import { PlanActionsAccordion } from "./plan-actions-accordion";

export function PagesActionsDropdown({ businessId, ready = true, readinessLoading = false }: { businessId: string; ready?: boolean; readinessLoading?: boolean }) {
  return <PlanActionsAccordion businessId={businessId} type="webpage_plan" ready={ready} readinessLoading={readinessLoading} />;
}
