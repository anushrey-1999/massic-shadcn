"use client";

import { ReactNode } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { StatsBadge } from "./StatsBadge";

interface LegendItem {
  color: string;
  label: string;
  value: string | number;
  change: number;
}

interface InteractionsChartCardProps {
  icon: ReactNode;
  title: string;
  legend: LegendItem;
  data: Record<string, any>[];
  dataKey: string;
  strokeColor?: string;
  chartHeight?: number;
}

export function InteractionsChartCard({
  icon,
  title,
  legend,
  data,
  dataKey,
  strokeColor = "#3b82f6",
  chartHeight = 200,
}: InteractionsChartCardProps) {
  const chartConfig = {
    [dataKey]: { label: legend.label, color: strokeColor },
  };

  return (
    <div className=" bg-white rounded-lg border border-general-border flex flex-col gap-2">
      <div className="text-base text-general-secondary-foreground border-b border-general-border-four w-full p-2 font-medium">
        {title}
      </div>

      <div className="p-2 flex flex-col gap-2">
        <div className="flex items-center gap-4 ">
          <div className="">
            <div className="bg-foreground-light rounded-lg p-2 flex flex-col gap-1">
              <span className="text-sm text-general-muted-foreground font-medium">
                {legend.label}
              </span>
              <div className="flex items-center gap-2 justify-between">
                <span className="text-base font-medium">{legend.value}</span>
                <StatsBadge value={legend.change} />
              </div>
            </div>
          </div>
        </div>
        <div className="" style={{ height: chartHeight }}>
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`fill${dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={strokeColor}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor={strokeColor}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={strokeColor}
                  fill={`url(#fill${dataKey})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
