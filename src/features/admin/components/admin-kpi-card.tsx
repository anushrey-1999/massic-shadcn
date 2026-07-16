"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  PlugZap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AdminKpi } from "../types";

const CURRENCY_KEYS = new Set([
  "api_cost_total",
  "cost_per_business",
  "api_cost_openai",
  "api_cost_anthropic",
  "mrr",
  "arr",
  "new_mrr",
  "retained_mrr",
]);
const API_COST_KEYS = new Set([
  "api_cost_total",
  "cost_per_business",
  "api_cost_openai",
  "api_cost_anthropic",
]);

export function formatAdminValue(key: string, value: number | null) {
  if (value === null || value === undefined) return "—";
  if (key === "ctr") return `${(value * 100).toFixed(2)}%`;
  if (CURRENCY_KEYS.has(key))
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: API_COST_KEYS.has(key) ? 2 : 0,
    }).format(value);
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function AnimatedAdminValue({
  metric,
  value,
}: {
  metric: string;
  value: number | null;
}) {
  const [displayValue, setDisplayValue] = useState<number | null>(
    value === null ? null : 0,
  );
  const currentValue = useRef(0);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      currentValue.current = 0;
      return;
    }

    const from = currentValue.current;
    const difference = value - from;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || difference === 0) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const duration = 680;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = from + difference * eased;
      currentValue.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else currentValue.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const finalLabel = formatAdminValue(metric, value);
  return (
    <span className="tabular-nums" aria-label={finalLabel}>
      <span aria-hidden="true">{formatAdminValue(metric, displayValue)}</span>
    </span>
  );
}

export function AdminKpiCard({ kpi }: { kpi: AdminKpi }) {
  const gradientId = `admin-kpi-${useId().replaceAll(":", "")}`;
  const unavailable = kpi.availability.state === "unavailable";
  const partial = kpi.availability.state === "partial";
  const positive = (kpi.changePct || 0) > 0;
  const negative = (kpi.changePct || 0) < 0;
  const ChangeIcon = positive
    ? ArrowUpRight
    : negative
      ? ArrowDownRight
      : Minus;
  const sparkline = kpi.trend.map((point) => point.value);
  const min = sparkline.length ? Math.min(...sparkline) : 0;
  const max = sparkline.length ? Math.max(...sparkline) : 0;
  const range = max - min || 1;
  const points = sparkline
    .map(
      (value, index) =>
        `${(index / Math.max(1, sparkline.length - 1)) * 80},${24 - ((value - min) / range) * 20}`,
    )
    .join(" ");
  return (
    <div className="admin-panel admin-panel-hover group min-w-0 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm text-general-muted-foreground transition-colors duration-200 group-hover:text-general-unofficial-foreground-alt">
          {kpi.label}
        </p>
        {(unavailable || partial) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex rounded p-1",
                  unavailable
                    ? "bg-neutral-100 text-neutral-500"
                    : "bg-amber-50 text-amber-700",
                )}
                aria-label={`${kpi.label}: ${kpi.availability.state}`}
              >
                {unavailable ? (
                  <PlugZap className="size-3.5" />
                ) : (
                  <AlertCircle className="size-3.5" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {kpi.availability.reason}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p
          className={cn(
            "min-w-0 truncate text-[29px] font-medium leading-none tracking-[-0.02em]",
            unavailable
              ? "text-general-border-four"
              : "text-general-foreground",
          )}
        >
          <AnimatedAdminValue metric={kpi.key} value={kpi.value} />
        </p>
        {!unavailable && sparkline.length > 1 && (
          <svg
            viewBox="0 0 80 28"
            className="h-8 w-20 shrink-0 rounded-md bg-general-primary/5 p-0.5 text-general-primary transition-colors duration-200 group-hover:bg-general-primary/8"
            aria-label={`${kpi.label} trend`}
            role="img"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,28 ${points} 80,28`}
              fill={`url(#${gradientId})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      <div className="mt-4 flex min-h-7 items-center justify-between gap-3 border-t border-general-border/80 pt-3 text-xs">
        {unavailable ? (
          <span className="text-general-muted-foreground">Not connected</span>
        ) : kpi.changePct === null ? (
          <span className="text-general-muted-foreground">
            {kpi.contextLabel || "No comparison"}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              positive
                ? "text-emerald-700"
                : negative
                  ? "text-red-700"
                  : "text-general-muted-foreground",
            )}
          >
            <ChangeIcon className="size-3.5" />{" "}
            {Math.abs(kpi.changePct).toFixed(1)}% vs previous
          </span>
        )}
        {!unavailable && kpi.previous !== null && (
          <span className="max-w-[48%] shrink-0 truncate text-right text-general-muted-foreground">
            Previous{" "}
            <span className="font-medium tabular-nums text-general-unofficial-foreground-alt">
              {formatAdminValue(kpi.key, kpi.previous)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminKpiGrid({
  kpis,
  limit,
}: {
  kpis: AdminKpi[];
  limit?: number;
}) {
  const rows = typeof limit === "number" ? kpis.slice(0, limit) : kpis;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((kpi) => (
        <AdminKpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}
