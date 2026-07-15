"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RelevancePill } from "@/components/ui/relevance-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPlan, getWebpageCatalog } from "./agent-api";
import type { AgentPlan, PlanPageRef, WebpageItem, WidgetPart } from "./types";

const NON_SELECTABLE_STATUSES = new Set(["success"]);

const STATUS_CLASSES: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  active: "bg-blue-100 text-blue-800",
  proposed: "bg-yellow-100 text-yellow-800",
  update_required: "bg-orange-100 text-orange-800",
};

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString();
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function normalizeScore(value: number | null | undefined): number {
  if (value == null) return 0;
  return value > 1 ? value / 100 : value;
}

type PlanRow = {
  ref: PlanPageRef;
  page: WebpageItem | null;
};

type Props = {
  businessId: string;
  part: WidgetPart;
  className?: string;
};

export function AgentPlanWidget({ businessId, part, className }: Props) {
  const planId = part.resource.id;
  const [plan, setPlan] = React.useState<AgentPlan | null>(null);
  const [catalog, setCatalog] = React.useState<Map<string, WebpageItem>>(new Map());
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([getPlan(businessId, planId), getWebpageCatalog(businessId)])
      .then(([nextPlan, nextCatalog]) => {
        if (cancelled) return;
        setPlan(nextPlan);
        setCatalog(nextCatalog);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, planId]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plan {planId}...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
        Failed to load plan {planId}.
      </div>
    );
  }

  const rows: PlanRow[] = (plan.plan_json ?? []).map((ref) => ({
    ref,
    page: catalog.get(ref.page_id) ?? null,
  }));
  const selectableIds = rows
    .filter((row) => !NON_SELECTABLE_STATUSES.has(row.page?.status ?? ""))
    .map((row) => row.ref.page_id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  function toggleRow(pageId: string) {
    setSelectedIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : selectableIds);
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className={cn("mt-3 flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Detailed plan
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Plan #{planId}
          </span>
          <Badge variant="outline">{plan.status}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {rows.length} page{rows.length === 1 ? "" : "s"}
          </span>
          {catalog.size === 0 ? (
            <span className="text-xs text-amber-600">Catalog unavailable</span>
          ) : null}
        </div>

        <Table className="min-h-0 flex-1">
          <TableElement className="text-xs">
            <TableHeader>
              <TableRow className="bg-general-primary/6 hover:bg-general-primary/6">
                <TableHead className="w-10 px-3">
                  {selectableIds.length > 0 ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  ) : null}
                </TableHead>
                <TableHead className="min-w-[180px]">Page</TableHead>
                <TableHead className="min-w-[220px]">Rationale</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Relevance</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No pages in this plan.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ ref, page }) => {
                  const status = page?.status ?? "";
                  const disabled = NON_SELECTABLE_STATUSES.has(status);
                  const selected = selectedIds.includes(ref.page_id);

                  return (
                    <TableRow
                      key={ref.page_id}
                      className={cn(
                        selected && !disabled && "bg-general-primary/5",
                        disabled && "opacity-55",
                        !disabled && "cursor-pointer hover:bg-muted/40"
                      )}
                      onClick={() => {
                        if (!disabled) toggleRow(ref.page_id);
                      }}
                    >
                      <TableCell className="w-10 px-3">
                        <Checkbox
                          checked={selected}
                          disabled={disabled}
                          onCheckedChange={() => toggleRow(ref.page_id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${page?.cluster_name ?? ref.page_id}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[230px] truncate font-medium">
                        {page?.cluster_name ?? ref.page_id}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-muted-foreground">
                        {ref.rationale ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{ref.rationale}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm text-xs">
                              {ref.rationale}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {page?.page_type ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <RelevancePill
                          score={normalizeScore(page?.business_relevance_score)}
                          className="scale-90"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPercent(page?.coverage)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(page?.search_volume)}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                              STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"
                            )}
                          >
                            {status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </TableElement>
        </Table>

      </div>
    </TooltipProvider>
  );
}
