"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentComposer } from "./agent-composer";
import { AgentComposerRow } from "./agent-composer-row";
import {
  PLAN_SURFACES,
  planActionMessage,
  resourcePlanSurface,
} from "./agent-model";
import { PlanSurfaceIcon } from "./agent-icons";
import type { AgentEntryAction } from "./agent-links";
import type { PlanSurface, ResourceRef, ResourceType } from "./types";
import styles from "./agent.module.css";

type Props = {
  value: string;
  onChange: (text: string) => void;
  preferredSurface?: PlanSurface;
  locked: boolean;
  resource: ResourceRef | null;
  selectedCount: number;
  totalCount: number;
  planValid?: boolean;
  planLoaded: boolean;
  onOpenPlans: () => void;
  onShowPlan: () => void;
  onSend: (message?: string, options?: { omitView?: boolean }) => void;
  onStop: () => void;
  streaming: boolean;
  stopping: boolean;
  disabled?: boolean;
  sendDisabled?: boolean;
  focusKey: string;
  centered?: boolean;
  preferredAction?: AgentEntryAction;
  attachments?: ReactNode;
};
export function AgentPlannerComposer(p: Props) {
  const busy = p.disabled || p.streaming || p.sendDisabled;
  const actionSurface = p.resource
    ? resourcePlanSurface(p.resource.type)
    : p.preferredSurface;
  const planType: ResourceType | null =
    p.resource?.type ??
    (actionSurface ? PLAN_SURFACES[actionSurface].resource : null);
  const createMessage = planType ? planActionMessage("create", planType) : null;
  const showQuickActions = !p.locked;
  const quickActionClass =
    "h-8 border-general-primary/15 bg-general-primary/5 text-xs text-general-primary shadow-sm hover:border-general-primary/30 hover:bg-general-primary hover:text-primary-foreground hover:shadow-md";
  const preferredClass =
    "border-general-primary bg-general-primary text-primary-foreground shadow-md hover:bg-general-primary/90";
  return (
    <AgentComposer
      value={p.value}
      onChange={p.onChange}
      onSend={() => p.onSend()}
      onStop={p.onStop}
      streaming={p.streaming}
      stopping={p.stopping}
      disabled={p.disabled}
      sendDisabled={p.sendDisabled}
      focusKey={p.focusKey}
      centered={p.centered}
      placeholder={
        p.resource ? "How would you like to refine this plan?" : "Ask Massic"
      }
      attachments={p.attachments}
      context={
        <>
          {" "}
          <AgentComposerRow visible={!!p.resource}>
            {p.resource && (
              <button
                type="button"
                onClick={p.onShowPlan}
                className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] cursor-pointer items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-[color,box-shadow] hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"
              >
                <PlanSurfaceIcon
                  surface={resourcePlanSurface(p.resource.type)}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span className="truncate">
                  Plan #{p.resource.id} · {p.selectedCount} selected
                </span>
              </button>
            )}
          </AgentComposerRow>
        </>
      }
      actions={
        <>
          {" "}
          <AgentComposerRow visible={showQuickActions}>
            <div
              className={cn(
                styles.softReveal,
                "mt-2 flex flex-wrap items-center gap-1.5 pb-1",
              )}
            >
              {!planType ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      p.onSend(planActionMessage("create", "webpage_plan"))
                    }
                    className={quickActionClass}
                  >
                    Create web plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      p.onSend(
                        planActionMessage("create", "social_channels_plan"),
                      )
                    }
                    className={quickActionClass}
                  >
                    Create social plan
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      p.onSend(
                        createMessage!,
                        p.resource ? { omitView: true } : undefined,
                      )
                    }
                    className={cn(
                      quickActionClass,
                      p.preferredAction === "create" && preferredClass,
                    )}
                  >
                    {p.resource ? "Create new plan" : "Create plan"}
                  </Button>
                  {!p.resource && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={p.onOpenPlans}
                      className={quickActionClass}
                    >
                      Open plan
                    </Button>
                  )}
                  {p.resource && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || !p.planLoaded}
                      onClick={() =>
                        p.onSend(planActionMessage("refine", p.resource!.type))
                      }
                      className={cn(
                        quickActionClass,
                        p.preferredAction === "refine" && preferredClass,
                      )}
                    >
                      Refine plan
                    </Button>
                  )}
                </>
              )}
            </div>
          </AgentComposerRow>
        </>
      }
    />
  );
}
