"use client";
import { useEffect, useRef } from "react";
import { ArrowUp, Plus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SURFACES, intentFor } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import type { PlanIntent, ResourceRef, Surface } from "./types";

type Props = {
  value: string; onChange: (text: string) => void; surface: Surface; locked: boolean;
  onSurface: (surface: Surface) => void; onClearMode: () => void;
  resource: ResourceRef | null; selectedCount: number; totalCount: number; planValid?: boolean;
  planLoaded: boolean; onOpenPlans: () => void; onShowPlan: () => void;
  onSend: (intent?: PlanIntent, override?: string) => void; onStop: () => void;
  streaming: boolean; stopping: boolean; disabled?: boolean; focusKey: string;
};
export function AgentComposer(p: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(Math.max(el.scrollHeight, 84), 220)}px`; } }, [p.value]);
  useEffect(() => { ref.current?.focus(); }, [p.focusKey]);
  const busy = p.disabled || p.streaming;
  const action = (kind: "create" | "refine" | "activate", surface: Exclude<Surface, "global">) => p.onSend({ kind: intentFor(kind, surface) });
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
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Choose chat mode"><Plus className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">{(Object.keys(SURFACES) as Surface[]).map(surface => <DropdownMenuItem key={surface} onClick={() => p.onSurface(surface)} className="cursor-pointer gap-2"><SurfaceIcon surface={surface} />{SURFACES[surface].label}{p.locked && <span className="ml-auto text-xs text-muted-foreground">New chat</span>}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"><SurfaceIcon surface={p.surface} />{SURFACES[p.surface].label}
            {!p.locked && <button type="button" className="cursor-pointer rounded p-0.5 transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={p.onClearMode} aria-label="Clear mode" title="Clear mode"><X className="h-3 w-3" /></button>}
          </div>
        </div>
        {p.streaming ? <Button size="icon-sm" onClick={p.onStop} disabled={p.stopping} aria-label={p.stopping ? "Stopping response" : "Stop response"}><Square className="h-3.5 w-3.5 fill-current" /></Button>
          : <Button size="icon-sm" onClick={() => p.onSend()} disabled={busy || !p.value.trim()} aria-label="Send message"><ArrowUp className="h-4 w-4" /></Button>}
      </div>
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {p.surface === "global" ? <>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => action("create", "webpages")} className="h-8 text-xs">Create webpage plan</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => action("create", "social_channels")} className="h-8 text-xs">Create social plan</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => p.onSend(undefined, ["Create and save a new webpage plan and a new social channels plan now. Complete both plans before replying.", p.value.trim()].filter(Boolean).join("\n\n"))} className="h-8 text-xs">Create both</Button>
      </> : <>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => action("create", p.surface as Exclude<Surface, "global">)} className="h-8 text-xs">{p.resource ? "Create new plan" : "Create plan"}</Button>
        {!p.resource && <Button variant="ghost" size="sm" disabled={busy} onClick={p.onOpenPlans} className="h-8 text-xs">Open plan</Button>}
        {p.resource && <><Button variant="ghost" size="sm" disabled={busy || !p.planLoaded} onClick={() => action("refine", p.surface as Exclude<Surface, "global">)} className="h-8 text-xs">Refine plan</Button>
          <Button variant="outline" size="sm" disabled={busy || !p.planLoaded || p.planValid !== true} onClick={() => action("activate", p.surface as Exclude<Surface, "global">)} className="h-8 text-xs" title="Activates the whole plan">Activate plan</Button></>}
      </>}
    </div>
    {p.resource && <p className="mt-1 px-2 text-xs text-muted-foreground">{p.planValid === false ? "Replace missing items before activating this plan. " : ""}{refineHint}</p>}
  </div>;
}
