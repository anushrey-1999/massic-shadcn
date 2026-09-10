"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { AgentPlanHeader } from "@/components/massic-agent/agent-plan-header";
import { AgentPlanTable } from "@/components/massic-agent/agent-plan-table";
import { agentKeys, errorMessage, getPlan, getPlans } from "@/components/massic-agent/agent-api";
import { agentPlanHref } from "@/components/massic-agent/agent-links";
import type { AgentPlan, ResourceType } from "@/components/massic-agent/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { PLAN_ACTIONS_CONFIG, planMatchesType } from "./plan-actions-config";

export function PlanHistoryDialog({ businessId, type, open, onOpenChange }: { businessId: string; type: ResourceType; open: boolean; onOpenChange: (open: boolean) => void }) {
  const config = PLAN_ACTIONS_CONFIG[type];
  const [preview, setPreview] = React.useState<AgentPlan | null>(null);
  const guardRefine = useFeatureActionGuard("actions.refinePlan");
  const guardActivate = useFeatureActionGuard("actions.activatePlan");
  const plans = useQuery({
    queryKey: agentKeys.plans(businessId, type),
    queryFn: ({ signal }) => getPlans(businessId, type, signal),
    enabled: open && Boolean(businessId), retry: 1, staleTime: 30_000, refetchOnWindowFocus: "always",
  });
  const detail = useQuery({
    queryKey: agentKeys.plan(businessId, preview?.id ?? ""),
    queryFn: ({ signal }) => getPlan(businessId, preview!.id, signal),
    enabled: open && preview !== null, retry: 1,
  });
  const items = (plans.data ?? []).filter(plan => planMatchesType(plan.plan_type, type));
  const go = (plan: AgentPlan, action: "refine" | "activate") => {
    if (action === "refine" ? !guardRefine() : !guardActivate()) return;
    window.location.assign(agentPlanHref({ businessId, surface: config.surface, action, planId: plan.id, autoSubmit: action === "activate" }));
  };

  React.useEffect(() => { if (!open) setPreview(null); }, [open]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={!preview} className={cn("flex w-[calc(100vw-2rem)] flex-col overflow-hidden", preview ? "h-[86vh] gap-0 p-0 sm:max-w-[1200px]" : "sm:max-w-[720px]")}>
      {preview ? <>
        <AgentPlanHeader plan={detail.data ?? preview} planId={preview.id} surface={config.surface} onBack={() => setPreview(null)} onRefine={() => go(detail.data ?? preview, "refine")} onActivate={() => go(detail.data ?? preview, "activate")} onClose={() => onOpenChange(false)} closeLabel="Close plan" />
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {detail.isLoading ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading plan…</div>
            : detail.isError ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><p>{errorMessage(detail.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => detail.refetch()}>Retry</Button></div>
            : detail.data && planMatchesType(detail.data.plan_type, type) ? <AgentPlanTable plan={detail.data} type={type} showPlanHeader={false} />
            : <p role="alert" className="text-sm text-destructive">This plan does not match the selected strategy.</p>}
        </div>
      </> : <><DialogHeader>
        <DialogTitle>{config.title} plans</DialogTitle>
        <DialogDescription>Review every {config.title.toLowerCase()} plan for this business.</DialogDescription>
      </DialogHeader><div className="min-h-0 w-full max-w-full flex-1 overflow-auto rounded-lg border border-border">
        {plans.isLoading ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading plans…</div>
          : plans.isError ? <div role="alert" className="p-5 text-sm text-destructive"><p>{errorMessage(plans.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => plans.refetch()}>Retry</Button></div>
          : !items.length ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No plans found.</div>
          : <table className="w-full min-w-[440px] table-fixed text-sm"><colgroup><col /><col className="w-[90px]" /><col className="w-[110px]" /><col className="w-[48px]" /></colgroup><thead className="sticky top-0 z-10 bg-muted"><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Items</th><th className="px-3 py-2">Parent</th><th className="px-3 py-2"><span className="sr-only">View</span></th></tr></thead><tbody>{items.map(plan => {
            const active = String(plan.status).toLowerCase() === "active";
            const view = () => setPreview(plan);
            return <tr key={String(plan.id)} role="button" tabIndex={0} aria-label={`View Plan ${plan.id}`} onClick={view} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view(); } }} className="cursor-pointer border-b border-border transition-[background-color,color] last:border-0 hover:bg-general-primary/5 focus-visible:bg-general-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-general-primary/30"><td className="px-3 py-3"><div className="flex items-center gap-2 font-medium"><span>Plan #{plan.id}</span>{active && <span className="rounded-full bg-general-primary/10 px-2 py-0.5 text-xs font-medium text-general-primary">Active</span>}{plan.valid === false && <span className="text-xs font-normal text-destructive">Needs attention</span>}</div></td><td className="px-3 py-3 tabular-nums">{plan.timeframe ?? "—"}</td><td className="px-3 py-3 tabular-nums">{plan.parent_plan_id ? `Plan #${plan.parent_plan_id}` : "—"}</td><td className="px-3 py-3 text-right text-muted-foreground"><ChevronRight className="ml-auto size-4" aria-hidden="true" /></td></tr>;
          })}</tbody></table>}
      </div></>}
    </DialogContent>
  </Dialog>;
}
