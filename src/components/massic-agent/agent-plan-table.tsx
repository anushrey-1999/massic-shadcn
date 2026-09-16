"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { ExpandablePills } from "@/components/ui/expandable-pills";
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

export function AgentPlanTable({ plan, type, selectedIds = [], onSelection, renderAction, initialVisibleCount, showPlanHeader = true, className }: PlanTableProps) {
  const rows = plan.plan_json ?? [];
  const social = type === "social_channels_plan";
  const selectable = Boolean(onSelection);
  const ids = allPlanIds(rows, type);
  const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
  const [visibleCount, setVisibleCount] = React.useState(initialVisibleCount ?? Number.POSITIVE_INFINITY);

  React.useEffect(() => {
    setVisibleCount(initialVisibleCount ?? Number.POSITIVE_INFINITY);
  }, [plan.id, initialVisibleCount]);

  const visible = rows.map((item, index) => ({ item, index })).slice(0, visibleCount);
  const remaining = Math.max(0, rows.length - visible.length);
  const toggle = (id: string) => {
    if (!id || !onSelection) return;
    onSelection(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
  };
  const cell = "px-3 py-3 text-left align-top";
  const columns = (selectable ? 1 : 0) + 5 + (renderAction ? 1 : 0);

  return <div className={cn("flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}>
    {showPlanHeader && <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium">Detailed plan</span>
      <Badge variant="outline" className="capitalize">{plan.status}</Badge>
      <Badge variant="outline" className={cn(plan.valid === false && "border-destructive/30 text-destructive")}>{plan.valid === false ? "Needs attention" : "Valid"}</Badge>
      <span className="ml-auto text-xs text-muted-foreground">{rows.length} {social ? "tactics" : "web pages"}</span>
    </div>}
    {plan.valid === false && <p className="border-b border-border bg-destructive/5 px-3 py-2 text-xs text-destructive">Some items are no longer in your strategy. Replace them before activating this plan.</p>}
    <div className="min-h-0 flex-1 overflow-auto">
      <table className={cn("w-full table-fixed text-sm", social ? "min-w-[1120px]" : "min-w-[1060px]")}>
        <colgroup>
          {selectable && <col className="w-11" />}
          {social ? <><col className="w-[130px]" /><col className="w-[150px]" /><col className="w-[240px]" /><col className="w-[300px]" /><col className="w-[300px]" /></>
            : <><col className="w-[260px]" /><col className="w-[140px]" /><col className="w-[100px]" /><col className="w-[260px]" /><col className="w-[300px]" /></>}
          {renderAction && <col className="w-[100px]" />}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted"><tr className="border-b border-border text-muted-foreground">
          {selectable && <th className={cell}><Checkbox aria-label="Select all plan items" checked={allSelected ? true : selectedIds.length ? "indeterminate" : false} disabled={!ids.length} onCheckedChange={() => onSelection?.(allSelected ? [] : ids)} /></th>}
          {(social
            ? ["Channel", "Type", "Title", "Description", "Rationale"]
            : ["Page", "Type", "Coverage", "Sub Topics", "Rationale"]
          ).map(title => <th key={title} className={cn(cell, "whitespace-nowrap font-medium")}>{title}</th>)}
          {renderAction && <th className={cn(cell, "whitespace-nowrap text-right font-medium")}>Actions</th>}
        </tr></thead>
        <tbody>
          {!rows.length && <tr><td colSpan={columns} className="p-8 text-center text-muted-foreground">No items in this plan.</td></tr>}
          {visible.map(({ item, index }) => {
            const id = planItemId(item, type);
            const label = item.cluster_name || item.title || id || `Item ${index + 1}`;
            return <tr key={`${id || "item"}-${index}`} onClick={() => toggle(id)} className={cn("border-b border-border transition-colors last:border-0 hover:bg-muted/40", selectable && id && "cursor-pointer", selectedIds.includes(id) && "bg-general-primary/5", item.valid === false && "bg-destructive/5")}>
              {selectable && <td className={cell}><Checkbox aria-label={`Select ${label}`} checked={selectedIds.includes(id)} disabled={!id} onClick={event => event.stopPropagation()} onCheckedChange={() => toggle(id)} /></td>}
              {social ? <>
                <td className={cell}><span className="flex min-w-0 items-center gap-1.5"><ChannelIcon channel={item.channel_name} /><span className="min-w-0 truncate whitespace-nowrap" title={item.channel_name ?? undefined}>{item.channel_name ?? "—"}</span></span></td>
                <td className={cn(cell, "break-words")}>{item.content_type ?? "—"}</td>
                <td className={cn(cell, "break-words font-medium")}>{item.title ?? "—"}{item.valid === false && <span className="mt-1 block font-normal text-destructive">Missing from strategy</span>}</td>
                <td className={cn(cell, "break-words text-muted-foreground")}>{item.description ?? "—"}</td>
                <td className={cn(cell, "break-words text-muted-foreground")}>{item.rationale ?? "—"}</td>
              </> : <>
                <td className={cn(cell, "break-words font-medium")}>{label}{item.valid === false && <span className="mt-1 block font-normal text-destructive">Missing from strategy</span>}</td>
                <td className={cell}>{item.page_type ?? "—"}</td>
                <td className={cell}>{item.coverage ?? 0}</td>
                <td className={cell} onClick={event => event.stopPropagation()}><ExpandablePills items={item.supporting_keywords ?? []} pillVariant="outline" /></td>
                <td className={cn(cell, "break-words text-muted-foreground")}>{item.rationale ?? "—"}</td>
              </>}
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
