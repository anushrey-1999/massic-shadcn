"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ContentGroupsIcon } from "@/components/molecules/analytics/ContentGroupsIcon";

export type AnalyticsKeywordScope = "all" | "branded" | "non-branded";
export type { AnalyticsGroupBy } from "@/utils/analytics-chart-grouping";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
  tooltip?: string;
}

interface AnalyticsHeaderActionsProps {
  periodSelector: ReactNode;
  keywordScope: AnalyticsKeywordScope;
  onKeywordScopeChange: (value: AnalyticsKeywordScope) => void;
  onViewReports: () => void;
  onPrimaryDrivers?: () => void;
  onContentGroupsClick?: () => void;
  reportsDisabled?: boolean;
  primaryDriversDisabled?: boolean;
  contentGroupsDisabled?: boolean;
}

interface AnalyticsFilterControlsProps {
  periodSelector: ReactNode;
  keywordScope: AnalyticsKeywordScope;
  onKeywordScopeChange: (value: AnalyticsKeywordScope) => void;
  showKeywordScope?: boolean;
  hasActiveKeywordScope?: boolean;
}

interface AnalyticsReportsActionsProps {
  onViewReports: () => void;
  onPrimaryDrivers?: () => void;
  onContentGroupsClick?: () => void;
  reportsDisabled?: boolean;
  primaryDriversDisabled?: boolean;
  contentGroupsDisabled?: boolean;
}

const KEYWORD_SCOPE_OPTIONS: SegmentedOption<AnalyticsKeywordScope>[] = [
  { label: "All", value: "all", tooltip: "All queries" },
  { label: "Branded", value: "branded", tooltip: "Only branded queries" },
  { label: "Non-branded", value: "non-branded", tooltip: "Only non-branded queries" },
];

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

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  equalWidth = false,
  disabledValues = [],
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  equalWidth?: boolean;
  disabledValues?: T[];
}) {
  return (
    <div className="flex w-full items-center bg-general-border p-[3px]">
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = disabledValues.includes(option.value);
        const button = (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={isDisabled}
            className={cn(
              "min-h-[29px] min-w-[29px] rounded-[10px] px-2 py-1 text-xs font-medium tracking-[0.18px] whitespace-nowrap text-general-foreground transition-colors",
              equalWidth && "flex-1",
              isSelected && "bg-white shadow-sm",
              isDisabled && "cursor-not-allowed opacity-40"
            )}
          >
            {option.label}
          </button>
        );

        if (!option.tooltip) {
          return button;
        }

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {option.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function AnalyticsHeaderActions({
  periodSelector,
  keywordScope,
  onKeywordScopeChange,
  onViewReports,
  onPrimaryDrivers,
  onContentGroupsClick,
  reportsDisabled = false,
  primaryDriversDisabled = false,
  contentGroupsDisabled = false,
}: AnalyticsHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <AnalyticsFilterControls
        periodSelector={periodSelector}
        keywordScope={keywordScope}
        onKeywordScopeChange={onKeywordScopeChange}
      />
      <AnalyticsReportsActions
        onViewReports={onViewReports}
        onPrimaryDrivers={onPrimaryDrivers}
        onContentGroupsClick={onContentGroupsClick}
        reportsDisabled={reportsDisabled}
        primaryDriversDisabled={primaryDriversDisabled}
        contentGroupsDisabled={contentGroupsDisabled}
      />
    </div>
  );
}

export function AnalyticsFilterControls({
  periodSelector,
  keywordScope,
  onKeywordScopeChange,
  showKeywordScope = true,
  hasActiveKeywordScope = false,
}: AnalyticsFilterControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer">{periodSelector}</div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Select Period
        </TooltipContent>
      </Tooltip>

      {showKeywordScope ? (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className={cn(
                    "h-10 w-10 rounded-[8px] border-general-border bg-transparent p-2 text-general-foreground hover:bg-muted/40",
                    hasActiveKeywordScope &&
                      "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  )}
                  aria-label="Filter analytics"
                >
                  <FilterIcon className="h-[16.25px] w-[17.91px]" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Filter
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={6}
            className="w-[200px] rounded-[8px] border-general-border bg-white p-0.5 shadow-[0px_4px_6px_rgba(0,0,0,0.1),0px_2px_4px_rgba(0,0,0,0.1)]"
          >
            <div className="flex flex-col gap-0">
              <div className="min-h-8 px-2 py-[5.5px] text-[10px] tracking-[0.15px] text-muted-foreground">
                Keywords
              </div>
              <SegmentedControl
                value={keywordScope}
                options={KEYWORD_SCOPE_OPTIONS}
                onChange={onKeywordScopeChange}
              />
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

export function AnalyticsReportsActions({
  onViewReports,
  onPrimaryDrivers,
  onContentGroupsClick,
  reportsDisabled = false,
  primaryDriversDisabled = false,
  contentGroupsDisabled = false,
}: AnalyticsReportsActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onPrimaryDrivers ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-[8px] border-[#d4d4d4] bg-transparent px-4 text-general-foreground hover:bg-muted/40"
              onClick={onPrimaryDrivers}
              disabled={primaryDriversDisabled}
            >
              What&apos;s Happening?
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            What&apos;s Happening?
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="h-10 shrink-0 rounded-[8px] border-[#d4d4d4] bg-transparent px-4 text-general-foreground hover:bg-muted/40"
            onClick={onViewReports}
            disabled={reportsDisabled}
          >
            View Reports
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          View Reports
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-[8px] border-general-border bg-transparent p-2 text-general-foreground hover:bg-muted/40"
            onClick={onContentGroupsClick}
            disabled={contentGroupsDisabled}
            aria-label="Content groups"
          >
            <ContentGroupsIcon className="h-[16.25px] w-[16.25px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Content Groups
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
