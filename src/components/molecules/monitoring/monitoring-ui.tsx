"use client";

import type { ReactNode } from "react";
import { CircleDashed, RefreshCw, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  MonitoringCardTag,
  MonitoringDirection,
  MonitoringHealthColor,
} from "@/hooks/use-monitoring-screen";

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

export const LINE_COLOR = "#2563eb";
export const USUAL_COLOR = "#737373";
export const COMPARED_FILL = "#f5f5f5";

/** Goal colours by `colorIndex` (the server palette has 20 slots). */
const GOAL_COLORS = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#6366f1",
  "#14b8a6",
  "#d946ef",
  "#0ea5e9",
  "#eab308",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#64748b",
  "#78716c",
  "#0d9488",
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

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs leading-[1.5] text-general-muted-foreground uppercase">
      {children}
    </p>
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
