"use client"

import { ReactNode } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { ChartLegend } from "./ChartLegend"

interface AreaConfig {
  dataKey: string
  stroke: string
  fillId: string
  fillColor: string
}

interface LegendItem {
  key: string
  icon: ReactNode
  value: string
  change: number
}

interface AreaChartCardProps {
  data: Record<string, any>[]
  config: ChartConfig
  areas: AreaConfig[]
  legendItems?: LegendItem[]
  height?: number
  showYAxis?: boolean
  className?: string
}

export function AreaChartCard({
  data,
  config,
  areas,
  legendItems,
  height = 210,
  showYAxis = false,
  className,
}: AreaChartCardProps) {
  return (
    <div className={className}>
      {legendItems && (
        <ChartLegend className="mb-4" items={legendItems} />
      )}
      <div style={{ height }}>
        <ChartContainer config={config} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {areas.map((area) => (
                  <linearGradient key={area.fillId} id={area.fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={area.fillColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={area.fillColor} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
              />
              {showYAxis ? <YAxis /> : <YAxis hide />}
              <ChartTooltip content={<ChartTooltipContent />} />
              {areas.map((area) => (
                <Area
                  key={area.dataKey}
                  type="monotone"
                  dataKey={area.dataKey}
                  stroke={area.stroke}
                  fill={`url(#${area.fillId})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
