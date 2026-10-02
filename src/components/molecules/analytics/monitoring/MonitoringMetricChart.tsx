"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MonitoringGoal,
  MonitoringSeriesPoint,
} from "@/hooks/use-monitoring";
import { useMonitoringMetricSeries } from "@/hooks/use-monitoring";
import { cn } from "@/lib/utils";
import {
  ELIGIBILITY_LABEL,
  FactRow,
  MetricChange,
  MonitoringEmpty,
  MonitoringError,
  MonitoringLoading,
  SectionLabel,
  formatCount,
  formatMonitoringDate,
  formatSignedPct,
  metricLabel,
  metricVisual,
  unusualness,
} from "./monitoring-ui";

/** A reading against its expectation, as the ratio the change colouring expects. */
function pctChange(
  actual: number | null | undefined,
  expected: number | null | undefined,
): number | null {
  if (actual == null || expected == null || !expected) return null;
  return (actual - expected) / expected;
}

/**
 * A metric against the expectation the engine had for it.
 *
 * The band is the whole point: the actual line alone says what happened, the band says what
 * was supposed to happen, and only the gap between them explains why an alert exists. Days
 * the engine excluded from learning are still plotted and marked, because "we judged this day
 * but did not learn from it" is most of the explanatory value.
 */

const RANGE_OPTIONS = [
  { value: 28, label: "28d" },
  { value: 90, label: "90d" },
  { value: 120, label: "120d" },
] as const;

const EXPECTED_COLOR = "#9CA3AF";
const GRID_COLOR = "#E5E7EB";
const EXCLUDED_COLOR = "#EF9F27";

const CHART_CONFIG: ChartConfig = {
  value: { label: "Actual" },
  expected: { label: "Expected", color: EXPECTED_COLOR },
};

interface ChartRow {
  date: string;
  value: number | null;
  expected: number | null;
  /**
   * `[lower, upper]` as a range area. Null on days with no expectation yet, which draws a gap
   * rather than a band collapsed onto zero.
   */
  band: [number, number] | null;
  /**
   * Non-null only on days that landed outside the normal range.
   *
   * This used to mark days the engine withheld from learning, which was a mistake: that is an
   * internal bookkeeping detail, it applies to half the days in a typical window, and marking
   * it drowned the chart in circles that meant nothing to a reader. A day breaking out of its
   * expected range is both rare and the thing the reader is actually looking for.
   */
  outlierValue: number | null;
  point: MonitoringSeriesPoint;
}

/** Whether a reading broke out of the range the engine expected it to sit in. */
function isOutsideRange(point: MonitoringSeriesPoint): boolean {
  if (point.value == null || point.lower == null || point.upper == null) {
    return false;
  }
  return point.value < point.lower || point.value > point.upper;
}

interface MonitoringMetricChartProps {
  businessId: string | null;
  metricKey: string;
  goals: MonitoringGoal[];
}

export function MonitoringMetricChart({
  businessId,
  metricKey,
  goals,
}: MonitoringMetricChartProps) {
  const [days, setDays] = React.useState<number>(90);

  const { data, isLoading, isError, error } = useMonitoringMetricSeries(
    businessId,
    metricKey,
    days,
  );

  const rows = React.useMemo<ChartRow[]>(() => {
    if (!data) return [];

    return data.points.map((point) => ({
      date: point.date,
      value: point.value,
      expected: point.expected,
      band:
        point.lower != null && point.upper != null
          ? [point.lower, point.upper]
          : null,
      outlierValue: isOutsideRange(point) ? point.value : null,
      point,
    }));
  }, [data]);

  const outlierCount = rows.filter((row) => row.outlierValue != null).length;

  const visual = metricVisual(metricKey);
  const name = metricLabel(metricKey, goals);

  // Scoped so two charts on screen at once cannot collide on the same <defs> id.
  const gradientId = React.useId();

  // The most recent day that actually has a number, which is rarely the last row: the tail of
  // the range is usually still provisional or not yet delivered.
  const latest = React.useMemo(
    () => [...rows].reverse().find((row) => row.value != null) ?? null,
    [rows],
  );

  return (
    <div className="pb-8">
      <div className="flex items-start justify-between gap-3 border-b border-general-border px-6 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-medium text-general-foreground">
            <span className="shrink-0" style={{ color: visual.color }}>
              {visual.icon}
            </span>
            <span className="truncate">{name}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {visual.kind}
          </p>
          {latest ? (
            <div className="mt-2 text-[13px]">
              <MetricChange
                actual={latest.value}
                expected={latest.expected}
                changePct={pctChange(latest.value, latest.expected)}
              />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                on {formatMonitoringDate(latest.date)}
              </p>
            </div>
          ) : null}
        </div>
        <Tabs
          value={String(days)}
          onValueChange={(value) => setDays(Number(value))}
        >
          <TabsList className="h-auto gap-1 rounded-[8px] bg-general-border p-1">
            {RANGE_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={String(option.value)}
                className="h-auto min-h-7 rounded-[6px] px-2.5 py-1 text-xs font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-general-foreground data-[state=active]:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <MonitoringLoading label="Loading series" />
      ) : isError ? (
        <MonitoringError message={error} />
      ) : rows.length === 0 ? (
        <MonitoringEmpty
          icon={<LineChartIcon className="h-4 w-4" />}
          title="No observations in this range"
          description="Widen the range, or wait for the next run to write this metric."
        />
      ) : (
        <>
          <div className="px-6 pt-5">
            <ChartContainer
              config={CHART_CONFIG}
              className="aspect-auto h-[240px] w-full"
            >
              <ComposedChart
                data={rows}
                margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={visual.color}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor={visual.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID_COLOR}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={48}
                  tickFormatter={(value: string) =>
                    formatMonitoringDate(value)
                  }
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value: number) => formatCount(value)}
                />

                <ChartTooltip
                  content={
                    <SeriesTooltip metricName={name} color={visual.color} />
                  }
                />

                {/* A range area: each point carries `[lower, upper]`, so the band follows the
                    expectation instead of being measured up from zero. */}
                <Area
                  dataKey="band"
                  stroke="none"
                  fill={visual.color}
                  fillOpacity={0.08}
                  isAnimationActive={false}
                  connectNulls={false}
                  activeDot={false}
                />

                <Line
                  dataKey="expected"
                  type="linear"
                  stroke={EXPECTED_COLOR}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
                <Area
                  dataKey="value"
                  type="linear"
                  stroke={visual.color}
                  strokeWidth={1}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {/* Markers only, no connecting stroke: these days are not a series. They use
                    the same halo the Organic Performance chart puts on an anomaly, because
                    they mean the same thing to a reader — this day broke out of its range. */}
                <Line
                  dataKey="outlierValue"
                  stroke="none"
                  isAnimationActive={false}
                  connectNulls={false}
                  dot={props => (
                    <AnomalyCircleMarker
                      key={`outlier-${props.payload?.date ?? props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      // Recharts still calls the renderer for gaps in the series, and the
                      // coordinate it supplies for them is not reliably empty. The row is the
                      // only thing that actually knows whether this day has a marker.
                      show={props.payload?.outlierValue != null}
                      color={visual.color}
                    />
                  )}
                  activeDot={false}
                />
              </ComposedChart>
            </ChartContainer>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              <Key color={visual.color}>{name}</Key>
              <Key color={EXPECTED_COLOR} dashed>
                Expected
              </Key>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-4 rounded-[2px]"
                  style={{ backgroundColor: visual.color, opacity: 0.12 }}
                />
                Normal range
              </span>
              {outlierCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-flex h-3 w-3 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${visual.color}1F` }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: visual.color }}
                    />
                  </span>
                  {outlierCount} day{outlierCount === 1 ? "" : "s"} outside the
                  normal range
                </span>
              ) : null}
            </div>
          </div>

          {data && data.windows.length > 0 ? (
            <>
              <SectionLabel>Window evaluations</SectionLabel>
              <div className="px-6">
                {[...data.windows]
                  .sort((a, b) => a.windowDays - b.windowDays)
                  .map((window) => {
                    const reading = unusualness(window.zScore);

                    return (
                      <FactRow
                        key={window.windowDays}
                        label={`Last ${window.windowDays} day${
                          window.windowDays === 1 ? "" : "s"
                        }`}
                        value={
                          <span className="flex flex-col items-end gap-0.5">
                            <MetricChange
                              actual={window.actual}
                              expected={window.expected}
                              changePct={window.pDeviation}
                            />
                            {reading ? (
                              <span className="text-[11px] text-muted-foreground">
                                {reading}
                              </span>
                            ) : null}
                          </span>
                        }
                      />
                    );
                  })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The halo marker the Organic Performance chart uses for an anomaly: a soft disc of the
 * series colour, a white knockout, then a solid core.
 */
function AnomalyCircleMarker({
  cx,
  cy,
  color,
  show = true,
}: {
  cx?: number | string;
  cy?: number | string;
  color: string;
  show?: boolean;
}) {
  const x = Number(cx);
  const y = Number(cy);

  if (!show || !Number.isFinite(x) || !Number.isFinite(y)) return <g />;

  return (
    <g>
      <circle cx={x} cy={y} r={8} fill={color} opacity={0.12} />
      <circle cx={x} cy={y} r={4.25} fill="#ffffff" opacity={0.9} />
      <circle cx={x} cy={y} r={3.25} fill={color} />
    </g>
  );
}

function Key({
  color,
  dashed,
  children,
}: {
  color: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-0 w-4 border-t-2"
        style={{
          borderColor: color,
          borderTopStyle: dashed ? "dashed" : "solid",
        }}
      />
      {children}
    </span>
  );
}

/**
 * The day's reading against its expectation.
 *
 * Laid out like the Organic Performance tooltip — date at the top, then a coloured dot, the
 * series name and the value on each row — so hovering a monitoring chart feels the same as
 * hovering the dashboard chart.
 */
function SeriesTooltip({
  active,
  payload,
  metricName,
  color,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  metricName?: string;
  color?: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  const { point } = row;
  const seriesColor = color ?? "#6b7280";
  const change = pctChange(point.value, point.expected);

  return (
    <div className="min-w-[196px] rounded-lg border border-border bg-background px-3 py-2.5 shadow-md">
      <p className="mb-2 text-base font-medium leading-5 text-general-foreground">
        {formatMonitoringDate(point.date, { withYear: true })}
      </p>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <p
            className="flex items-center gap-2"
            style={{ color: seriesColor }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: seriesColor }}
            />
            {metricName ?? "Actual"}
          </p>
          <span className="font-medium tabular-nums text-general-foreground">
            {formatCount(point.value)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="h-0 w-2 border-t-2 border-dashed border-[#9ca3af]" />
            Expected
          </p>
          <span className="font-medium tabular-nums text-general-foreground">
            {formatCount(point.expected)}
          </span>
        </div>

        {change != null ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground">Difference</p>
            <span
              className={cn(
                "font-medium tabular-nums",
                change >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {formatSignedPct(change)}
            </span>
          </div>
        ) : null}
      </div>

      {point.lower != null && point.upper != null ? (
        <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Normal range {formatCount(point.lower)} to {formatCount(point.upper)}
          {row.outlierValue != null ? (
            <span className="font-medium text-general-foreground">
              {" "}
              · outside it
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
        {ELIGIBILITY_LABEL[point.eligibility] ?? point.eligibility}
        {point.eligibilityReason ? ` · ${point.eligibilityReason}` : ""}
      </p>
    </div>
  );
}
