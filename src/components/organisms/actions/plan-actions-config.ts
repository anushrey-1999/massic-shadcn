import type { ResourceType, Surface } from "@/components/massic-agent/types";

export type PlanActionsConfig = {
  type: ResourceType;
  surface: Exclude<Surface, "global">;
  title: "Pages" | "Social";
  itemLabel: "pages" | "campaigns";
  workflow: "webpages" | "social_channels";
};

export const PLAN_ACTIONS_CONFIG: Record<ResourceType, PlanActionsConfig> = {
  webpage_plan: { type: "webpage_plan", surface: "webpages", title: "Pages", itemLabel: "pages", workflow: "webpages" },
  social_channels_plan: { type: "social_channels_plan", surface: "social_channels", title: "Social", itemLabel: "campaigns", workflow: "social_channels" },
};

export const planMatchesType = (planType: string | undefined, type: ResourceType) => {
  const value = String(planType ?? "").toLowerCase();
  return type === "webpage_plan" ? value === "webpages" || value === "pages" : value === "social_channels" || value === "posts";
};

export const formatPlanDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
};
