"use client";

import { PlanActionsAccordion } from "./plan-actions-accordion";

type PagesActionsDropdownProps = {
  businessId: string;
  ready?: boolean;
  readinessLoading?: boolean;
};

export function PagesActionsDropdown({
  businessId,
  ready = true,
  readinessLoading = false,
}: PagesActionsDropdownProps) {
  return (
    <PlanActionsAccordion
      businessId={businessId}
      type="webpage_plan"
      ready={ready}
      readinessLoading={readinessLoading}
    />
  );
}
