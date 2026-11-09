"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { AlertTriangle, ChevronRight, Eye, LayoutGrid, List, MousePointerClick, Target } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatsBadge } from "@/components/molecules/analytics";
import { cn } from "@/lib/utils";
import type { HealthStatusRow } from "@/hooks/use-health-status";
import {
  BusinessIcon,
  HealthBadge,
  formatTotal,
  parsePercent,
  type PreviewStats,
} from "./BusinessPreviewCard";

export type BusinessViewMode = "list" | "cards";

export interface BusinessListRow {
  key: string;
  businessId: string | null;
  name: string;
  url: string;
  impressions?: PreviewStats;
  clicks?: PreviewStats;
  goals?: PreviewStats;
  isGa4Connected?: boolean;
  healthStatus?: HealthStatusRow;
}

const ROW_GRID = "flex min-w-[780px] items-center gap-3 px-4";

/** List / Cards toggle (Figma 7196:61885). */
export function BusinessViewToggle({
  value,
  onChange,
}: {
  value: BusinessViewMode;
  onChange: (value: BusinessViewMode) => void;
}) {
  const options: Array<{ key: BusinessViewMode; label: string; icon: typeof List }> = [
    { key: "list", label: "List", icon: List },
    { key: "cards", label: "Cards", icon: LayoutGrid },
  ];
  return (
    <div role="radiogroup" aria-label="Business view" className="flex items-start gap-0.5 rounded-[8px] bg-[#f5f5f5] p-1">
      {options.map(({ key, label, icon: Icon }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              "flex min-h-8 items-center justify-center gap-1.5 rounded-[8px] px-1.5 py-[5.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap text-general-foreground transition-colors",
              active ? "bg-black/10" : "hover:bg-black/5"
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function HeaderCell({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("shrink-0 text-xs leading-[1.5] font-medium tracking-[0.18px] text-general-muted-foreground", className)}>
      {children}
    </span>
  );
}

function MetricCell({ stats, icon }: { stats?: PreviewStats; icon: ReactNode }) {
  return (
    <span className="flex w-[112px] shrink-0 items-center gap-1.5">
      {icon}
      <span className="text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-foreground">
        {formatTotal(stats?.Total)}
      </span>
      <StatsBadge value={parsePercent(stats?.Diff, stats?.Trend)} variant="big" className="flex items-center text-xs" />
    </span>
  );
}

function ConnectAnalyticsFlag({ onConnect }: { onConnect?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Connect Google Analytics"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onConnect?.();
          }}
          className="flex size-6 items-center justify-center rounded-[6px] text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AlertTriangle className="size-4" strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Connect Google Analytics</TooltipContent>
    </Tooltip>
  );
}

function BusinessRow({
  row,
  onOpen,
  onConnectGoogle,
}: {
  row: BusinessListRow;
  onOpen: (row: BusinessListRow) => void;
  onConnectGoogle?: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(row);
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => onOpen(row)}
      onKeyDown={handleKeyDown}
      className={cn(
        ROW_GRID,
        "h-14 cursor-pointer border-b border-general-border bg-white transition-colors last:border-b-0 hover:bg-[#f5f5f5]/60 focus-visible:bg-[#f5f5f5] focus-visible:outline-none"
      )}
    >
      <span className="flex min-w-[180px] flex-1 items-center gap-2.5 overflow-hidden">
        <BusinessIcon website={row.url} name={row.name} grayscale={false} />
        <span className="min-w-0 flex-1 truncate font-mono text-base leading-[1.5] text-general-foreground">{row.name}</span>
      </span>
      <span className="flex w-[150px] shrink-0 items-center">
        {row.healthStatus && row.businessId ? (
          <HealthBadge healthStatus={row.healthStatus} businessId={row.businessId} businessName={row.name} />
        ) : null}
      </span>
      <MetricCell stats={row.impressions} icon={<Eye className="size-3 shrink-0 text-gray-500" aria-hidden />} />
      <MetricCell
        stats={row.clicks}
        icon={<MousePointerClick className="size-3 shrink-0 rotate-90 text-blue-600" aria-hidden />}
      />
      <MetricCell stats={row.goals} icon={<Target className="size-3 shrink-0 text-emerald-600" aria-hidden />} />
      <span className="flex size-6 shrink-0 items-center justify-center">
        {row.isGa4Connected !== true ? <ConnectAnalyticsFlag onConnect={onConnectGoogle} /> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-general-muted-foreground" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

function ColumnHeaders() {
  return (
    <div className={cn(ROW_GRID, "h-9 border-y border-general-border bg-[#f5f5f5]")}>
      <HeaderCell className="min-w-[180px] flex-1">Business</HeaderCell>
      <HeaderCell className="w-[150px]">State</HeaderCell>
      <HeaderCell className="w-[112px]">Impressions</HeaderCell>
      <HeaderCell className="w-[112px]">Clicks</HeaderCell>
      <HeaderCell className="w-[112px]">Goals</HeaderCell>
      <HeaderCell className="w-6" />
      <HeaderCell className="w-4" />
    </div>
  );
}

/** Business list (Figma 7196:61880), with the card metrics as columns instead of the verdict. */
export function BusinessListTable({
  rows,
  onOpen,
  onConnectGoogle,
}: {
  rows: BusinessListRow[];
  onOpen: (row: BusinessListRow) => void;
  onConnectGoogle?: () => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-general-border bg-white">
      <ColumnHeaders />
      {rows.map((row) => (
        <BusinessRow key={row.key} row={row} onOpen={onOpen} onConnectGoogle={onConnectGoogle} />
      ))}
    </div>
  );
}

export function BusinessListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-general-border bg-white">
      <ColumnHeaders />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn(ROW_GRID, "h-14 border-b border-general-border last:border-b-0")}>
          <span className="flex min-w-[180px] flex-1 items-center gap-2.5">
            <Skeleton className="size-4 rounded-xs" />
            <Skeleton className="h-4 w-36" />
          </span>
          <span className="w-[150px] shrink-0">
            <Skeleton className="h-6 w-[110px] rounded-full" />
          </span>
          {[0, 1, 2].map((metric) => (
            <span key={metric} className="w-[112px] shrink-0">
              <Skeleton className="h-4 w-[90px]" />
            </span>
          ))}
          <span className="w-[52px] shrink-0" />
        </div>
      ))}
    </div>
  );
}
