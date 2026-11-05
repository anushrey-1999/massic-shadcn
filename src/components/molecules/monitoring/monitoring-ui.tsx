"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Bell, CircleDashed, RefreshCw, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { normalizeDomainForFavicon } from "@/utils/utils";
import type {
  MonitoringCardTag,
  MonitoringDirection,
  MonitoringHealthColor,
  MonitoringMetricStatus,
} from "@/hooks/use-monitoring-screen";

export function formatChartDate(date: string): string {
  return format(parseISO(date), "MMM d");
}

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

/** Colour favicon for a business, falling back to its initial. */
export function BusinessFavicon({
  website,
  name,
  size = 20,
}: {
  website?: string | null;
  name: string;
  size?: 16 | 20;
}) {
  const [failed, setFailed] = useState(false);
  const domain = normalizeDomainForFavicon(website || undefined);
  const box = size === 16 ? "size-4" : "size-5";

  if (!domain || failed) {
    return (
      <span
        className={cn(
          box,
          "flex shrink-0 items-center justify-center rounded-[4px] bg-general-border text-[10px] font-medium text-general-muted-foreground"
        )}
      >
        {name.trim().charAt(0).toUpperCase() || "B"}
      </span>
    );
  }

  return (
    <img
      src={`${FAVICON_URL}${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      className={cn(box, "shrink-0 rounded-[4px] object-contain")}
      onError={() => setFailed(true)}
    />
  );
}

/** Notifications Button (Figma 6928:52008): a bell with a red unread badge. */
export const NotificationBell = forwardRef<
  HTMLButtonElement,
  { unread: number; bordered?: boolean } & ComponentPropsWithoutRef<"button">
>(function NotificationBell({ unread, bordered = true, className, ...props }, ref) {
  const label = unread > 99 ? "99+" : String(unread);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-[8px] text-general-foreground transition-colors hover:bg-black/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        bordered ? "border border-general-border bg-white" : "bg-transparent",
        className
      )}
      {...props}
    >
      <Bell className="size-4" strokeWidth={1.5} aria-hidden />
      {unread > 0 ? (
        <span className="absolute -top-[5px] left-[23px] flex h-4 min-w-4 items-center justify-center rounded-[12px] border-2 border-white bg-red-500 px-1 text-[10px] leading-[1.5] font-medium tracking-[0.15px] text-general-primary-foreground">
          {label}
        </span>
      ) : null}
    </button>
  );
});

/** Event Type Tag colours (Figma 7087:51022) mapped onto the PRD tags. */
const TAG_CLASS: Record<MonitoringCardTag, string> = {
  unusual_drop: "bg-red-100 text-red-700",
  declining: "bg-red-100 text-red-700",
  unusual_jump: "bg-green-100 text-green-800",
  improving: "bg-green-100 text-green-800",
  data_issue: "bg-gray-100 text-gray-700",
};

export function EventTypeTag({ tag, label }: { tag: MonitoringCardTag; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[12px] px-2 py-0.5 text-xs leading-[1.5] font-medium tracking-[0.18px] whitespace-nowrap",
        TAG_CLASS[tag]
      )}
    >
      {label}
    </span>
  );
}

/** Metrics tab status colours (PRD 10.3): the three unjudged statuses share grey. */
const METRIC_STATUS_CLASS: Record<MonitoringMetricStatus, string> = {
  lower: "bg-amber-100 text-amber-800",
  higher: "bg-blue-100 text-blue-700",
  normal: "bg-green-100 text-green-800",
  no_data: "bg-gray-100 text-gray-700",
  not_enough_history: "bg-gray-100 text-gray-700",
  too_few: "bg-gray-100 text-gray-700",
};

export function MetricStatusTag({ status, label }: { status: MonitoringMetricStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[12px] px-2 py-0.5 text-xs leading-[1.5] font-medium tracking-[0.18px] whitespace-nowrap",
        METRIC_STATUS_CLASS[status] ?? METRIC_STATUS_CLASS.no_data
      )}
    >
      {label}
    </span>
  );
}

/** Health State Badge (Figma 6896:29335): never colour alone, always icon plus word. */
const HEALTH_BADGE: Record<MonitoringHealthColor, { className: string; icon: LucideIcon }> = {
  green: { className: "bg-green-100 text-green-800", icon: TrendingUp },
  amber: { className: "bg-amber-100 text-amber-800", icon: TrendingDown },
  red: { className: "bg-red-100 text-red-700", icon: TriangleAlert },
  gray: { className: "bg-gray-100 text-gray-700", icon: CircleDashed },
};

export function HealthStateBadge({
  color,
  text,
}: {
  color: MonitoringHealthColor;
  text: string;
}) {
  const { className, icon: Icon } = HEALTH_BADGE[color] ?? HEALTH_BADGE.gray;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[12px] px-2 py-0.5 text-xs leading-[1.5] font-medium tracking-[0.18px] whitespace-nowrap",
        className
      )}
    >
      <Icon className="size-3" strokeWidth={1.5} aria-hidden />
      {text}
    </span>
  );
}

/**
 * Health strip bars (Figma 6898:29618) for Home's four stored states. A day without a stored
 * row is "Not yet evaluated", the lowest grey bar.
 */
export const STRIP_BAR: Record<MonitoringHealthColor | "none", string> = {
  green: "bg-green-600",
  amber: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-gray-300",
  none: "bg-gray-200",
};

/** Anomaly shading: red for drops, blue for jumps, in the design's band style. */
export const SHADE_COLORS: Record<
  MonitoringDirection,
  { fill: string; edge: string; label: string; swatch: string }
> = {
  down: { fill: "#fef2f2", edge: "#ef4444", label: "#b91c1c", swatch: "border border-red-500 bg-red-50" },
  up: { fill: "#eff6ff", edge: "#3b82f6", label: "#1d4ed8", swatch: "border border-blue-500 bg-blue-50" },
};

export function shadeDirections(shading: Array<{ direction: MonitoringDirection }>): MonitoringDirection[] {
  return [...new Set(shading.map((shade) => shade.direction))];
}

export const LINE_COLOR = "#2563eb";
export const USUAL_COLOR = "#737373";
export const COMPARED_FILL = "#f5f5f5";

/**
 * Goal colours by `colorIndex` (the server palette has 8 slots). Green, amber, red, grey and blue
 * already mean health, unusual drops and jumps, and the line, so goals use only purples, pinks,
 * brown, near-black and a dark petrol.
 */
const GOAL_COLORS = [
  "#7c3aed",
  "#db2777",
  "#262626",
  "#d946ef",
  "#92400e",
  "#a78bfa",
  "#4c1d95",
  "#155e75",
] as const;

export function goalColor(colorIndex: number | null | undefined): string {
  if (colorIndex === null || colorIndex === undefined) return GOAL_COLORS[0];
  return GOAL_COLORS[((colorIndex % GOAL_COLORS.length) + GOAL_COLORS.length) % GOAL_COLORS.length];
}

export function MonitoringCardShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "w-full rounded-[12px] border border-general-border bg-white p-5",
        className
      )}
    >
      {children}
    </section>
  );
}

/** One failed screen part, with the server's retry text. */
export function MonitoringPartError({
  message,
  retryLabel,
  onRetry,
  retrying,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-2">
      <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} strokeWidth={1.5} />
        {retryLabel}
      </Button>
    </div>
  );
}

/** Small segmented control used inside panels (Daily / Weekly, Pages / Channels, …). */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-start gap-0.5 rounded-[8px] bg-[#f5f5f5] p-1">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "flex min-h-8 items-center justify-center rounded-[8px] px-1.5 py-[5.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap text-general-foreground transition-colors",
              active ? "bg-black/10" : "hover:bg-black/5"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** First and last date under a panel chart. */
export function ChartEdgeDates({ first, last }: { first?: string; last?: string }) {
  if (!first || !last) return null;
  return (
    <div className="flex items-start text-[10px] leading-[1.5] font-medium tracking-[0.15px] text-general-muted-foreground">
      <span>{formatChartDate(first)}</span>
      <div className="flex-1" />
      <span>{formatChartDate(last)}</span>
    </div>
  );
}

/** Legend under a panel chart: the dashed Usual line, anomaly shading by direction, the compared band. */
export function ChartLegend({
  usual,
  directions = [],
  comparedLabel = null,
}: {
  usual: boolean;
  directions?: MonitoringDirection[];
  comparedLabel?: string | null;
}) {
  if (!usual && !directions.length && !comparedLabel) return null;
  return (
    <div className="flex flex-wrap items-start gap-4 text-[10px] leading-[1.5] font-medium tracking-[0.15px] text-general-muted-foreground">
      {usual ? (
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 shrink-0 border-t border-dashed border-general-muted-foreground" />
          Usual
        </span>
      ) : null}
      {directions.includes("down") ? (
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-[2px]", SHADE_COLORS.down.swatch)} />
          Unusual drop
        </span>
      ) : null}
      {directions.includes("up") ? (
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-[2px]", SHADE_COLORS.up.swatch)} />
          Unusual jump
        </span>
      ) : null}
      {comparedLabel ? (
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-[2px] border border-general-border bg-[#f5f5f5]" />
          {comparedLabel}
        </span>
      ) : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs leading-[1.5] text-general-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** A titled block inside a side panel, divided from the one above. */
export function PanelSection({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-general-border py-5">
      <div className="flex min-h-[18px] items-center gap-2">
        <SectionLabel>{label}</SectionLabel>
        <div className="flex-1" />
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Loading state shared by the event and metric panels. */
export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-6 pt-2 pb-6">
      <Skeleton className="h-[160px] w-full rounded-[10px]" />
      {[0, 1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function TopCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded-[4px]" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-[12px]" />
      </div>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-28" />
        <div className="flex-1" />
        <Skeleton className="h-11 w-[300px]" />
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-[228px] w-full" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3 border-t border-general-border py-3">
          <Skeleton className="h-5 w-[96px] rounded-[12px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-[120px]" />
        </div>
      ))}
    </div>
  );
}
