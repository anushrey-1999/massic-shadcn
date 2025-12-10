"use client"

import { ReactNode } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { StatsBadge } from "./StatsBadge"

interface LegendItem {
  color: string
  label: string
  value: string | number
  change: number
}

interface InteractionsChartCardProps {
  icon: ReactNode
  title: string
  legend: LegendItem
  data: Record<string, any>[]
  dataKey: string
  strokeColor?: string
  chartHeight?: number
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
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: legend.color }} />
          <span className="text-sm">{legend.label}</span>
          <span className="text-sm font-medium">{legend.value}</span>
          <StatsBadge value={legend.change} />
        </div>
      </div>
      <div className="p-4" style={{ height: chartHeight }}>
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
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
  )
}
