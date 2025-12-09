"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SourcesChannelsData {
  name: string
  goals: number
  sessions: number
  goalsNorm?: number
  sessionsNorm?: number
}

interface SourcesChannelsChartProps {
  data: SourcesChannelsData[]
  title?: string
  height?: number
  isLoading?: boolean
  hasData?: boolean
}

const chartConfig = {
  goals: { label: "Goals", color: "#059669" },
  sessions: { label: "Sessions", color: "#0374E5" },
}

export function SourcesChannelsChart({
  data,
  title = "Sources/Channels",
  height = 365,
  isLoading = false,
  hasData = true,
}: SourcesChannelsChartProps) {
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="flex items-center justify-end gap-4">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-[2px]",
                entry.dataKey === "sessions" && "opacity-30"
              )}
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-center text-xs font-normal leading-[150%] tracking-[0.18px] text-[#737373]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

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
        <span className="text-muted-foreground text-sm">No channel data available</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-[#E5E5E5] bg-white p-3" style={{ height }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium leading-[150%] text-[#171717]">{title}</h3>
      </div>

      <div className="flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 10, bottom: 10, left: 0 }}
              barGap={-34}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#737373", textAnchor: "end" }}
                width={90}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const original = data.find((d) => d.name === label)
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
              <Legend
                content={renderLegend}
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "10px" }}
              />
              <Bar dataKey="sessionsNorm" radius={4} fill="#0374E5" opacity={0.3} name="Sessions" />
              <Bar dataKey="goalsNorm" radius={4} fill="#059669" name="Goals" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
