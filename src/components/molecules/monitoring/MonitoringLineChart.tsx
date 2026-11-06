"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonitoringPoint, MonitoringShade } from "@/hooks/use-monitoring-screen";
import { COMPARED_FILL, LINE_COLOR, SHADE_COLORS, USUAL_COLOR, formatChartDate } from "./monitoring-ui";

export interface MonitoringComparedBand {
  start: string;
  end: string;
  label: string;
}

interface MonitoringLineChartProps {
  points: MonitoringPoint[];
  usualPerDay: number | null;
  shading: MonitoringShade[];
  height: number;
  /** Main chart: solid 50% Usual line with grid; mini chart: dashed Usual, no grid. */
  variant: "main" | "mini";
  compared?: MonitoringComparedBand | null;
  /** Hover text per date, written by the server. */
  dayNotes?: Record<string, string>;
  onShadeClick?: (cardId: string) => void;
  showXAxis?: boolean;
}

const AXIS_TICKS = 6;
const LABEL_CHAR_WIDTH = 6.4;

function pickTicks(dates: string[]): string[] {
  if (dates.length <= AXIS_TICKS) return dates;
  const picked = new Set<string>();
  for (let index = 0; index < AXIS_TICKS; index += 1) {
    picked.add(dates[Math.round((index * (dates.length - 1)) / (AXIS_TICKS - 1))]);
  }
  return [...picked];
}

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = Math.ceil(value / magnitude / 4) * magnitude;
  return Math.max(step * 4, 4);
}

interface ShadeLabelProps {
  viewBox?: { x: number; y: number; width: number };
  value: string;
  color: string;
  row: number;
}

/** The label goes inside the shaded area only when it fits; the tooltip carries it otherwise. */
function ShadeLabel({ viewBox, value, color, row }: ShadeLabelProps) {
  if (!viewBox) return null;
  if (viewBox.width < value.length * LABEL_CHAR_WIDTH + 16) return null;
  return (
    <text
      x={viewBox.x + 8}
      y={viewBox.y + 18 + row * 16}
      fill={color}
      fontSize={12}
      fontWeight={500}
    >
      {value}
    </text>
  );
}

interface AxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

/** The edge dates sit flush with the chart edges instead of centring past them. */
function AxisTick({ x = 0, y = 0, payload, first, last }: AxisTickProps & { first?: string; last?: string }) {
  if (!payload) return null;
  const anchor = payload.value === first ? "start" : payload.value === last ? "end" : "middle";
  return (
    <text
      x={x}
      y={y + 14}
      textAnchor={anchor}
      fontSize={12}
      letterSpacing={0.18}
      fill="var(--general-muted-foreground)"
    >
      {formatChartDate(payload.value)}
    </text>
  );
}

interface TooltipPayload {
  active?: boolean;
  label?: string;
}

export function MonitoringLineChart({
  points,
  usualPerDay,
  shading,
  height,
  variant,
  compared = null,
  dayNotes,
  onShadeClick,
  showXAxis = true,
}: MonitoringLineChartProps) {
  const isMain = variant === "main";
  const dates = useMemo(() => points.map((point) => point.date), [points]);
  const ticks = useMemo(() => pickTicks(dates), [dates]);

  const yMax = useMemo(() => {
    const values = points.map((point) => point.value ?? 0);
    return niceMax(Math.max(...values, usualPerDay ?? 0) * 1.1);
  }, [points, usualPerDay]);

  const yTicks = useMemo(() => [1, 2, 3, 4].map((step) => (yMax * step) / 4), [yMax]);

  const shadeAt = (date: string | undefined) =>
    date ? shading.find((shade) => shade.start <= date && shade.end >= date) : undefined;

  const handleClick = (state: { activeLabel?: string | number } | null) => {
    if (!onShadeClick || !state?.activeLabel) return;
    const shade = shadeAt(String(state.activeLabel));
    if (shade) onShadeClick(shade.cardId);
  };

  const renderTooltip = ({ active, label }: TooltipPayload) => {
    if (!active || !label) return null;
    const note = dayNotes?.[label];
    const shade = shadeAt(label);
    if (!note && !shade) return null;
    return (
      <div className="max-w-[320px] rounded-[8px] border border-general-border bg-white px-3 py-2 text-xs leading-[1.5] tracking-[0.18px] text-general-foreground shadow-xs">
        {note ? <p>{note}</p> : null}
        {shade ? (
          <p className="mt-1 text-general-muted-foreground">
            {shade.label}. {shade.tooltip}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={points}
          margin={{ top: isMain ? 12 : 2, right: 0, bottom: 0, left: 0 }}
          onClick={handleClick}
          style={onShadeClick && shading.length ? { cursor: "pointer" } : undefined}
        >
          {isMain ? (
            <CartesianGrid vertical={false} stroke="var(--general-border)" strokeWidth={1} />
          ) : null}
          <XAxis
            dataKey="date"
            ticks={ticks}
            interval={0}
            axisLine={false}
            tickLine={false}
            hide={!showXAxis}
            height={showXAxis ? 28 : 0}
            tick={(props: AxisTickProps) => (
              <AxisTick {...props} first={dates[0]} last={dates[dates.length - 1]} />
            )}
          />
          <YAxis hide domain={[0, yMax]} ticks={yTicks} />

          {compared ? (
            <ReferenceArea
              x1={compared.start}
              x2={compared.end}
              fill={COMPARED_FILL}
              fillOpacity={1}
              ifOverflow="hidden"
              label={(props: { viewBox?: ShadeLabelProps["viewBox"] }) => (
                <ShadeLabel viewBox={props.viewBox} value={compared.label} color={USUAL_COLOR} row={0} />
              )}
            />
          ) : null}

          {shading.map((shade, index) => {
            const colors = SHADE_COLORS[shade.direction];
            return (
              <ReferenceArea
                key={`${shade.cardId}-${shade.start}`}
                x1={shade.start}
                x2={shade.end}
                fill={colors.fill}
                fillOpacity={1}
                ifOverflow="hidden"
                label={
                  isMain
                    ? (props: { viewBox?: ShadeLabelProps["viewBox"] }) => (
                        <ShadeLabel viewBox={props.viewBox} value={shade.label} color={colors.label} row={index} />
                      )
                    : undefined
                }
              />
            );
          })}
          {shading.map((shade) => (
            <ReferenceLine
              key={`edge-${shade.cardId}-${shade.start}`}
              x={shade.start}
              stroke={SHADE_COLORS[shade.direction].edge}
              strokeWidth={1}
              ifOverflow="hidden"
            />
          ))}

          {usualPerDay !== null ? (
            <ReferenceLine
              y={usualPerDay}
              stroke={USUAL_COLOR}
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray={isMain ? undefined : "4 3"}
              label={
                isMain
                  ? {
                      value: "Usual",
                      position: "insideTopRight",
                      fill: "var(--general-muted-foreground)",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
          ) : null}

          <Line
            type="linear"
            dataKey="value"
            stroke={LINE_COLOR}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: LINE_COLOR }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {dayNotes || shading.length ? (
            <Tooltip content={renderTooltip} cursor={{ stroke: "var(--general-border)" }} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
