import type { PlanSurface, ResourceType } from "./types";

export type AgentEntryAction = "create" | "refine" | "activate";

export function agentPlansHref({ businessId, surface }: {
  businessId: string;
  surface?: PlanSurface;
}) {
  const params = new URLSearchParams({ view: "plans" });
  if (surface) params.set("surface", surface);
  params.set("from", "actions");
  return `/business/${encodeURIComponent(businessId)}/agent?${params.toString()}`;
}

export function agentPlanHref({ businessId, surface, action, planId, autoSubmit = false }: {
  businessId: string;
  surface: PlanSurface;
  action: AgentEntryAction;
  planId?: string | number;
  autoSubmit?: boolean;
}) {
  const params = new URLSearchParams({ surface, action, from: "actions" });
  if (planId !== undefined) params.set("plan", String(planId));
  if (autoSubmit) params.set("submit", "1");
  return `/business/${encodeURIComponent(businessId)}/agent?${params.toString()}`;
}

export function resourceTypeForSurface(surface: PlanSurface): ResourceType {
  return surface === "webpages" ? "webpage_plan" : "social_channels_plan";
}
