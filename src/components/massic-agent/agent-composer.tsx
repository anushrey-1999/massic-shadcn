"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { intentFor, resourceSurface } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import { cn } from "@/lib/utils";
import type { AgentEntryAction } from "./agent-links";
import type { PlanIntent, ResourceRef, Surface } from "./types";

type Props = {
  value: string; onChange: (text: string) => void; surface: Surface; locked: boolean;
  resource: ResourceRef | null; selectedCount: number; totalCount: number; planValid?: boolean;
  planLoaded: boolean; onOpenPlans: () => void; onShowPlan: () => void;
  onSend: (intent?: PlanIntent, override?: string) => void; onStop: () => void;
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
    el.style.height = "auto";
    const height = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${height}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    setExpanded(height > minHeight);
  }, [p.centered, p.value]);
  useEffect(() => { ref.current?.focus(); }, [p.focusKey]);
  const busy = p.disabled || p.streaming;
  const showQuickActions = !p.locked && !p.resource;
  const actionSurface = p.resource ? resourceSurface(p.resource.type) : p.surface;
  const action = (kind: "create" | "refine" | "activate", surface: Exclude<Surface, "global">) => p.onSend({ kind: intentFor(kind, surface) });
  const quickActionClass = "h-8 border-general-primary/15 bg-general-primary/5 text-xs text-general-primary shadow-sm hover:border-general-primary/30 hover:bg-general-primary hover:text-primary-foreground hover:shadow-md";
  const preferredClass = "border-general-primary bg-general-primary text-primary-foreground shadow-md hover:bg-general-primary/90";
  return <div className="w-full">
    <div className="flex w-full flex-col rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:shadow-md focus-within:border-general-primary/40 focus-within:shadow-md">
      {p.resource && <button type="button" onClick={p.onShowPlan} className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] cursor-pointer items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-[color,box-shadow] hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30">
        <SurfaceIcon surface={actionSurface} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Plan #{p.resource.id} · {p.selectedCount} selected</span>
      </button>}
      <div className="relative">
        <Textarea ref={ref} value={p.value} onChange={e => p.onChange(e.target.value)} aria-label="Message Massic Agent" rows={1} style={{ fieldSizing: "fixed" } as CSSProperties}
          placeholder={p.resource ? "How would you like to refine this plan?" : "How can I help you today?"}
          className={cn("min-h-0 max-h-[180px] resize-none overflow-y-hidden border-0 bg-transparent pr-14 pl-4 text-sm leading-5 shadow-none focus-visible:ring-0", p.centered ? "pt-[19px] pb-[13px]" : "pt-[15px] pb-[9px]")}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (p.value.trim() && !busy) p.onSend(); } }} />
        <div className={cn("absolute right-2 flex items-center transition-[top,bottom,transform] duration-150 motion-reduce:transition-none", expanded ? "bottom-2" : "top-1/2 -translate-y-1/2")}>
          {p.streaming ? <Button size="icon" onClick={p.onStop} disabled={p.stopping} aria-label={p.stopping ? "Stopping response" : "Stop response"} className="rounded-lg shadow-sm"><Square className="h-3.5 w-3.5 fill-current" /></Button>
            : <Button size="icon" onClick={() => p.onSend()} disabled={busy || !p.value.trim()} aria-label="Send message" className="rounded-lg shadow-sm"><ArrowUp className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
    {showQuickActions && <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {actionSurface === "global" ? <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", "webpages")} className={quickActionClass}>Create web plan</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", "social_channels")} className={quickActionClass}>Create social plan</Button>
      </> : <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", actionSurface)} className={cn(quickActionClass, p.preferredAction === "create" && preferredClass)}>{p.resource ? "Create new plan" : "Create plan"}</Button>
        {!p.resource && <Button variant="outline" size="sm" disabled={busy} onClick={p.onOpenPlans} className={quickActionClass}>Open plan</Button>}
        {p.resource && <Button variant="outline" size="sm" disabled={busy || !p.planLoaded} onClick={() => action("refine", actionSurface)} className={cn(quickActionClass, p.preferredAction === "refine" && preferredClass)}>Refine plan</Button>}
      </>}
    </div>}
  </div>;
}
