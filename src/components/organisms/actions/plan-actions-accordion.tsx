"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Plus, RotateCw } from "lucide-react";
import { AgentPlanTable } from "@/components/massic-agent/agent-plan-table";
import { agentKeys, errorMessage, getPlan, getPlans } from "@/components/massic-agent/agent-api";
import { agentPlanHref, agentPlansHref } from "@/components/massic-agent/agent-links";
import type { PlanItem, ResourceType } from "@/components/massic-agent/types";
import { SocialActionCell } from "@/components/organisms/SocialTable/social-action-cell";
import { WebPageActionCell } from "@/components/organisms/web-page-actions/web-page-action-cell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import type { TacticRow } from "@/types/social-types";
import type { WebPageRow } from "@/types/web-page-types";
import { formatPlanDate, PLAN_ACTIONS_CONFIG, planMatchesType } from "./plan-actions-config";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadPlan(type: ResourceType, planId: string | number, rows: PlanItem[]) {
  const social = type === "social_channels_plan";
  const headers = social
    ? ["Tactic", "Channel", "Type", "Rationale", "Relevance", "Status", "Valid", "Tactic ID"]
    : ["Page", "Page type", "Rationale", "Relevance", "Coverage", "Volume", "Status", "Valid", "Page ID"];
  const data = rows.map(item => social
    ? [item.cluster_name || item.campaign_name || "", item.channel_name, item.content_type, item.rationale, item.cluster_relevance, item.status, item.valid !== false, item.campaign_cluster_id]
    : [item.title || "", item.page_type, item.rationale, item.business_relevance_score, item.coverage, item.search_volume, item.status, item.valid !== false, item.page_id]);
  const csv = [headers, ...data].map(row => row.map(escapeCsv).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${social ? "social" : "webpage"}_plan_${planId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function WebAction({ businessId, item, index }: { businessId: string; item: PlanItem; index: number }) {
  if (!item.page_id) return <span className="text-muted-foreground">—</span>;
  const row: WebPageRow = {
    id: item.page_id || `plan-page-${index}`,
    page_id: item.page_id,
    cluster_name: item.title || item.page_id,
    keyword: item.title || item.page_id,
    page_type: item.page_type || "page",
    search_volume: item.search_volume ?? 0,
    business_relevance_score: item.business_relevance_score ?? 0,
    page_opportunity_score: 0,
    sub_topics_count: 0,
    status: item.status || "new",
    supporting_keywords: [],
  };
  return <WebPageActionCell businessId={businessId} row={row} />;
}

function SocialAction({ businessId, item, index }: { businessId: string; item: PlanItem; index: number }) {
  if (!item.campaign_cluster_id) return <span className="text-muted-foreground">—</span>;
  const row: TacticRow = {
    id: item.campaign_cluster_id || `plan-social-${index}`,
    campaign_cluster_id: item.campaign_cluster_id,
    cluster_name: item.cluster_name || item.title || item.campaign_cluster_id,
    tactic: item.content_type || "Social content",
    title: item.title || item.cluster_name || item.campaign_name || "Social content",
    description: item.rationale || "",
    campaign_relevance: item.cluster_relevance ?? 0,
    cluster_relevance: item.cluster_relevance ?? 0,
    related_keywords: [],
    status: item.status || "new",
    channel_name: item.channel_name || "",
    campaign_name: item.campaign_name || "",
  };
  return <SocialActionCell businessId={businessId} row={row} channelName={item.channel_name || undefined} strategyType="publish" />;
}

export function PlanActionsAccordion({ businessId, type, ready, readinessLoading }: { businessId: string; type: ResourceType; ready: boolean; readinessLoading: boolean }) {
  const router = useRouter();
  const config = PLAN_ACTIONS_CONFIG[type];
  const guardCreate = useFeatureActionGuard("actions.createPlan");
  const guardRefine = useFeatureActionGuard("actions.refinePlan");
  const plans = useQuery({
    queryKey: agentKeys.plans(businessId, type),
    queryFn: ({ signal }) => getPlans(businessId, type, signal),
    enabled: Boolean(businessId) && ready, retry: 1, staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: "always",
  });
  const matchingPlans = (plans.data ?? []).filter(plan => planMatchesType(plan.plan_type, type));
  const active = matchingPlans.find(plan => String(plan.status).toLowerCase() === "active") ?? null;
  const detail = useQuery({
    queryKey: agentKeys.plan(businessId, active?.id ?? ""),
    queryFn: ({ signal }) => getPlan(businessId, active!.id, signal),
    enabled: ready && active !== null, retry: 1, refetchOnMount: "always", refetchOnWindowFocus: "always",
  });
  const activePlan = detail.data && planMatchesType(detail.data.plan_type, type) ? detail.data : undefined;
  const canDownload = Boolean(activePlan && String(activePlan.status).toLowerCase() === "active");
  const navigate = (action: "create" | "refine", planId?: string | number) => {
    if (action === "create" ? !guardCreate() : !guardRefine()) return;
    router.push(agentPlanHref({ businessId, surface: config.surface, action, planId, autoSubmit: action === "create" }));
  };
  const viewPlans = () => router.push(agentPlansHref({ businessId, surface: config.surface }));
  const lastUpdated = active ? formatPlanDate(active.activated_at ?? active.updated_at) : "—";

  return <>
      <Card variant="profileCard" className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden border-0 bg-white p-4! shadow-none">
        {active && <div className="flex shrink-0 flex-wrap items-center gap-3 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Plan #{active.id}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active since {lastUpdated}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canDownload && <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon-sm" aria-label={`Download active ${config.title.toLowerCase()} plan`} disabled={!activePlan?.plan_json?.length} onClick={() => activePlan && downloadPlan(type, activePlan.id, activePlan.plan_json ?? [])}><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Download CSV</TooltipContent></Tooltip>}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild><Button variant="secondary" size="icon-sm" aria-label="Plan actions"><Plus className="size-4" /></Button></DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Plan actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64 rounded-lg border-border p-1.5 shadow-lg">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">What would you like to do?</DropdownMenuLabel>
                <DropdownMenuItem className="h-auto cursor-pointer gap-3 rounded-md px-2 py-2.5 focus:bg-general-primary/10 focus:text-general-primary" onSelect={() => navigate("refine", active.id)}>
                  <RotateCw className="size-4 shrink-0" />
                  <span className="flex min-w-0 flex-col"><span className="text-sm font-medium">Refine plan</span><span className="text-xs text-muted-foreground">Adjust Plan #{active.id}</span></span>
                </DropdownMenuItem>
                <DropdownMenuItem className="h-auto cursor-pointer gap-3 rounded-md px-2 py-2.5 focus:bg-general-primary/10 focus:text-general-primary" onSelect={() => navigate("create")}>
                  <Plus className="size-4 shrink-0" />
                  <span className="flex min-w-0 flex-col"><span className="text-sm font-medium">New plan</span><span className="text-xs text-muted-foreground">Start a new {config.title.toLowerCase()} plan</span></span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" size="sm" onClick={viewPlans}>View plans</Button>
          </div>
        </div>}
        <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
          {readinessLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking strategy…</div>
            : !ready ? <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center"><p className="text-sm font-medium">{config.title} strategy is not ready yet</p><p className="mt-1 text-xs text-muted-foreground">Complete the {config.title.toLowerCase()} strategy workflow before creating plans.</p></div>
            : plans.isLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading plans…</div>
            : plans.isError ? <div role="alert" className="flex h-32 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-center text-sm text-destructive"><p>{errorMessage(plans.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => plans.refetch()}>Retry</Button></div>
            : !active ? <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center"><p className="text-sm font-medium">No active {config.title.toLowerCase()} plan</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">Create a new plan with Massic Agent or open plan history to review a proposed plan.</p><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={viewPlans}>View plans</Button><Button size="sm" onClick={() => navigate("create")}>New plan</Button></div></div>
            : detail.isLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading active plan…</div>
            : detail.isError ? <div role="alert" className="flex h-32 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-center text-sm text-destructive"><p>{errorMessage(detail.error)}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => detail.refetch()}>Retry</Button></div>
            : activePlan ? <AgentPlanTable plan={activePlan} type={type} showPlanHeader={false} renderAction={(item, index) => type === "webpage_plan" ? <WebAction businessId={businessId} item={item} index={index} /> : <SocialAction businessId={businessId} item={item} index={index} />} />
            : <p role="alert" className="p-4 text-sm text-destructive">The active plan does not match this strategy.</p>}
        </div>
      </Card>
  </>;
}
