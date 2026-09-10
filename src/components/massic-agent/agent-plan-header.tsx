"use client";

import { ArrowLeft, CircleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SURFACES } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import type { AgentPlan, Surface } from "./types";

const shortDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
  : null;

export function AgentPlanHeader({ plan, planId, surface, onBack, onRefine, onActivate, onBackToChat, onClose, closeLabel = "Close plan and clear selection", activateDisabled, preferredAction, className }: {
  plan?: AgentPlan;
  planId: string | number;
  surface: Surface;
  onBack?: () => void;
  onRefine?: () => void;
  onActivate?: () => void;
  onBackToChat?: () => void;
  onClose?: () => void;
  closeLabel?: string;
  activateDisabled?: boolean;
  preferredAction?: "create" | "refine" | "activate";
  className?: string;
}) {
  const status = String(plan?.status ?? "").toLowerCase();
  const date = shortDate(status === "active" ? plan?.activated_at ?? plan?.proposed_at ?? plan?.created_at : plan?.proposed_at ?? plan?.created_at);
  return <div className={cn("flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2", className)}>
    <div className="flex min-w-0 items-center gap-2.5">
      {onBack && <Button variant="ghost" size="icon-sm" aria-label="Back to plans" onClick={onBack} className="hover:bg-general-primary/10 hover:text-general-primary"><ArrowLeft className="size-4" /></Button>}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary"><SurfaceIcon surface={surface} className="size-4" /></span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="truncate text-sm font-medium">{SURFACES[surface].label} plan #{planId}</h2>
          {status === "active" && <Badge variant="outline" className="h-5 border-general-primary/20 bg-general-primary/10 text-general-primary">Active</Badge>}
          {plan?.valid === false && <span className="inline-flex items-center gap-1 text-xs text-destructive"><CircleAlert className="size-3" />Needs attention</span>}
        </div>
        {date && <p className="mt-0.5 text-xs text-muted-foreground">{status === "active" ? "Activated" : "Proposed"} {date}</p>}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      {onRefine && <Button variant="outline" size="sm" onClick={onRefine} className={cn("border-general-primary/15 text-general-primary shadow-sm hover:bg-general-primary/10 hover:text-general-primary", preferredAction === "refine" && "bg-general-primary/10 ring-1 ring-general-primary/20")}>Refine plan</Button>}
      {plan && status !== "active" && onActivate && <Button size="sm" disabled={activateDisabled || plan.valid !== true} onClick={onActivate} title={plan.valid === false ? "Replace missing items before activating this plan." : "Activate this entire plan"} className={cn("shadow-sm", preferredAction === "activate" && "ring-2 ring-general-primary/25 ring-offset-1")}>Activate plan</Button>}
      {onBackToChat && <Button variant="ghost" size="sm" className="xl:hidden" onClick={onBackToChat}>Back to chat</Button>}
      {onClose && <Button variant="ghost" size="icon-sm" aria-label={closeLabel} className="hover:bg-general-primary/10 hover:text-general-primary" onClick={onClose}><X className="size-4" /></Button>}
    </div>
  </div>;
}
