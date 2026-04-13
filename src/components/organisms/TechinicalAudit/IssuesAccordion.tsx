"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, CircleAlert, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  if (impact === "high") return "Critical";
  if (impact === "medium") return "Warning";
  return "Notice";
}

function ImpactPill({ impact }: { impact: Impact }) {
  const label = getImpactLabel(impact);
  const base =
    "inline-flex w-[92px] items-center justify-center gap-1 rounded-lg border-transparent px-2 py-1 text-[10px] font-medium tracking-[0.015em]";
  if (impact === "high") {
    return (
      <Badge className={`${base} bg-red-100 text-red-600 hover:bg-red-100`}>
        <CircleAlert className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (impact === "medium") {
    return (
      <Badge className={`${base} bg-amber-100 text-amber-700 hover:bg-amber-100`}>
        <CircleAlert className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge className={`${base} bg-[#F5F5F5] text-general-muted-foreground hover:bg-[#F5F5F5]`}>
      <Eye className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function IssueRow({
  issue,
  open,
  onOpenChange,
  showBottomBorder,
}: {
  issue: AuditIssue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showBottomBorder: boolean;
}) {
  const categoryLabel = CATEGORY_META[issue.category].label;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          showBottomBorder && "border-b border-border",
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
                  <div className="text-sm text-general-foreground">
                    {issue.title}
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-general-muted-foreground"
                  >
                    {categoryLabel}
                  </Badge>
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
            <div className="flex w-full">
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
  emptyStateText = "No issues found for this filter.",
}: {
  issues: AuditIssue[];
  openIssueId: string | null;
  onOpenIssueIdChange: (id: string | null) => void;
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
    <Card className="flex flex-col gap-0 rounded-xl border border-border py-0 shadow-none">
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

      <div>
        {sortedIssues.map((issue, idx) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            open={openIssueId === issue.id}
            onOpenChange={(open) => onOpenIssueIdChange(open ? issue.id : null)}
            showBottomBorder={idx !== sortedIssues.length - 1}
          />
        ))}

        {issues.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyStateText}</div>
        ) : null}
      </div>
    </Card>
  );
}

