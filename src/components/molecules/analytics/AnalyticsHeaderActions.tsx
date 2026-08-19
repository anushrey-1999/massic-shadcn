"use client";

import { ArrowUpRight, Flag, ListChecks, Megaphone, MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ContentGroupsIcon } from "@/components/molecules/analytics/ContentGroupsIcon";
import {
  ANALYTICS_METRIC_LABELS,
  CHART_SERIES_COLORS,
  type AnalyticsMetricKey,
} from "@/utils/analytics-metrics";

export type AnalyticsKeywordScope = "all" | "branded" | "non-branded";
export type { AnalyticsGroupBy } from "@/utils/analytics-chart-grouping";

const KEYWORD_SCOPE_OPTIONS: { label: string; value: AnalyticsKeywordScope; description: string }[] = [
  { label: "All queries", value: "all", description: "Branded and non-branded" },
  { label: "Branded", value: "branded", description: "Only branded queries" },
  { label: "Non-branded", value: "non-branded", description: "Only non-branded queries" },
];

const DATA_READY_TOOLTIP = "Available once your data is ready";

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 17.9142 17.0835"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.564 0.00390625C16.8088 0.0222008 17.046 0.102584 17.2525 0.237305C17.4882 0.391167 17.6746 0.609905 17.7887 0.867188C17.9027 1.12471 17.9405 1.41034 17.8961 1.68848C17.8516 1.9666 17.7273 2.22641 17.5387 2.43555H17.5377L11.5191 9.09375H11.5181C11.3451 9.28511 11.2497 9.53401 11.2496 9.79199V15.625C11.2497 15.8734 11.1859 16.1179 11.065 16.335C10.9441 16.552 10.7694 16.7345 10.5582 16.8652C10.3469 16.9959 10.1052 17.0707 9.85701 17.082C9.60877 17.0933 9.36155 17.0407 9.13924 16.9297L7.47225 16.0967C7.22992 15.9756 7.0258 15.789 6.88338 15.5586C6.74098 15.3281 6.66548 15.062 6.6656 14.791V9.79199C6.66549 9.53407 6.56997 9.28509 6.39705 9.09375L0.375566 2.43555C0.186616 2.22619 0.06254 1.966 0.0181438 1.6875C-0.0261724 1.40908 0.0110909 1.12386 0.125566 0.866211C0.240084 0.608593 0.426322 0.389041 0.662675 0.235352C0.899068 0.0817114 1.17566 0.000101791 1.4576 0H16.4596L16.564 0.00390625ZM1.4576 1.25C1.41756 1.25006 1.37793 1.26146 1.34432 1.2832C1.31058 1.30514 1.28353 1.33726 1.26717 1.37402C1.25094 1.41075 1.2462 1.45156 1.25252 1.49121C1.25888 1.53087 1.27641 1.56782 1.3033 1.59766L7.32381 8.25488L7.45857 8.41797C7.7542 8.81256 7.9153 9.29421 7.9156 9.79102V14.792C7.91559 14.8306 7.9266 14.8685 7.94685 14.9014C7.96716 14.9342 7.99636 14.9612 8.03084 14.9785L9.69783 15.8115L9.74764 15.8291C9.76478 15.8327 9.78272 15.8348 9.80037 15.834C9.83574 15.8323 9.87085 15.8214 9.90096 15.8027C9.93096 15.7841 9.95603 15.7574 9.97322 15.7266C9.98175 15.7112 9.98837 15.6946 9.99275 15.6777L9.99959 15.625V9.79102C9.99994 9.22333 10.2105 8.67586 10.5914 8.25488L16.6099 1.59766C16.6368 1.5678 16.6554 1.53089 16.6617 1.49121C16.668 1.45156 16.6623 1.41074 16.6461 1.37402C16.6299 1.33747 16.6033 1.30615 16.5699 1.28418C16.5531 1.27324 16.5342 1.26449 16.5152 1.25879L16.4566 1.25H1.4576Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Count of non-default settings, so state hidden inside a menu stays visible. */
function ActiveCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-general-primary px-1 text-[10px] font-medium text-primary-foreground">
      {count}
    </span>
  );
}

const TOOLBAR_BUTTON_CLASS =
  "h-8 shrink-0 gap-1.5 rounded-[6px] border-general-border bg-transparent px-3 text-sm font-medium text-general-foreground hover:bg-muted/40";

interface AnalyticsNavigationMenuProps {
  onViewReports: () => void;
  onCampaignTracking: () => void;
  onIndexing: () => void;
  onContentGroups: () => void;
  reportsDisabled?: boolean;
  indexingDisabled?: boolean;
  contentGroupsDisabled?: boolean;
}

/**
 * Secondary destinations and configuration. Grouped into one overflow menu so
 * the single-row toolbar stays compact.
 */
export function AnalyticsNavigationMenu({
  onViewReports,
  onCampaignTracking,
  onIndexing,
  onContentGroups,
  reportsDisabled = false,
  indexingDisabled = false,
  contentGroupsDisabled = false,
}: AnalyticsNavigationMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={TOOLBAR_BUTTON_CLASS}>
          <MoreHorizontal className="size-3.5" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-[8px] border-general-border">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15px] text-muted-foreground">
          Go to
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="h-8 cursor-pointer gap-2"
          onSelect={onViewReports}
          disabled={reportsDisabled}
        >
          <span className="flex-1">Reports</span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-8 cursor-pointer gap-2"
          onSelect={onIndexing}
          disabled={indexingDisabled}
        >
          <ListChecks className="size-4 shrink-0" />
          <span className="flex-1">Indexing status</span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuItem>
        <DropdownMenuItem className="h-8 cursor-pointer gap-2" onSelect={onCampaignTracking}>
          <Megaphone className="size-4 shrink-0" />
          <span className="flex-1">Campaign tracking</span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15px] text-muted-foreground">
          Configure
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="h-8 cursor-pointer gap-2"
          onSelect={onContentGroups}
          disabled={contentGroupsDisabled}
        >
          <ContentGroupsIcon className="size-4 shrink-0" />
          Content groups
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AnalyticsFilterMenuProps {
  keywordScope: AnalyticsKeywordScope;
  onKeywordScopeChange: (value: AnalyticsKeywordScope) => void;
  disabled?: boolean;
}

/** Query-type filtering. Only rendered on the Organic tab. */
export function AnalyticsFilterMenu({
  keywordScope,
  onKeywordScopeChange,
  disabled = false,
}: AnalyticsFilterMenuProps) {
  const activeCount = keywordScope === "all" ? 0 : 1;

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed">
            <Button
              variant="outline"
              size="sm"
              className={cn(TOOLBAR_BUTTON_CLASS, "opacity-40")}
              disabled
              style={{ pointerEvents: "none" }}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filters
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {DATA_READY_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(TOOLBAR_BUTTON_CLASS, activeCount > 0 && "border-general-border-three bg-general-secondary")}
        >
          <FilterIcon className="h-3.5 w-3.5" />
          Filters
          <ActiveCountBadge count={activeCount} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-[8px] border-general-border">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15px] text-muted-foreground">
          Query type
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={keywordScope}
          onValueChange={(value) => onKeywordScopeChange(value as AnalyticsKeywordScope)}
        >
          {KEYWORD_SCOPE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="cursor-pointer"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AnalyticsDisplayMenuProps {
  metricKeys: readonly AnalyticsMetricKey[];
  visibleLines: Record<string, boolean>;
  onLineToggle: (key: AnalyticsMetricKey, checked: boolean) => void;
  /** The All tab plots a fixed set of lines, so the toggles are read-only. */
  linesLocked?: boolean;
  anomalyHighlights: boolean;
  onAnomalyHighlightsChange: (enabled: boolean) => void;
  showAnomalyToggle?: boolean;
  disabled?: boolean;
}

/**
 * Chart series and overlay visibility. Each line pairs its plotted color with a
 * text label, replacing the color-only icon buttons the toolbar used before.
 */
export function AnalyticsDisplayMenu({
  metricKeys,
  visibleLines,
  onLineToggle,
  linesLocked = false,
  anomalyHighlights,
  onAnomalyHighlightsChange,
  showAnomalyToggle = true,
  disabled = false,
}: AnalyticsDisplayMenuProps) {
  const hiddenLines = linesLocked
    ? 0
    : metricKeys.filter((key) => !visibleLines[key]).length;
  // The chart needs at least one series, so the last one standing is locked on.
  const visibleLineCount = metricKeys.length - hiddenLines;
  const activeCount = hiddenLines + (showAnomalyToggle && anomalyHighlights ? 1 : 0);

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed">
            <Button
              variant="outline"
              size="sm"
              className={cn(TOOLBAR_BUTTON_CLASS, "opacity-40")}
              disabled
              style={{ pointerEvents: "none" }}
            >
              <SlidersHorizontal className="size-3.5" />
              Display
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {DATA_READY_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(TOOLBAR_BUTTON_CLASS, activeCount > 0 && "border-general-border-three bg-general-secondary")}
        >
          <SlidersHorizontal className="size-3.5" />
          Display
          <ActiveCountBadge count={activeCount} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-[8px] border-general-border">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15px] text-muted-foreground">
          Display
        </DropdownMenuLabel>
        {metricKeys.map((key) => {
          const checked = linesLocked ? true : Boolean(visibleLines[key]);
          const isLastVisible = !linesLocked && checked && visibleLineCount <= 1;

          return (
            <DropdownMenuCheckboxItem
              key={key}
              checked={checked}
              disabled={linesLocked || isLastVisible}
              onCheckedChange={(next) => onLineToggle(key, next === true)}
              onSelect={(event) => event.preventDefault()}
              className="cursor-pointer"
              title={isLastVisible ? "At least one line must stay visible" : undefined}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: CHART_SERIES_COLORS[key] }}
                />
                {ANALYTICS_METRIC_LABELS[key]}
              </span>
            </DropdownMenuCheckboxItem>
          );
        })}
        {showAnomalyToggle ? (
          <DropdownMenuCheckboxItem
            checked={anomalyHighlights}
            onCheckedChange={(checked) => onAnomalyHighlightsChange(checked === true)}
            onSelect={(event) => event.preventDefault()}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Flag className="size-3.5 shrink-0" aria-hidden="true" />
              Anomaly highlights
            </span>
          </DropdownMenuCheckboxItem>
        ) : null}
        {linesLocked ? (
          <p className="px-2 py-1.5 text-[11px] leading-4 text-muted-foreground">
            Switch to Organic to choose which lines are plotted.
          </p>
        ) : visibleLineCount <= 1 ? (
          <p className="px-2 py-1.5 text-[11px] leading-4 text-muted-foreground">
            At least one line must stay visible.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
