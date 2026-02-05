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
  fillHeight?: boolean
  isLoading?: boolean
  hasData?: boolean
}

const chartConfig = {
  sessions: { label: "Sessions", color: "#0374E5" },
  goals: { label: "Goals", color: "#059669" },
}

export function SourcesChannelsChart({
  data,
  title = "Sources/Channels",
  height = 320,
  fillHeight = false,
  isLoading = false,
  hasData = true,
}: SourcesChannelsChartProps) {
  const BAR_SIZE = 12
  const CATEGORY_GAP = 4
  const CHART_CHROME_HEIGHT = 60
  const Y_AXIS_WIDTH = 120
  const Y_LABEL_LEFT_PADDING = 15
  const computedHeight = Math.max(
    height,
    data.length * (BAR_SIZE + CATEGORY_GAP) + CHART_CHROME_HEIGHT
  )

  const renderCategoryTick = (props: any) => {
    const { x, y, payload } = props
    return (
      <text
        x={x}
        y={y}
        dx={-(Y_AXIS_WIDTH - Y_LABEL_LEFT_PADDING)}
        textAnchor="start"
        dominantBaseline="central"
        fontSize="12"
        fill="#0A0A0A"
        style={{ fill: "#0A0A0A", fontSize: "12px" }}
      >
        {payload?.value}
      </text>
    )
  }

  const renderLegend = (props: any) => {
    const { payload } = props
    // Reorder to show Goals first, then Sessions
    const orderedPayload = [...payload].sort((a, b) => {
      if (a.dataKey === "goalsNorm") return -1
      if (b.dataKey === "goalsNorm") return 1
      return 0
    })
    return (
      <div className="flex items-center justify-end gap-4">
        {orderedPayload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-[2px]",
                entry.dataKey === "sessionsNorm" && "opacity-30"
              )}
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-center text-xs font-normal leading-[150%] tracking-[0.18px] text-general-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3"
        style={{ minHeight: height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3"
        style={{ minHeight: height }}
      >
        <span className="text-muted-foreground text-sm">No channel data available</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-lg p-3 border border-general-border bg-white"
      style={fillHeight ? { minHeight: height, height: "100%" } : { minHeight: height, height: computedHeight }}
    >
      <div className="flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full justify-start aspect-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 15, bottom: 0, left: 0 }}
              barSize={BAR_SIZE}
              barGap={-BAR_SIZE}
              barCategoryGap={CATEGORY_GAP}
              maxBarSize={BAR_SIZE}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={renderCategoryTick}
                width={Y_AXIS_WIDTH}
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
                cursor={false}
                shared={true}
                trigger="hover"
              />
              {/* <Legend
                content={renderLegend}
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "0px" }}
              /> */}
              <Bar 
                dataKey="sessionsNorm" 
                radius={[15, 15, 15, 15]} 
                fill="#0374E5" 
                opacity={0.3} 
                name="Sessions"
                isAnimationActive={false}
                barSize={BAR_SIZE}
              />
              <Bar 
                dataKey="goalsNorm" 
                radius={[15, 15, 15, 15]} 
                fill="#059669" 
                name="Goals"
                isAnimationActive={false}
                barSize={BAR_SIZE}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
