"use client";

import { type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AnalyticsDisplayMenu,
  AnalyticsFilterMenu,
  AnalyticsNavigationMenu,
  type AnalyticsKeywordScope,
} from "@/components/molecules/analytics/AnalyticsHeaderActions";
import { type AnalyticsMetricKey } from "@/utils/analytics-metrics";

const DATA_READY_TOOLTIP = "Available once your data is ready";

export type AnalyticsScope = "all" | "organic";

interface AnalyticsToolbarProps {
  scope: AnalyticsScope;
  onScopeChange: (value: string) => void;
  /** GA4 page-path scope, shown as a status badge once ingestion has settled. */
  ga4ScopePath?: string | null;
  ga4ScopeTitle?: string;

  periodSelector: ReactNode;
  /** Active deepdive filter chips, rendered as part of the viewing tier. */
  filterChips?: ReactNode;

  onPrimaryDrivers: () => void;
  onViewReports: () => void;
  onCampaignTracking: () => void;
  onIndexing: () => void;
  onContentGroups: () => void;
  primaryDriversDisabled?: boolean;
  reportsDisabled?: boolean;
  indexingDisabled?: boolean;
  contentGroupsDisabled?: boolean;

  keywordScope: AnalyticsKeywordScope;
  onKeywordScopeChange: (value: AnalyticsKeywordScope) => void;
  showKeywordScope?: boolean;

  metricKeys: readonly AnalyticsMetricKey[];
  visibleLines: Record<string, boolean>;
  onLineToggle: (key: AnalyticsMetricKey, checked: boolean) => void;
  anomalyHighlights: boolean;
  onAnomalyHighlightsChange: (enabled: boolean) => void;

  /** Search Console or GA4 import in flight — blocks data-dependent controls. */
  isIngestionActive?: boolean;
  /** GA4 dataset unavailable — blocks chart display controls. */
  isDataBlocked?: boolean;
}

/**
 * Single-row analytics header. Scope and the primary action sit on the left;
 * period, filters, display, and overflow navigation sit on the right.
 */
export function AnalyticsToolbar({
  scope,
  onScopeChange,
  ga4ScopePath,
  ga4ScopeTitle,
  periodSelector,
  filterChips,
  onPrimaryDrivers,
  onViewReports,
  onCampaignTracking,
  onIndexing,
  onContentGroups,
  primaryDriversDisabled = false,
  reportsDisabled = false,
  indexingDisabled = false,
  contentGroupsDisabled = false,
  keywordScope,
  onKeywordScopeChange,
  showKeywordScope = true,
  metricKeys,
  visibleLines,
  onLineToggle,
  anomalyHighlights,
  onAnomalyHighlightsChange,
  isIngestionActive = false,
  isDataBlocked = false,
}: AnalyticsToolbarProps) {
  return (
    <div className="w-full max-w-[1224px] px-7">
      <div className="flex items-center justify-between gap-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Tabs className="gap-0" value={scope} onValueChange={onScopeChange}>
            <TabsList className="h-auto w-[206px] rounded-[12px] bg-general-border p-1">
              <TabsTrigger
                value="all"
                className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="organic"
                className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
              >
                Organic
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {ga4ScopePath ? (
            <Badge
              variant="outline"
              className="max-w-[180px] gap-1.5 border-general-border bg-general-secondary font-medium text-general-foreground"
              title={ga4ScopeTitle}
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              <span className="truncate">GA4 · {ga4ScopePath}</span>
            </Badge>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={isIngestionActive ? "inline-flex cursor-not-allowed" : "inline-flex"}>
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-[6px] px-3 text-sm font-medium"
                  onClick={onPrimaryDrivers}
                  disabled={primaryDriversDisabled || isIngestionActive}
                  style={isIngestionActive ? { pointerEvents: "none" } : undefined}
                >
                  What&apos;s Happening?
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {isIngestionActive
                ? DATA_READY_TOOLTIP
                : "What changed in your traffic and why"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex cursor-pointer items-center">{periodSelector}</div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Period and grouping
            </TooltipContent>
          </Tooltip>
          {showKeywordScope ? (
            <AnalyticsFilterMenu
              keywordScope={keywordScope}
              onKeywordScopeChange={onKeywordScopeChange}
              disabled={isIngestionActive}
            />
          ) : null}
          <AnalyticsDisplayMenu
            metricKeys={metricKeys}
            visibleLines={visibleLines}
            onLineToggle={onLineToggle}
            linesLocked={scope === "all"}
            anomalyHighlights={anomalyHighlights}
            onAnomalyHighlightsChange={onAnomalyHighlightsChange}
            showAnomalyToggle={!isIngestionActive}
            disabled={isDataBlocked}
          />
          <AnalyticsNavigationMenu
            onViewReports={onViewReports}
            onCampaignTracking={onCampaignTracking}
            onIndexing={onIndexing}
            onContentGroups={onContentGroups}
            reportsDisabled={reportsDisabled || isIngestionActive}
            indexingDisabled={indexingDisabled}
            contentGroupsDisabled={contentGroupsDisabled}
          />
        </div>
      </div>

      {filterChips ? <div className="pb-2">{filterChips}</div> : null}
    </div>
  );
}
