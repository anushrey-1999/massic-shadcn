"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { cn } from "@/lib/utils";
import { allPlanIds, planItemId } from "./agent-model";
import type { AgentPlan, PlanItem, ResourceType } from "./types";

type PlanTableProps = {
  plan: AgentPlan;
  type: ResourceType;
  selectedIds?: string[];
  onSelection?: (ids: string[]) => void;
  renderAction?: (item: PlanItem, index: number) => React.ReactNode;
  initialVisibleCount?: number;
  showPlanHeader?: boolean;
  className?: string;
};

const number = (value?: number | null) => value == null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const relevance = (item: PlanItem, social: boolean) => Number(social ? item.cluster_relevance ?? 0 : item.business_relevance_score ?? 0);

export function AgentPlanTable({ plan, type, selectedIds = [], onSelection, renderAction, initialVisibleCount, showPlanHeader = true, className }: PlanTableProps) {
  const rows = plan.plan_json ?? [];
  const social = type === "social_channels_plan";
  const selectable = Boolean(onSelection);
  const ids = allPlanIds(rows, type);
  const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
  const [sort, setSort] = React.useState<"asc" | "desc" | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(initialVisibleCount ?? Number.POSITIVE_INFINITY);

  React.useEffect(() => {
    setSort(null);
    setVisibleCount(initialVisibleCount ?? Number.POSITIVE_INFINITY);
  }, [plan.id, initialVisibleCount]);

  const sorted = React.useMemo(() => {
    const indexed = rows.map((item, index) => ({ item, index }));
    if (!sort) return indexed;
    const direction = sort === "asc" ? 1 : -1;
    return indexed.sort((a, b) => (relevance(a.item, social) - relevance(b.item, social)) * direction);
  }, [rows, social, sort]);
  const visible = sorted.slice(0, visibleCount);
  const remaining = Math.max(0, sorted.length - visible.length);
  const toggle = (id: string) => {
    if (!id || !onSelection) return;
    onSelection(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
  };
  const cell = "px-3 py-3 text-left align-top";
  const columns = (selectable ? 1 : 0) + (social ? 6 : 7) + (renderAction ? 1 : 0);

  return <div className={cn("flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}>
    {showPlanHeader && <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium">Detailed plan</span>
      <Badge variant="outline" className="capitalize">{plan.status}</Badge>
      <Badge variant="outline" className={cn(plan.valid === false && "border-destructive/30 text-destructive")}>{plan.valid === false ? "Needs attention" : "Valid"}</Badge>
      <span className="ml-auto text-xs text-muted-foreground">{rows.length} {social ? "tactics" : "web pages"}</span>
    </div>}
    {plan.valid === false && <p className="border-b border-border bg-destructive/5 px-3 py-2 text-xs text-destructive">Some items are no longer in your strategy. Replace them before activating this plan.</p>}
    <div className="min-h-0 flex-1 overflow-auto">
      <table className={cn("w-full table-fixed text-xs", social ? "min-w-[900px]" : "min-w-[940px]")}>
        <colgroup>
          {selectable && <col className="w-11" />}
          {social ? <><col className="w-[22%]" /><col className="w-[120px]" /><col className="w-[14%]" /><col className="w-[28%]" /><col className="w-[100px]" /><col className="w-[88px]" /></>
            : <><col className="w-[21%]" /><col className="w-[86px]" /><col className="w-[26%]" /><col className="w-[92px]" /><col className="w-[92px]" /><col className="w-[82px]" /><col className="w-[82px]" /></>}
          {renderAction && <col className="w-[72px]" />}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted"><tr className="border-b border-border text-muted-foreground">
          {selectable && <th className={cell}><Checkbox aria-label="Select all plan items" checked={allSelected ? true : selectedIds.length ? "indeterminate" : false} disabled={!ids.length} onCheckedChange={() => onSelection?.(allSelected ? [] : ids)} /></th>}
          {(social ? ["Tactic", "Channel", "Type", "Rationale"] : ["Page", "Type", "Rationale"]).map(title => <th key={title} className={cn(cell, "whitespace-nowrap font-medium")}>{title}</th>)}
          <th className={cn(cell, "whitespace-nowrap font-medium")}><button type="button" className="flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={() => setSort(current => current === "desc" ? "asc" : current === "asc" ? null : "desc")} aria-label="Sort by relevance">Relevance{sort === "asc" ? <ChevronUp className="h-3 w-3" /> : sort === "desc" ? <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-60" />}</button></th>
          {!social && <><th className={cn(cell, "whitespace-nowrap font-medium")}>Coverage</th><th className={cn(cell, "whitespace-nowrap font-medium")}>Volume</th></>}
          <th className={cn(cell, "whitespace-nowrap font-medium")}>Status</th>
          {renderAction && <th className={cn(cell, "whitespace-nowrap text-right font-medium")}>Action</th>}
        </tr></thead>
        <tbody>
          {!rows.length && <tr><td colSpan={columns} className="p-8 text-center text-muted-foreground">No items in this plan.</td></tr>}
          {visible.map(({ item, index }) => {
            const id = planItemId(item, type);
            const label = item.cluster_name || item.title || id || `Item ${index + 1}`;
            return <tr key={`${id || "item"}-${index}`} onClick={() => toggle(id)} className={cn("border-b border-border transition-colors last:border-0 hover:bg-muted/40", selectable && id && "cursor-pointer", selectedIds.includes(id) && "bg-general-primary/5", item.valid === false && "bg-destructive/5")}>
              {selectable && <td className={cell}><Checkbox aria-label={`Select ${label}`} checked={selectedIds.includes(id)} disabled={!id} onClick={event => event.stopPropagation()} onCheckedChange={() => toggle(id)} /></td>}
              <td className={cn(cell, "break-words font-medium")}>{label}{social && item.campaign_name && <span className="mt-1 block break-words font-normal text-muted-foreground">{item.campaign_name}</span>}{item.valid === false && <span className="mt-1 block text-destructive">Missing from strategy</span>}</td>
              {social ? <><td className={cell}><span className="flex min-w-0 items-center gap-1.5"><ChannelIcon channel={item.channel_name} /><span className="min-w-0 truncate whitespace-nowrap" title={item.channel_name ?? undefined}>{item.channel_name ?? "—"}</span></span></td><td className={cell}>{item.content_type ?? "—"}</td></> : <td className={cell}>{item.page_type ?? "—"}</td>}
              <td className={cn(cell, "break-words text-muted-foreground")}><details className="group relative" onClick={event => event.stopPropagation()}><summary aria-label="Toggle rationale" className="flex cursor-pointer list-none items-start gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30 group-open:absolute group-open:top-0 group-open:right-0 group-open:z-10 group-open:p-1"><span className="line-clamp-3 min-w-0 flex-1 break-words group-open:hidden">{item.rationale ?? "No rationale provided"}</span><ChevronDown className="mt-0.5 ml-auto h-3 w-3 shrink-0 transition-transform duration-200 group-open:mt-0 group-open:rotate-180 motion-reduce:transition-none" /></summary><button type="button" aria-label="Collapse rationale" className="w-full cursor-pointer whitespace-pre-wrap break-words rounded px-1 pr-5 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>{item.rationale ?? "No rationale provided"}</button></details></td>
              <td className={cn(cell, "tabular-nums")}>{number(social ? item.cluster_relevance : item.business_relevance_score)}</td>
              {!social && <><td className={cell}>{item.coverage == null ? "—" : `${Math.round(item.coverage * 100)}%`}</td><td className={cell}>{number(item.search_volume)}</td></>}
              <td className={cell}><Badge variant="outline" className="capitalize">{item.status?.replaceAll("_", " ") ?? "Unknown"}</Badge></td>
              {renderAction && <td className={cn(cell, "text-right")} onClick={event => event.stopPropagation()}>{renderAction(item, index)}</td>}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    {(selectable || remaining > 0) && <div className="flex min-h-10 items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
      {selectable && <>{selectedIds.length} selected{selectedIds.length > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onSelection?.([])}>Clear selection</Button>}</>}
      {remaining > 0 && <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setVisibleCount(count => count + Math.min(20, remaining))}>+ {Math.min(20, remaining)} more</Button>}
    </div>}
  </div>;
}
