"use client";

import { useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  monitoringErrorMessage,
  monitoringErrorStatus,
  useMonitoringMetric,
  type MonitoringMetricDetail,
  type MonitoringRange,
  type MonitoringWeekBucket,
} from "@/hooks/use-monitoring-screen";
import { MonitoringLineChart } from "./MonitoringLineChart";
import {
  ChartEdgeDates,
  ChartLegend,
  LINE_COLOR,
  MetricStatusTag,
  PanelSection,
  PanelSkeleton,
  SectionLabel,
  SegmentedToggle,
  USUAL_COLOR,
  formatChartDate,
  shadeDirections,
} from "./monitoring-ui";

type ChartView = "daily" | "weekly";

const CHART_HEIGHT = 150;
/** Above this many weeks the per-bar labels would collide, so only the edge dates show. */
const MAX_LABELLED_WEEKS = 8;

interface MonitoringMetricPanelProps {
  businessId: string;
  metricKey: string | null;
  range: MonitoringRange;
  onClose: () => void;
}

/** "Sep 25 – Oct 1", or "Oct 2 – 8" inside one month. */
function weekLabel(bucket: MonitoringWeekBucket): string {
  if (bucket.start === bucket.end) return formatChartDate(bucket.start);
  const sameMonth = bucket.start.slice(0, 7) === bucket.end.slice(0, 7);
  return `${formatChartDate(bucket.start)} – ${sameMonth ? Number(bucket.end.slice(8, 10)) : formatChartDate(bucket.end)}`;
}

function NotConnectedChart() {
  return (
    <div
      style={{ height: CHART_HEIGHT }}
      className="flex items-center justify-center rounded-[8px] border border-dashed border-general-border text-xs text-general-muted-foreground"
    >
      Not connected.
    </div>
  );
}

function WeeklyBars({ buckets, usualPerWeek }: { buckets: MonitoringWeekBucket[]; usualPerWeek: number | null }) {
  const yMax = useMemo(() => {
    const top = Math.max(...buckets.map((bucket) => bucket.value), usualPerWeek ?? 0);
    return top > 0 ? top * 1.15 : 4;
  }, [buckets, usualPerWeek]);
  const labelled = buckets.length <= MAX_LABELLED_WEEKS;

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: MonitoringWeekBucket }> }) => {
    const bucket = active ? payload?.[0]?.payload : undefined;
    if (!bucket) return null;
    return (
      <div className="rounded-[8px] border border-general-border bg-white px-3 py-2 text-xs leading-[1.5] tracking-[0.18px] text-general-foreground shadow-xs">
        <p>
          <span className="font-medium">{bucket.value.toLocaleString("en-US")}</span>
          <span className="text-general-muted-foreground"> · {weekLabel(bucket)}</span>
        </p>
        {bucket.partial ? <p className="text-general-muted-foreground">Not a full week</p> : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <div style={{ height: CHART_HEIGHT }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
            <XAxis dataKey="start" hide />
            <YAxis hide domain={[0, yMax]} />
            <Tooltip content={renderTooltip} cursor={{ fill: "#f5f5f5" }} />
            <Bar dataKey="value" fill={LINE_COLOR} radius={[2, 2, 0, 0]} maxBarSize={56} isAnimationActive={false}>
              {buckets.map((bucket) => (
                <Cell key={bucket.start} fillOpacity={bucket.partial ? 0.45 : 1} />
              ))}
            </Bar>
            {usualPerWeek !== null ? (
              <ReferenceLine y={usualPerWeek} stroke={USUAL_COLOR} strokeOpacity={0.5} strokeDasharray="4 3" />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {labelled ? (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
          {buckets.map((bucket) => (
            <div key={bucket.start} className="flex flex-col items-center gap-0.5 text-center leading-[1.5]">
              <span className="text-[10px] font-medium tracking-[0.15px] text-general-foreground">
                {bucket.value.toLocaleString("en-US")}
              </span>
              <span className="text-[10px] tracking-[0.15px] text-general-muted-foreground">{weekLabel(bucket)}</span>
            </div>
          ))}
        </div>
      ) : (
        <ChartEdgeDates first={buckets[0]?.start} last={buckets[buckets.length - 1]?.end} />
      )}
    </div>
  );
}

function KeyNumber({ detail }: { detail: MonitoringMetricDetail }) {
  const [view, setView] = useState<ChartView>("daily");
  const { daily, weekly, labels } = detail.chart;
  const points = daily.points;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-general-border px-4 pt-3.5 pb-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl leading-[1.2] font-semibold tracking-[-0.48px] text-general-foreground">
            {detail.connected ? detail.total.toLocaleString("en-US") : "—"}
          </span>
          <span className="min-w-0 truncate text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
            {detail.caption}
          </span>
        </div>
        {detail.usualSentence ? (
          <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">{detail.usualSentence}</p>
        ) : null}
      </div>

      <div className="flex min-h-8 items-center gap-2">
        <SectionLabel>{view === "daily" ? labels.eachDay : labels.eachWeek}</SectionLabel>
        <div className="flex-1" />
        <SegmentedToggle
          ariaLabel="Chart view"
          options={[
            { key: "daily", label: labels.daily },
            { key: "weekly", label: labels.weekly },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {!detail.connected ? (
        <NotConnectedChart />
      ) : view === "daily" ? (
        <>
          <MonitoringLineChart
            variant="mini"
            height={CHART_HEIGHT}
            points={points}
            usualPerDay={daily.usualPerDay}
            shading={daily.shading}
            showXAxis={false}
          />
          <ChartEdgeDates first={points[0]?.date} last={points[points.length - 1]?.date} />
        </>
      ) : (
        <WeeklyBars buckets={weekly.buckets} usualPerWeek={weekly.usualPerWeek} />
      )}

      <ChartLegend
        usual={view === "daily" ? daily.usualPerDay !== null : weekly.usualPerWeek !== null}
        directions={view === "daily" ? shadeDirections(daily.shading) : []}
      />
    </div>
  );
}

function QuickCheck({ quickCheck }: { quickCheck: MonitoringMetricDetail["quickCheck"] }) {
  const { head, rows } = quickCheck;
  return (
    <PanelSection label={quickCheck.title}>
      <table className="w-full border-collapse text-xs leading-[1.5] tracking-[0.18px]">
        <thead>
          <tr className="text-general-muted-foreground">
            <th className="py-1.5 text-left font-normal">{head.dates}</th>
            <th className="w-14 py-1.5 text-right font-normal">{head.total}</th>
            <th className="w-24 py-1.5 text-right font-normal">{head.usual}</th>
            <th className="w-[156px] py-1.5 pl-3 text-left font-normal">{head.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.days} className="border-t border-general-border">
              <td className="py-2 text-left text-general-foreground">{row.label}</td>
              <td className="py-2 text-right font-medium whitespace-nowrap text-general-foreground">
                {row.status === "no_data" ? "—" : row.total.toLocaleString("en-US")}
              </td>
              <td className="py-2 text-right whitespace-nowrap text-general-muted-foreground">{row.usual ?? ""}</td>
              <td className="py-2 pl-3 text-left">
                <MetricStatusTag status={row.status} label={row.statusLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PanelSection>
  );
}

/** Metrics tab row detail (PRD 10.4). */
export function MonitoringMetricPanel({ businessId, metricKey, range, onClose }: MonitoringMetricPanelProps) {
  const query = useMonitoringMetric(businessId, metricKey, range);
  const detail = query.data ?? null;
  const notFound = monitoringErrorStatus(query.error) === 404;

  return (
    <Sheet open={Boolean(metricKey)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" showClose={false} className="w-full gap-0 border-general-border p-0 sm:max-w-[520px]">
        <div className="flex flex-col gap-2 py-4 pr-4 pl-6">
          <div className="flex min-h-8 items-center gap-2">
            {detail ? (
              <MetricStatusTag status={detail.status} label={detail.statusLabel} />
            ) : query.isError ? null : (
              <Skeleton className="h-5 w-24 rounded-[12px]" />
            )}
            <div className="flex-1" />
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Close">
                <X className="size-4" strokeWidth={1.5} />
              </Button>
            </SheetClose>
          </div>
          {detail || query.isError ? (
            <SheetTitle className="text-xl leading-[1.2] font-semibold tracking-[-0.4px] text-general-foreground">
              {detail?.name ?? "Metric"}
            </SheetTitle>
          ) : (
            <>
              <SheetTitle className="sr-only">Metric</SheetTitle>
              <Skeleton className="h-6 w-1/3" />
            </>
          )}
          <SheetDescription className="sr-only">Metric details</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isLoading ? (
            <PanelSkeleton />
          ) : query.isError ? (
            <div className="flex flex-col items-start gap-3 px-6 pt-2 pb-6">
              <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
                {monitoringErrorMessage(query.error)}
              </p>
              {notFound ? null : (
                <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                  <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} strokeWidth={1.5} />
                  Try again
                </Button>
              )}
            </div>
          ) : detail ? (
            <div className="flex flex-col px-6 pt-2 pb-6">
              <div className="pb-5">
                <KeyNumber key={detail.key} detail={detail} />
              </div>
              <QuickCheck quickCheck={detail.quickCheck} />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
