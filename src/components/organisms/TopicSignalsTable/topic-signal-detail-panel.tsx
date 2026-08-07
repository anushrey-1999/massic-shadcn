"use client";

import { Badge } from "@/components/ui/badge";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import { formatVolume } from "@/lib/format";
import type { TopicSignalRow } from "@/types/topic-signals-types";
import { TopicSignalHistoryChart } from "./topic-signal-history-chart";
import { TopicSignalLabelBadge } from "./topic-signal-label-badge";
import { TopicSignalPeakMonthChart } from "./topic-signal-peak-month-chart";

function metricValue(value?: number | null, suffix = "") {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function BoxMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-general-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium">{children}</div>
    </div>
  );
}

export function TopicSignalDetailPanel({ row }: { row: TopicSignalRow }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <TopicSignalLabelBadge label={row.label} />
              <Badge variant="outline" className="capitalize">
                {row.trend_geography}
              </Badge>
            </div>
            <Typography variant="h3" className="truncate">
              {row.term}
            </Typography>
            <Typography variant="p" className="mt-1 text-sm text-general-muted-foreground">
              Ranked signal #{row.display_rank} for this topic set and month.
            </Typography>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-general-muted-foreground">
              Trend
            </p>
            <div className="mt-1">
              <RelevancePill score={row.trend_score || 0} />
            </div>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-general-muted-foreground">
              Confidence
            </p>
            <div className="mt-1">
              <RelevancePill score={row.confidence || 0} />
            </div>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-general-muted-foreground">
              Volume
            </p>
            <p className="mt-1 text-sm font-medium">{formatVolume(row.local_volume || 0)}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-general-muted-foreground">
              Growth
            </p>
            <p className="mt-1 text-sm font-medium">
              {metricValue(row.growth?.annualized_pct, "%")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Signal strength</p>
          <div className="grid grid-cols-2 gap-3">
            <BoxMetric label="Consistency">
              <RelevancePill score={row.consistency || 0} />
            </BoxMetric>
            <BoxMetric label="Recent">
              {metricValue(row.growth?.recent_pct, "%")}
            </BoxMetric>
            <BoxMetric label="Delta">
              {metricValue(row.growth?.abs_delta)}
            </BoxMetric>
            <BoxMetric label="Momentum">
              {metricValue(row.momentum)}
            </BoxMetric>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Seasonality</p>
          <div className="grid grid-cols-2 gap-3">
            <BoxMetric label="Timing">
              <div className="mt-2 flex items-center gap-2">
                {row.ramp_state ? (
                  <Badge variant="secondary" className="capitalize">
                    {row.ramp_state}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
                {typeof row.months_to_peak === "number" ? (
                  <span className="text-sm font-medium">{row.months_to_peak} mo</span>
                ) : null}
              </div>
            </BoxMetric>
            <BoxMetric label="Strength">
              {metricValue(row.seasonal_strength)}
            </BoxMetric>
          </div>
          <div className="mt-4 rounded-lg border bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Peak months</p>
              <span className="text-xs text-muted-foreground">
                {(row.seasonal_peak_months || []).join(", ") || "None"}
              </span>
            </div>
            <TopicSignalPeakMonthChart row={row} />
          </div>
        </div>
      </div>

      <TopicSignalHistoryChart row={row} />
    </div>
  );
}
