"use client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { agentKeys, errorMessage, getPlans } from "./agent-api";
import { SurfaceIcon } from "./agent-icons";
import type { ResourceRef, ResourceType } from "./types";
export function AgentPlanPicker({ businessId, type, open, onOpenChange, onPick }: { businessId: string; type: ResourceType; open: boolean; onOpenChange: (open: boolean) => void; onPick: (resource: ResourceRef) => void }) {
  const query = useQuery({ queryKey: agentKeys.plans(businessId, type), queryFn: ({ signal }) => getPlans(businessId, type, signal), enabled: open, retry: false });
  const surface = type === "webpage_plan" ? "webpages" : "social_channels";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Open {type === "webpage_plan" ? "web" : "social"} plan</DialogTitle><DialogDescription>Choose a plan to view, refine, or activate.</DialogDescription></DialogHeader>
    <div className="max-h-[60vh] space-y-1 overflow-y-auto p-1">{query.isLoading ? <p role="status">Loading plans…</p> : query.isError ? <div role="alert"><p>{errorMessage(query.error)}</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : !query.data?.length ? <p className="py-6 text-center text-sm text-muted-foreground">No plans yet. Create one from the chat.</p> : query.data.map(plan => <button key={plan.id} className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-3 text-left transition-[background-color,box-shadow] hover:bg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={() => { onPick({ type, id: plan.id }); onOpenChange(false); }}><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-general-primary/10 text-general-primary"><SurfaceIcon surface={surface} /></span><span className="flex-1 text-sm">Plan #{plan.id}</span><Badge variant="outline">{plan.status}</Badge>{plan.valid === false && <span className="text-xs text-destructive">Needs refinement</span>}</button>)}</div>
  </DialogContent></Dialog>;
}
