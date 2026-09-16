"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { cn } from "@/lib/utils";
import { allPlanIds, planItemId } from "./agent-model";
import { PlanMetaField, PlanTypeSlot } from "./agent-plan-item-meta";
import type { AgentPlan, PlanItem, ResourceType } from "./types";

type AgentPlanListProps = {
  plan: AgentPlan;
  type: ResourceType;
  selectedIds: string[];
  onSelection: (ids: string[]) => void;
  className?: string;
};

const itemTitle = (item: PlanItem, social: boolean, fallback: string) =>
  (social ? item.title || item.cluster_name : item.cluster_name || item.title) || fallback;

function PlanListRow({ item, type, selected, expanded, onToggleSelected, onToggleExpanded, fallbackLabel }: {
  item: PlanItem;
  type: ResourceType;
  selected: boolean;
  expanded: boolean;
  onToggleSelected?: () => void;
  onToggleExpanded: () => void;
  fallbackLabel: string;
}) {
  const social = type === "social_channels_plan";
  const label = itemTitle(item, social, fallbackLabel);
  const invalid = item.valid === false;

  return <li className="flex items-start gap-2">
    <span className="flex h-10 shrink-0 items-center">
      <Checkbox aria-label={`Select ${label}`} checked={selected} disabled={!onToggleSelected} onCheckedChange={() => onToggleSelected?.()} />
    </span>
    <div className={cn(
      "min-w-0 flex-1 rounded-lg border bg-white transition-colors",
      invalid ? "border-destructive/30 bg-destructive/5" : "border-general-border/60",
      selected && !invalid && "border-general-primary/30 bg-general-primary/5",
      expanded && "shadow-xs"
    )}>
      <button type="button" aria-expanded={expanded} onClick={onToggleExpanded}
        className="flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-3 p-2 text-left">
        <span className="min-w-0 flex-1 truncate text-sm text-general-secondary-foreground" title={label}>{label}</span>
        {social && <span className="flex shrink-0 items-center gap-1.5 text-xs text-general-muted-foreground">
          <ChannelIcon channel={item.channel_name} className="size-[15px] rounded-[3px]" />
          <span>{item.channel_name || "—"}</span>
        </span>}
        <PlanTypeSlot type={social ? item.content_type : item.page_type} />
      </button>
      {expanded && <div className="border-t border-general-border/60 px-2 pb-2 pt-2">
        {invalid && <p className="mb-2 text-xs text-destructive">Missing from strategy</p>}
        <div className="grid gap-3">
          {social ? <>
            <PlanMetaField label="Description">{item.description}</PlanMetaField>
            <PlanMetaField label="Rationale">{item.rationale}</PlanMetaField>
          </> : <>
            <PlanMetaField label="Coverage">{item.coverage ?? 0}</PlanMetaField>
            <PlanMetaField label="Sub topics"><ExpandablePills items={item.supporting_keywords ?? []} pillVariant="outline" /></PlanMetaField>
            <PlanMetaField label="Rationale">{item.rationale}</PlanMetaField>
          </>}
        </div>
      </div>}
    </div>
  </li>;
}

export function AgentPlanList({ plan, type, selectedIds, onSelection, className }: AgentPlanListProps) {
  const rows = plan.plan_json ?? [];
  const ids = allPlanIds(rows, type);
  const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => setExpandedId(null), [plan.id, type]);

  const toggleSelected = (id: string) => {
    if (!id) return;
    onSelection(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
  };

  return <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3", className)}>
    <div className="flex min-h-6 shrink-0 items-center justify-between gap-3">
      <p className="text-xs text-general-muted-foreground">Select the plan items you want to refine.</p>
      <Button variant="secondary" size="sm" disabled={!ids.length}
        className="h-6 shrink-0 rounded-full px-2 text-[10px] font-medium text-general-muted-foreground"
        onClick={() => onSelection(allSelected ? [] : ids)}>
        {allSelected ? "Deselect all" : "Select all"}
      </Button>
    </div>
    {plan.valid === false && <p role="alert" className="shrink-0 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">Some items are no longer in your strategy. Replace them before activating this plan.</p>}
    {rows.length
      ? <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
          {rows.map((item, index) => {
            const id = planItemId(item, type);
            const key = `${id || "item"}-${index}`;
            return <PlanListRow key={key} item={item} type={type} fallbackLabel={`Item ${index + 1}`}
              selected={selectedIds.includes(id)}
              expanded={expandedId === key}
              onToggleSelected={id ? () => toggleSelected(id) : undefined}
              onToggleExpanded={() => setExpandedId(current => current === key ? null : key)} />;
          })}
        </ul>
      : <p className="flex min-h-0 flex-1 items-center justify-center text-xs text-general-muted-foreground">No items in this plan.</p>}
    <div className="flex min-h-5 shrink-0 items-center gap-2 text-xs text-general-muted-foreground">
      {selectedIds.length} selected
      {selectedIds.length > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onSelection([])}>Clear selection</Button>}
    </div>
  </div>;
}
