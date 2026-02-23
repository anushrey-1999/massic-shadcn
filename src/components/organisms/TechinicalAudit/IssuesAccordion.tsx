"use client";

import * as React from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronUp, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { CATEGORY_META, type AuditIssue, type Impact } from "./types";

function getImpactLabel(impact: Impact) {
  if (impact === "high") return "High";
  if (impact === "medium") return "Med";
  return "Low";
}

function getImpactBars(impact: Impact) {
  if (impact === "high")
    return { barsToFill: 3, barColor: "#dc2626", emptyBarColor: "#fecaca" }; // red-600 / red-200
  if (impact === "medium")
    return { barsToFill: 2, barColor: "#d97706", emptyBarColor: "#fde68a" }; // amber-600 / amber-200
  return { barsToFill: 1, barColor: "#65a30d", emptyBarColor: "#d9f99d" }; // lime-600 / lime-200
}

function ImpactPill({ impact }: { impact: Impact }) {
  const label = getImpactLabel(impact);
  const { barsToFill, barColor, emptyBarColor } = getImpactBars(impact);
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-sm">
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((barIndex) => {
          const isFilled = barIndex <= barsToFill;
          const heights = ["h-1", "h-1.5", "h-2", "h-2.5"];
          return (
            <div
              key={barIndex}
              className={cn("w-0.5 rounded-full", heights[barIndex - 1])}
              style={{
                backgroundColor: isFilled ? barColor : emptyBarColor,
              }}
            />
          );
        })}
      </div>
      <span className="text-sm text-general-foreground">{label}</span>
    </div>
  );
}

function IssueRow({
  issue,
  isDone,
  open,
  onOpenChange,
  onToggleDone,
}: {
  issue: AuditIssue;
  isDone: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleDone: (issueId: string) => void;
}) {
  const categoryLabel = CATEGORY_META[issue.category].label;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "border-b border-border",
          open ? "bg-general-primary-foreground" : "bg-general-unofficial-accent-0"
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full cursor-pointer items-stretch text-left"
          >
            <div className="flex flex-1 items-center px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "text-sm",
                      isDone ? "text-[#A3A3A3]" : "text-general-foreground"
                    )}
                  >
                    {issue.title}
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-general-muted-foreground"
                  >
                    {categoryLabel}
                  </Badge>
                  {isDone ? (
                    <div className="flex h-6 w-7 items-center justify-center rounded-lg bg-lime-50 text-lime-700">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex w-[110px] items-center justify-end px-3 py-2">
              <ImpactPill impact={issue.impact} />
            </div>

            <div className="flex w-[52px] items-center justify-end px-2 py-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-secondary opacity-0 transition-opacity group-hover:opacity-100",
                  open && "opacity-100"
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    open && "rotate-180"
                  )}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1">
            <div className="mb-2 text-xs text-general-muted-foreground">
              {issue.description}
            </div>
            <div className="flex gap-3 w-3/4">
              <Card className="w-full min-w-0 gap-1 rounded-lg border border-[#A3A3A3] bg-[#F5F5F5] px-2 py-2 shadow-none">
                <div className="text-xs text-[#A3A3A3]">Affected Pages</div>
                <div className="mt-1 space-y-1">
                  {issue.affectedPages.map((p) => (
                    <div key={p} className="text-xs text-blue-600">
                      {p}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="w-full min-w-0 gap-3 rounded-lg border border-[#56A48A] bg-[#6EC1A61A] px-2 py-2 shadow-none">
                <div className="text-xs text-general-primary">Solution</div>
                <ol className="list-decimal pl-5 text-xs text-general-foreground">
                  {issue.solutionSteps.map((s) => (
                    <li key={s} className="py-0.5">
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-sm  text-[10px] font-semibold leading-[200%]",
                      isDone
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleDone(issue.id);
                    }}
                  >
                    {isDone ? (
                      <History className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {isDone ? "Mark as Pending" : "Mark as done"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function IssuesAccordion({
  issues,
  openIssueId,
  onOpenIssueIdChange,
  doneIssueIds,
  onToggleDone,
  emptyStateText = "No issues found for this filter.",
}: {
  issues: AuditIssue[];
  openIssueId: string | null;
  onOpenIssueIdChange: (id: string | null) => void;
  doneIssueIds: Set<string>;
  onToggleDone: (issueId: string) => void;
  emptyStateText?: string;
}) {
  const [sort, setSort] = React.useState<
    | {
        by: "issue" | "impact";
        dir: "asc" | "desc";
      }
    | null
  >(null);

  const sortedIssues = React.useMemo(() => {
    if (!sort) return issues;
    const impactRank: Record<Impact, number> = { low: 1, medium: 2, high: 3 };
    const dir = sort.dir === "asc" ? 1 : -1;

    return [...issues].sort((a, b) => {
      if (sort.by === "issue") {
        const primary = a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
        if (primary !== 0) return primary * dir;
      } else {
        const primary = (impactRank[a.impact] - impactRank[b.impact]) * dir;
        if (primary !== 0) return primary;
      }

      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  }, [issues, sort]);

  const toggleSort = React.useCallback((by: "issue" | "impact") => {
    setSort((prev) => {
      if (prev?.by === by) {
        return { by, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { by, dir: by === "issue" ? "asc" : "desc" };
    });
  }, []);

  const SortIcon = React.useCallback(
    ({ by }: { by: "issue" | "impact" }) => {
      if (sort?.by !== by) {
        return <ArrowUpDown className="h-3.5 w-3.5 text-general-muted-foreground" />;
      }
      if (sort.dir === "asc") {
        return <ChevronUp className="h-4 w-4 text-general-foreground" />;
      }
      return <ChevronDown className="h-4 w-4 text-general-foreground" />;
    },
    [sort]
  );

  return (
    <Card className="flex h-full flex-1 min-h-0 flex-col gap-0 overflow-hidden rounded-xl border border-border py-0 shadow-none">
      <div className="grid grid-cols-[1fr_110px] items-center border-b border-border px-3 py-0">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-muted/50"
          onClick={() => toggleSort("issue")}
        >
          <Typography variant="p" className="text-sm font-sans text-general-foreground">
            Issue
          </Typography>
          <Typography
            variant="p"
            className="text-sm font-sans text-general-muted-foreground"
          >
            ({issues.length})
          </Typography>
          <SortIcon by="issue" />
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-end gap-2 px-2 py-2 transition-colors hover:bg-muted/50"
          onClick={() => toggleSort("impact")}
        >
          <Typography variant="p" className="text-sm font-sans text-general-foreground">
            Impact
          </Typography>
          <SortIcon by="impact" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sortedIssues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            isDone={doneIssueIds.has(issue.id)}
            open={openIssueId === issue.id}
            onOpenChange={(open) => onOpenIssueIdChange(open ? issue.id : null)}
            onToggleDone={onToggleDone}
          />
        ))}

        {issues.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyStateText}</div>
        ) : null}
      </div>
    </Card>
  );
}

