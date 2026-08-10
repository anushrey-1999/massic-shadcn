"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TopicSignalRow } from "@/types/topic-signals-types";

export function TopicSignalHistoryChart({ row }: { row: TopicSignalRow }) {
  const data = React.useMemo(
    () =>
      (row.history || []).map((point) => ({
        date: point.month,
        value: point.value,
      })),
    [row.history]
  );

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No history available.
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3">
        <p className="text-sm font-medium">Demand history</p>
        <p className="text-xs text-muted-foreground">
          Monthly observed demand used for the trend signal.
        </p>
      </div>
      <ChartContainer
        config={{ value: { label: "Demand", color: "#2563eb" } }}
        className="h-[240px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
            <defs>
              <linearGradient id="topic-signal-history-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={Math.max(Math.floor(data.length / 8), 1)}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#topic-signal-history-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
