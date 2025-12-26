"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Metric {
  label: string
  value: string | number
  change: number
}

interface AITrafficChartCardProps {
  title: string
  metrics: Metric[]
  data: Record<string, any>[]
  dataKey?: string
  strokeColor?: string
  chartHeight?: number
  isLoading?: boolean
  hasData?: boolean
}

export function AITrafficChartCard({
  title,
  metrics,
  data,
  dataKey = "traffic",
  strokeColor = "#3b82f6",
  chartHeight = 233,
  isLoading = false,
  hasData = true,
}: AITrafficChartCardProps) {
  const chartConfig = {
    [dataKey]: { label: title, color: strokeColor },
  }

  if (isLoading) {
    return (
      <div className="flex flex-col bg-white">
        <Skeleton className="h-6 w-48 m-3" />
        <div className="flex items-center gap-2 p-2 bg-secondary m-2 rounded-lg">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col gap-1 rounded-lg border border-general-border p-2 bg-white">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="flex-1 p-3">
          <Skeleton className="h-[180px] w-full" />
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col rounded-lg  bg-white">
        <h3 className="p-3 text-base font-medium leading-[150%] text-general-secondary-foreground">{title}</h3>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-general-muted-foreground">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg gap-4  bg-white">
      <div className="flex items-center gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex flex-1 flex-col gap-1 rounded-lg p-2 bg-foreground-light">
            <span className="text-xs font-medium text-general-muted-foreground">{metric.label}</span>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-base text-general-foreground font-medium">{metric.value}</span>
              <div className="flex items-center gap-0.5">
                {metric.change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-[#16A34A]" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-[#DC2626]" />
                )}
                <span className={cn(
                  "text-[10px] font-medium text-general-muted-foreground",
                )}>
                  {metric.change >= 0 ? "+" : ""}{metric.change}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1">
        <div style={{ height: chartHeight }}>
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#737373" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={strokeColor}
                  fill={`url(#fill${dataKey})`}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
