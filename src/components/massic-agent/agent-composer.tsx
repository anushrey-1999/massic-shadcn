"use client";
import { useEffect, useRef } from "react";
import { ArrowUp, ChevronDown, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SURFACES, intentFor } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import { cn } from "@/lib/utils";
import type { AgentEntryAction } from "./agent-links";
import type { PlanIntent, ResourceRef, Surface } from "./types";

type Props = {
  value: string; onChange: (text: string) => void; surface: Surface; locked: boolean;
  onSurface: (surface: Surface) => void;
  resource: ResourceRef | null; selectedCount: number; totalCount: number; planValid?: boolean;
  planLoaded: boolean; onOpenPlans: () => void; onShowPlan: () => void;
  onSend: (intent?: PlanIntent, override?: string) => void; onStop: () => void;
  streaming: boolean; stopping: boolean; disabled?: boolean; focusKey: string;
  preferredAction?: AgentEntryAction;
};
export function AgentComposer(p: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(Math.max(el.scrollHeight, 84), 220)}px`; } }, [p.value]);
  useEffect(() => { ref.current?.focus(); }, [p.focusKey]);
  const busy = p.disabled || p.streaming;
  const showQuickActions = !p.locked || Boolean(p.resource);
  const action = (kind: "create" | "refine" | "activate", surface: Exclude<Surface, "global">) => p.onSend({ kind: intentFor(kind, surface) });
  const quickActionClass = "h-8 border-general-primary/15 bg-general-primary/5 text-xs text-general-primary shadow-sm hover:border-general-primary/30 hover:bg-general-primary hover:text-primary-foreground hover:shadow-md";
  const preferredClass = "border-general-primary bg-general-primary text-primary-foreground shadow-md hover:bg-general-primary/90";
  const refineHint = p.selectedCount === 0 ? "Refine replaces unfinished items and keeps completed items."
    : p.selectedCount === p.totalCount ? "Refine replaces all items, including completed items." : `Refine replaces only the ${p.selectedCount} selected ${p.selectedCount === 1 ? "item" : "items"}.`;
  return <div className="w-full">
    <div className="flex w-full flex-col rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:shadow-md focus-within:border-general-primary/40 focus-within:shadow-md">
      {p.resource && <button type="button" onClick={p.onShowPlan} className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] cursor-pointer items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-[color,box-shadow] hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30">
        <SurfaceIcon surface={p.surface} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Plan #{p.resource.id} · {p.selectedCount} selected</span>
      </button>}
      <Textarea ref={ref} value={p.value} onChange={e => p.onChange(e.target.value)} aria-label="Message Massic Agent"
        placeholder={p.resource ? "How would you like to refine this plan?" : "How can I help you today?"}
        className="min-h-[84px] max-h-[220px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-sm shadow-none focus-visible:ring-0"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (p.value.trim() && !busy) p.onSend(); } }} />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <div className="flex min-w-0 items-center gap-1">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" aria-label="Choose chat mode" className="h-9 gap-1.5 border-general-primary/15 bg-general-primary/5 px-2.5 text-xs text-general-primary shadow-sm hover:border-general-primary/30 hover:bg-general-primary/10 hover:text-general-primary"><SurfaceIcon surface={p.surface} /><span>{SURFACES[p.surface].label}</span><ChevronDown className="h-3.5 w-3.5 opacity-70" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">{(Object.keys(SURFACES) as Surface[]).map(surface => <DropdownMenuItem key={surface} onClick={() => p.onSurface(surface)} className="cursor-pointer gap-2"><SurfaceIcon surface={surface} />{SURFACES[surface].label}{p.locked && <span className="ml-auto text-xs text-muted-foreground">New chat</span>}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
        </div>
        {p.streaming ? <Button size="icon" onClick={p.onStop} disabled={p.stopping} aria-label={p.stopping ? "Stopping response" : "Stop response"} className="rounded-lg shadow-sm"><Square className="h-3.5 w-3.5 fill-current" /></Button>
          : <Button size="icon" onClick={() => p.onSend()} disabled={busy || !p.value.trim()} aria-label="Send message" className="rounded-lg shadow-sm"><ArrowUp className="h-4 w-4" /></Button>}
      </div>
    </div>
    {showQuickActions && <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {p.surface === "global" ? <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", "webpages")} className={quickActionClass}>Create webpage plan</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", "social_channels")} className={quickActionClass}>Create social plan</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => p.onSend(undefined, ["Create and save a new webpage plan and a new social channels plan now. Complete both plans before replying.", p.value.trim()].filter(Boolean).join("\n\n"))} className={quickActionClass}>Create both</Button>
      </> : <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => action("create", p.surface as Exclude<Surface, "global">)} className={cn(quickActionClass, p.preferredAction === "create" && preferredClass)}>{p.resource ? "Create new plan" : "Create plan"}</Button>
        {!p.resource && <Button variant="outline" size="sm" disabled={busy} onClick={p.onOpenPlans} className={quickActionClass}>Open plan</Button>}
        {p.resource && <Button variant="outline" size="sm" disabled={busy || !p.planLoaded} onClick={() => action("refine", p.surface as Exclude<Surface, "global">)} className={cn(quickActionClass, p.preferredAction === "refine" && preferredClass)}>Refine plan</Button>}
      </>}
    </div>}
    {p.resource && <p className="mt-1 px-2 text-xs text-muted-foreground">{p.planValid === false ? "Replace missing items before activating this plan. " : ""}{refineHint}</p>}
  </div>;
}
