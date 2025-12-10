"use client"

import { MousePointerClick, Target, Loader2 } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartLegend } from "./ChartLegend"

interface MetricData {
  value: string | number
  change: number
  icon: "clicks" | "goals"
}

interface ChartDataPoint {
  date: string
  sessions?: number
  goals?: number
  sessionsNorm?: number
  goalsNorm?: number
}

interface ClicksGoalsChartCardProps {
  clicksMetric: MetricData
  goalsMetric: MetricData
  data: ChartDataPoint[]
  height?: number
  isLoading?: boolean
  hasData?: boolean
  visibleLines: Record<string, boolean>
  onLegendToggle: (key: string, checked: boolean) => void
}

const chartConfig = {
  sessions: { label: "Sessions", color: "#2563EB" },
  goals: { label: "Goals", color: "#059669" },
}

export function ClicksGoalsChartCard({
  clicksMetric,
  goalsMetric,
  data,
  height = 335,
  isLoading = false,
  hasData = true,
  visibleLines,
  onLegendToggle,
}: ClicksGoalsChartCardProps) {
  const legendItems = [
    {
      key: "sessions",
      icon: <MousePointerClick className="h-4 w-4" />,
      value: String(clicksMetric.value),
      change: clicksMetric.change,
      color: "#2563EB",
      checked: visibleLines.sessions ?? true,
    },
    {
      key: "goals",
      icon: <Target className="h-4 w-4" />,
      value: String(goalsMetric.value),
      change: goalsMetric.change,
      color: "#059669",
      checked: visibleLines.goals ?? true,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-3" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-3" style={{ height }}>
        <span className="text-muted-foreground text-sm">No GA4 data available</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-[#E5E5E5] bg-white p-3 overflow-hidden" style={{ height }}>
      <ChartLegend
        items={legendItems}
        onToggle={onLegendToggle}
        className="mb-2 shrink-0"
      />

      <div className="flex-1 min-h-0 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillGoals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#737373" }}
              />
              <YAxis hide domain={[0, 100]} />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const original = data.find((d) => d.date === label)
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      {payload.map((entry: any) => {
                        const key = entry.dataKey.replace("Norm", "") as "sessions" | "goals"
                        const originalValue = original?.[key] ?? 0
                        return (
                          <div key={entry.dataKey} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs">{chartConfig[key]?.label}: {originalValue.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }}
              />
              {visibleLines.sessions && (
                <Area
                  type="monotone"
                  dataKey="sessionsNorm"
                  stroke="#2563EB"
                  fill="url(#fillSessions)"
                  strokeWidth={1}
                  name="Sessions"
                />
              )}
              {visibleLines.goals && (
                <Area
                  type="monotone"
                  dataKey="goalsNorm"
                  stroke="#059669"
                  fill="url(#fillGoals)"
                  strokeWidth={1}
                  name="Goals"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
