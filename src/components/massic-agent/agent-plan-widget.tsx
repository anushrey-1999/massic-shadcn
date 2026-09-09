"use client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { cn } from "@/lib/utils";
import { allPlanIds, planItemId } from "./agent-model";
import type { AgentPlan, ResourceType } from "./types";

export function AgentPlanWidget({ plan, type, selectedIds, onSelection }: { plan: AgentPlan; type: ResourceType; selectedIds: string[]; onSelection: (ids: string[]) => void }) {
  const rows = plan.plan_json ?? [];
  const ids = allPlanIds(rows, type);
  const all = ids.length > 0 && ids.every(id => selectedIds.includes(id));
  const social = type === "social_channels_plan";
  const toggle = (id: string) => { if (id) onSelection(selectedIds.includes(id) ? selectedIds.filter(v => v !== id) : [...selectedIds, id]); };
  const cell = "px-3 py-3 text-left align-top";
  const number = (value?: number | null) => value == null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium">Detailed plan</span><Badge variant="outline">{plan.status}</Badge><span className="ml-auto text-xs text-muted-foreground">{rows.length} {social ? "campaigns" : "pages"}</span>
    </div>
    {plan.valid === false && <p className="border-b border-border bg-destructive/5 px-3 py-2 text-xs text-destructive">Some items are no longer in your strategy. Select and replace them before activating.</p>}
    <div className="min-h-0 flex-1 overflow-auto">
      <table className={cn("w-full table-fixed text-xs", social ? "min-w-[900px]" : "min-w-[940px]")}>
        <colgroup>
          <col className="w-11" />
          {social ? <><col className="w-[22%]" /><col className="w-[120px]" /><col className="w-[14%]" /><col className="w-[28%]" /><col className="w-[100px]" /><col className="w-[88px]" /></>
            : <><col className="w-[21%]" /><col className="w-[86px]" /><col className="w-[26%]" /><col className="w-[92px]" /><col className="w-[92px]" /><col className="w-[82px]" /><col className="w-[82px]" /></>}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted"><tr className="border-b border-border text-muted-foreground">
        <th className={cell}><Checkbox aria-label="Select all plan items" checked={all ? true : selectedIds.length ? "indeterminate" : false} disabled={!ids.length} onCheckedChange={() => onSelection(all ? [] : ids)} /></th>
        {(social ? ["Campaign", "Channel", "Content", "Rationale", "Relevance", "Status"] : ["Page", "Type", "Rationale", "Relevance", "Coverage", "Volume", "Status"]).map(title => <th key={title} className={cn(cell, "whitespace-nowrap font-medium")}>{title}</th>)}
      </tr></thead><tbody>
        {!rows.length && <tr><td colSpan={social ? 7 : 8} className="p-8 text-center text-muted-foreground">No items in this plan.</td></tr>}
        {rows.map((item, index) => {
          const id = planItemId(item, type); const label = item.cluster_name || item.title || id || `Item ${index + 1}`;
          return <tr key={id || index} onClick={() => toggle(id)} className={cn("border-b border-border transition-colors last:border-0 hover:bg-muted/40", id && "cursor-pointer", selectedIds.includes(id) && "bg-general-primary/5", item.valid === false && "bg-destructive/5")}>
            <td className={cell}><Checkbox aria-label={`Select ${label}`} checked={selectedIds.includes(id)} disabled={!id} onClick={e => e.stopPropagation()} onCheckedChange={() => toggle(id)} /></td>
            <td className={cn(cell, "break-words font-medium")}>{label}{social && item.campaign_name && <span className="mt-1 block break-words font-normal text-muted-foreground">{item.campaign_name}</span>}{item.valid === false && <span className="mt-1 block text-destructive">Missing from strategy</span>}</td>
            {social ? <><td className={cell}><span className="flex min-w-0 items-center gap-1.5"><ChannelIcon channel={item.channel_name} /><span className="min-w-0 truncate whitespace-nowrap" title={item.channel_name ?? undefined}>{item.channel_name ?? "—"}</span></span></td><td className={cell}>{item.content_type ?? "—"}</td></> : <td className={cell}>{item.page_type ?? "—"}</td>}
            <td className={cn(cell, "break-words text-muted-foreground")}><details className="group" onClick={e => e.stopPropagation()}><summary className="flex cursor-pointer list-none items-start gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><span className="line-clamp-3 min-w-0 flex-1 break-words group-open:hidden">{item.rationale ?? "No rationale provided"}</span><span className="hidden min-w-0 flex-1 group-open:inline">Hide rationale</span><ChevronDown className="mt-0.5 h-3 w-3 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary><p className="mt-2 whitespace-pre-wrap break-words px-1">{item.rationale ?? "No rationale provided"}</p></details></td>
            <td className={cn(cell, "tabular-nums")}>{number(social ? item.cluster_relevance : item.business_relevance_score)}</td>
            {!social && <><td className={cell}>{item.coverage == null ? "—" : `${Math.round(item.coverage * 100)}%`}</td><td className={cell}>{number(item.search_volume)}</td></>}
            <td className={cell}><Badge variant="outline">{item.status ?? "Unknown"}</Badge></td>
          </tr>;
        })}
      </tbody></table>
    </div>
    <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">{selectedIds.length} selected{selectedIds.length > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onSelection([])}>Clear selection</Button>}</div>
  </div>;
}
