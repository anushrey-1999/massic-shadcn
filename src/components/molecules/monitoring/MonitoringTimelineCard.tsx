"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChartColumn, Eye, MousePointerClick } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  MonitoringChart,
  MonitoringHealthColor,
  MonitoringLineMetric,
  MonitoringRangeModel,
  MonitoringScreen,
  MonitoringSection,
  MonitoringStripDay,
} from "@/hooks/use-monitoring-screen";
import { MonitoringLineChart } from "./MonitoringLineChart";
import {
  MonitoringCardShell,
  MonitoringPartError,
  SHADE_COLORS,
  STRIP_BAR,
  TimelineSkeleton,
  goalColor,
} from "./monitoring-ui";

const LINE_OPTIONS: Array<{ value: MonitoringLineMetric; label: string; icon: LucideIcon }> = [
  { value: "impressions", label: "Impressions", icon: Eye },
  { value: "clicks", label: "Clicks", icon: MousePointerClick },
  { value: "sessions", label: "Sessions", icon: ChartColumn },
];

const STRIP_LEGEND: Array<{ key: MonitoringHealthColor | "none"; label: string }> = [
  { key: "green", label: "Strong" },
  { key: "amber", label: "Dip" },
  { key: "red", label: "Check" },
  { key: "gray", label: "No signal" },
  { key: "none", label: "Not yet evaluated" },
];

const STRIP_SWATCH: Record<MonitoringHealthColor | "none", string> = {
  green: "bg-green-600",
  amber: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-gray-300",
  none: "bg-gray-200",
};

function MetricSwitch({
  value,
  onChange,
}: {
  value: MonitoringLineMetric;
  onChange: (next: MonitoringLineMetric) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Line on the chart"
      className="flex shrink-0 items-start gap-0.5 rounded-[8px] bg-[#f5f5f5] p-1"
    >
      {LINE_OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "flex min-h-9 items-center justify-center gap-2 rounded-[8px] px-2 py-[7.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-foreground transition-colors",
              active ? "bg-black/10" : "hover:bg-black/5"
            )}
          >
            <Icon className="size-[16.25px]" strokeWidth={1.5} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function HealthStrip({ days }: { days: MonitoringStripDay[] }) {
  return (
    <div className="flex h-6 w-full gap-[3px]" aria-label="Health by day">
      {days.map((day) => {
        const bar = STRIP_BAR[day.color ?? "none"] ?? STRIP_BAR.none;
        return (
          <Tooltip key={day.date}>
            <TooltipTrigger asChild>
              <div className={cn("h-6 min-w-px flex-1 rounded-t-[2px]", bar)} />
            </TooltipTrigger>
            <TooltipContent>{day.tooltip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function LegendKey({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2 shrink-0 rounded-[2px]", swatch)} />
      <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
        {label}
      </span>
    </span>
  );
}

/** One lane per picked goal, a dot on each day it was recorded; hovering a dot names the goal (PRD 5.5). */
function GoalDotRows({
  dates,
  goals,
}: {
  dates: string[];
  goals: MonitoringChart["goalDots"]["goals"];
}) {
  if (!goals.length) return null;
  const count = dates.length || 1;
  const index = new Map(dates.map((date, position) => [date, position]));
  return (
    <div className="-mt-1 flex w-full flex-col" aria-label="Goals recorded by day">
      {goals.map((goal) => (
        <div key={goal.eventName} className="relative h-2.5 w-full" aria-label={goal.name}>
          {goal.dates.map((date) => {
            const position = index.get(date);
            if (position === undefined) return null;
            return (
              <Tooltip key={date}>
                <TooltipTrigger asChild>
                  <span
                    className="group absolute top-1/2 flex size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
                    style={{ left: `${((position + 0.5) / count) * 100}%` }}
                  >
                    <span
                      className="size-1.5 rounded-full transition-transform duration-150 group-hover:scale-[1.6]"
                      style={{ background: goalColor(goal.colorIndex) }}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-medium">{goal.name}</span>
                  <span className="opacity-70"> · {format(parseISO(date), "EEE, MMM d")}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface MonitoringTimelineCardProps {
  chart: MonitoringSection<MonitoringChart> | null;
  range: MonitoringRangeModel | null;
  sources: MonitoringScreen["sources"] | null;
  loading: boolean;
  onRetry: () => void;
  retrying: boolean;
  onOpenCard: (cardId: string) => void;
}

export function MonitoringTimelineCard({
  chart,
  range,
  sources,
  loading,
  onRetry,
  retrying,
  onOpenCard,
}: MonitoringTimelineCardProps) {
  const [line, setLine] = useState<MonitoringLineMetric | null>(null);
  const [showGoals, setShowGoals] = useState<boolean | null>(null);

  const data = chart?.data ?? null;
  const activeLine = line ?? data?.defaultLine ?? "impressions";
  const lineWindow = data?.lines[activeLine] ?? null;

  const shading = useMemo(
    () => [...(lineWindow?.shading ?? []), ...(data?.goalShading ?? [])],
    [lineWindow, data]
  );
  const dayNotes = useMemo(
    () => Object.fromEntries((data?.days ?? []).map((day) => [day.date, day.note])),
    [data]
  );
  const directions = useMemo(() => new Set(shading.map((shade) => shade.direction)), [shading]);

  if (loading || !chart) {
    return (
      <MonitoringCardShell>
        <TimelineSkeleton />
      </MonitoringCardShell>
    );
  }

  const goals = data?.goalDots.goals ?? [];
  const goalsOn = showGoals ?? data?.goalDots.defaultOn ?? false;
  const source = activeLine === "sessions" ? sources?.ga4 : sources?.gsc;

  return (
    <MonitoringCardShell className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {range ? (
          <span className="flex min-h-8 items-center justify-center rounded-[8px] border border-general-border-three px-3 py-[5.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap text-general-foreground">
            {range.label}
          </span>
        ) : null}
        {range ? (
          <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
            {range.compared}
          </span>
        ) : null}
        <div className="flex-1" />
        {data ? <MetricSwitch value={activeLine} onChange={setLine} /> : null}
      </div>

      {!data && chart.error ? (
        <MonitoringPartError
          message={chart.error.message}
          retryLabel={chart.error.retry}
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : null}

      {data && lineWindow ? (
        <>
          <div className="flex flex-col gap-2">
            <HealthStrip days={data.healthStrip} />
            {lineWindow.connected ? (
              <MonitoringLineChart
                variant="main"
                height={228}
                points={lineWindow.points}
                usualPerDay={lineWindow.usualPerDay}
                shading={shading}
                dayNotes={dayNotes}
                onShadeClick={onOpenCard}
              />
            ) : (
              <div className="flex h-[228px] items-center justify-center rounded-[8px] border border-dashed border-general-border">
                <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
                  {source ? `${source.name} is not connected.` : "Not connected."}
                </p>
              </div>
            )}
            {goalsOn ? (
              <GoalDotRows dates={lineWindow.points.map((point) => point.date)} goals={goals} />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {STRIP_LEGEND.map((item) => (
              <LegendKey key={item.key} swatch={STRIP_SWATCH[item.key]} label={item.label} />
            ))}
            {directions.has("down") ? (
              <LegendKey swatch={SHADE_COLORS.down.swatch} label="Unusual drop" />
            ) : null}
            {directions.has("up") ? (
              <LegendKey swatch={SHADE_COLORS.up.swatch} label="Unusual jump" />
            ) : null}
          </div>

          {goals.length ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label htmlFor="monitoring-goal-dots" className="flex w-fit cursor-pointer items-center gap-2">
                <Checkbox
                  id="monitoring-goal-dots"
                  checked={goalsOn}
                  onCheckedChange={(state) => setShowGoals(state === true)}
                />
                <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-foreground">
                  {data.goalDots.label}
                </span>
              </label>
              {goalsOn ? (
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Goal colors">
                  {goals.map((goal) => (
                    <li key={goal.eventName} className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: goalColor(goal.colorIndex) }}
                        aria-hidden
                      />
                      <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
                        {goal.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {data.comparisonNote?.links.length === 1 ? (
            <button
              type="button"
              onClick={() => onOpenCard(data.comparisonNote!.links[0].cardId)}
              className="text-left text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground hover:underline"
            >
              {data.comparisonNote.text}
            </button>
          ) : data.comparisonNote ? (
            <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
              {data.comparisonNote.text}
            </p>
          ) : null}
        </>
      ) : null}
    </MonitoringCardShell>
  );
}
