"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { planActionMessage, resourceSurface, SURFACES } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import { AgentComposerRow } from "./agent-composer-row";
import styles from "./agent.module.css";
import { cn } from "@/lib/utils";
import type { AgentEntryAction } from "./agent-links";
import type { ResourceRef, ResourceType, Surface } from "./types";

type Props = {
  value: string; onChange: (text: string) => void; preferredSurface?: Exclude<Surface, "global">; locked: boolean;
  resource: ResourceRef | null; selectedCount: number; totalCount: number; planValid?: boolean;
  planLoaded: boolean; onOpenPlans: () => void; onShowPlan: () => void;
  onSend: (message?: string, options?: { omitView?: boolean }) => void; onStop: () => void;
  streaming: boolean; stopping: boolean; disabled?: boolean; focusKey: string;
  centered?: boolean;
  preferredAction?: AgentEntryAction;
};
export function AgentComposer(p: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const minHeight = p.centered ? 52 : 44;
    const maxHeight = 180;
    // Measure an invisible clone so the live textarea never snaps through auto height.
    const measure = el.cloneNode() as HTMLTextAreaElement;
    measure.value = p.value;
    measure.removeAttribute("id");
    measure.removeAttribute("aria-label");
    measure.setAttribute("aria-hidden", "true");
    measure.tabIndex = -1;
    Object.assign(measure.style, { position: "absolute", visibility: "hidden", pointerEvents: "none", height: "0px", minHeight: "0px", width: `${el.getBoundingClientRect().width}px`, transition: "none" });
    el.parentElement!.appendChild(measure);
    const measured = measure.scrollHeight;
    measure.remove();
    const height = Math.min(Math.max(measured, minHeight), maxHeight);
    el.style.height = `${height}px`;
    el.style.overflowY = measured > maxHeight ? "auto" : "hidden";
    setExpanded(height > minHeight);
  }, [p.centered, p.value]);
  useEffect(() => { ref.current?.focus(); }, [p.focusKey]);
  const busy = p.disabled || p.streaming;
  const actionSurface = p.resource ? resourceSurface(p.resource.type) : p.preferredSurface;
  const planType: ResourceType | null = p.resource?.type ?? (actionSurface ? SURFACES[actionSurface].resource : null);
  const createMessage = planType ? planActionMessage("create", planType) : null;
  const showQuickActions = !p.locked;
  const quickActionClass = "h-8 border-general-primary/15 bg-general-primary/5 text-xs text-general-primary shadow-sm hover:border-general-primary/30 hover:bg-general-primary hover:text-primary-foreground hover:shadow-md";
  const preferredClass = "border-general-primary bg-general-primary text-primary-foreground shadow-md hover:bg-general-primary/90";
  return <div className="w-full">
    <div className="flex w-full flex-col rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:shadow-md focus-within:border-general-primary/40 focus-within:shadow-md">
      <AgentComposerRow visible={!!p.resource}>{p.resource && <button type="button" onClick={p.onShowPlan} className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] cursor-pointer items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-[color,box-shadow] hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30">
        <SurfaceIcon surface={actionSurface ?? "global"} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Plan #{p.resource.id} · {p.selectedCount} selected</span>
      </button>}</AgentComposerRow>
      <div className="relative">
        <Textarea ref={ref} value={p.value} onChange={e => p.onChange(e.target.value)} aria-label="Message Massic Agent" rows={1} style={{ fieldSizing: "fixed" } as CSSProperties}
          placeholder={p.resource ? "How would you like to refine this plan?" : "Ask Massic"}
          className={cn(styles.composerTextarea, "min-h-0 max-h-[180px] resize-none overflow-y-hidden border-0 bg-transparent pr-14 pl-4 text-sm leading-5 shadow-none focus-visible:ring-0", p.centered ? "py-4" : "py-3")}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (p.value.trim() && !busy) p.onSend(); } }} />
        <div className={cn("absolute right-2 flex items-center transition-[top,bottom,transform] duration-150 motion-reduce:transition-none", expanded ? "top-[calc(100%-44px)]" : "top-[calc(50%-18px)]")}>
          {p.streaming ? <Button size="icon" onClick={p.onStop} disabled={p.stopping} aria-label={p.stopping ? "Stopping response" : "Stop response"} className="rounded-lg shadow-sm"><Square className="h-3.5 w-3.5 fill-current" /></Button>
            : <Button size="icon" onClick={() => p.onSend()} disabled={busy || !p.value.trim()} aria-label="Send message" className="rounded-lg shadow-sm"><SendHorizontal className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
    <AgentComposerRow visible={showQuickActions}><div className={cn(styles.softReveal, "mt-2 flex flex-wrap items-center gap-1.5 pb-1")}>
      {!planType ? <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => p.onSend(planActionMessage("create", "webpage_plan"))} className={quickActionClass}>Create web plan</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => p.onSend(planActionMessage("create", "social_channels_plan"))} className={quickActionClass}>Create social plan</Button>
      </> : <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => p.onSend(createMessage!, p.resource ? { omitView: true } : undefined)} className={cn(quickActionClass, p.preferredAction === "create" && preferredClass)}>{p.resource ? "Create new plan" : "Create plan"}</Button>
        {!p.resource && <Button variant="outline" size="sm" disabled={busy} onClick={p.onOpenPlans} className={quickActionClass}>Open plan</Button>}
        {p.resource && <Button variant="outline" size="sm" disabled={busy || !p.planLoaded} onClick={() => p.onSend(planActionMessage("refine", p.resource!.type))} className={cn(quickActionClass, p.preferredAction === "refine" && preferredClass)}>Refine plan</Button>}
      </>}
    </div></AgentComposerRow>
  </div>;
}
