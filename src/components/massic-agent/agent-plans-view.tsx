"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { agentKeys, errorMessage, getPlan, getPlans } from "./agent-api";
import { agentPlanHref } from "./agent-links";
import { AgentPlanHeader } from "./agent-plan-header";
import { AgentPlanTable } from "./agent-plan-table";
import type { AgentPlan, ResourceType, Surface } from "./types";

type PlanTab = "webpages" | "social_channels";

const planType: Record<PlanTab, ResourceType> = {
  webpages: "webpage_plan",
  social_channels: "social_channels_plan",
};

const matches = (value: string | undefined, type: ResourceType) => {
  const normalized = String(value ?? "").toLowerCase();
  return type === "webpage_plan"
    ? normalized === "webpages" || normalized === "pages"
    : normalized === "social_channels" || normalized === "posts";
};

const createdTime = (plan: AgentPlan) => {
  const timestamp = plan.created_at ? new Date(plan.created_at).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const createdDate = (plan: AgentPlan) => {
  const timestamp = createdTime(plan);
  if (!timestamp) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
};

function PlansList({ businessId, surface, onPreview }: {
  businessId: string;
  surface: PlanTab;
  onPreview: (plan: AgentPlan) => void;
}) {
  const type = planType[surface];
  const plans = useQuery({
    queryKey: agentKeys.plans(businessId, type),
    queryFn: ({ signal }) => getPlans(businessId, type, signal),
    retry: 1,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const items = (plans.data ?? [])
    .filter(plan => matches(plan.plan_type, type))
    .sort((a, b) => createdTime(b) - createdTime(a));

  if (plans.isLoading) return <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading plans…</div>;
  if (plans.isError) return <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"><p>{errorMessage(plans.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => plans.refetch()}>Retry</Button></div>;
  if (!items.length) return <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">No plans found.</div>;

  return <div className="min-h-0 flex-1 overflow-y-auto pr-1">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {items.map(plan => {
        const active = String(plan.status).toLowerCase() === "active";
        const view = () => onPreview(plan);
        return <button key={String(plan.id)} type="button" aria-label={`View Plan ${plan.id}`} onClick={view} className="group flex min-h-32 w-full cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-general-primary/30 hover:bg-general-primary/[0.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30 motion-reduce:transform-none">
          <span className="flex w-full items-start justify-between gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary"><FileText className="size-4" /></span>
            <span className="flex min-w-0 items-center gap-2">
              {active && <span className="shrink-0 rounded-full bg-general-primary/10 px-2 py-0.5 text-xs font-medium text-general-primary">Active</span>}
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-general-primary" />
            </span>
          </span>
          <span className="mt-4 truncate text-sm font-medium text-foreground">Plan #{plan.id}</span>
          <span className="mt-1 text-xs text-muted-foreground">Created {createdDate(plan)}</span>
          {plan.valid === false && <span className="mt-2 text-xs text-destructive">Needs attention</span>}
        </button>;
      })}
    </div>
  </div>;
}

export function AgentPlansView({ businessId, initialSurface = "webpages" }: {
  businessId: string;
  initialSurface?: PlanTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [surface, setSurface] = React.useState<PlanTab>(initialSurface);
  const [preview, setPreview] = React.useState<AgentPlan | null>(null);
  const type = planType[surface];
  const guardRefine = useFeatureActionGuard("actions.refinePlan");
  const guardActivate = useFeatureActionGuard("actions.activatePlan");
  const detail = useQuery({
    queryKey: agentKeys.plan(businessId, preview?.id ?? ""),
    queryFn: ({ signal }) => getPlan(businessId, preview!.id, signal),
    enabled: preview !== null,
    retry: 1,
  });
  const selectedPlan = detail.data ?? preview;
  const go = (action: "refine" | "activate") => {
    if (!selectedPlan || (action === "refine" ? !guardRefine() : !guardActivate())) return;
    window.location.assign(agentPlanHref({ businessId, surface, action, planId: selectedPlan.id, autoSubmit: action === "activate" }));
  };
  const changeSurface = (nextSurface: PlanTab) => {
    setSurface(nextSurface);
    setPreview(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "plans");
    params.set("surface", nextSurface);
    router.replace(`/business/${encodeURIComponent(businessId)}/agent?${params.toString()}`, { scroll: false });
  };

  React.useEffect(() => {
    setSurface(initialSurface);
    setPreview(null);
  }, [initialSurface]);

  if (preview) return <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <AgentPlanHeader plan={selectedPlan ?? undefined} planId={preview.id} surface={surface as Surface} onBack={() => setPreview(null)} onRefine={() => go("refine")} onActivate={() => go("activate")} />
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
      {detail.isLoading ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading plan…</div>
        : detail.isError ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><p>{errorMessage(detail.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => detail.refetch()}>Retry</Button></div>
        : detail.data && matches(detail.data.plan_type, type) ? <AgentPlanTable plan={detail.data} type={type} showPlanHeader={false} />
        : <p role="alert" className="text-sm text-destructive">This plan does not match the selected strategy.</p>}
    </div>
  </section>;

  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6">
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="mb-5 shrink-0"><h1 className="text-xl font-semibold tracking-tight">Plans</h1><p className="mt-1 text-sm text-muted-foreground">Review web and social plans for this business.</p></div>
      <Tabs value={surface} onValueChange={value => changeSurface(value as PlanTab)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="mb-4 w-fit shrink-0"><TabsTrigger value="webpages">Web</TabsTrigger><TabsTrigger value="social_channels">Social</TabsTrigger></TabsList>
        <TabsContent value="webpages" className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"><PlansList businessId={businessId} surface="webpages" onPreview={setPreview} /></TabsContent>
        <TabsContent value="social_channels" className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"><PlansList businessId={businessId} surface="social_channels" onPreview={setPreview} /></TabsContent>
      </Tabs>
    </div>
  </section>;
}
