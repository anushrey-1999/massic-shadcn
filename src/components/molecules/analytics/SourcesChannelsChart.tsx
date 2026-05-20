"use client"

import { scaleBand } from "d3-scale"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
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
  sessions: { label: "Sessions", color: "#f97316" },
  goals: { label: "Goals", color: "#059669" },
}

const EMPTY_BAR_COLOR = "#E5E5E5"

export function SourcesChannelsChart({
  data,
  title,
  height = 320,
  fillHeight = false,
  isLoading = false,
  hasData = true,
}: SourcesChannelsChartProps) {
  const BAR_SIZE = 8
  const GAP_PX = 14
  const CHART_CHROME_HEIGHT = 60
  const Y_AXIS_WIDTH = 120
  const Y_LABEL_LEFT_PADDING = 15
  const barAreaHeight = data.length * BAR_SIZE + (data.length - 1) * GAP_PX
  const LABEL_VERTICAL_MARGIN = 10
  const chartContentHeight = barAreaHeight + CHART_CHROME_HEIGHT + LABEL_VERTICAL_MARGIN * 2
  const categoryScale = scaleBand().paddingInner(0).paddingOuter(0)

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
      style={fillHeight ? { minHeight: height, height: "100%" } : { minHeight: height, height }}
    >
      {title ? (
        <span className="text-left text-base font-medium text-general-secondary-foreground">
          {title}
        </span>
      ) : null}
      <div className="flex-1 min-h-0 flex justify-center items-center">
        <div className="w-full max-w-2xl" style={{ height: chartContentHeight }}>
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: LABEL_VERTICAL_MARGIN, right: 15, bottom: LABEL_VERTICAL_MARGIN, left: 0 }}
                barSize={BAR_SIZE}
                barGap={-BAR_SIZE}
                maxBarSize={BAR_SIZE}
              >
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  scale={categoryScale}
                  axisLine={false}
                  tickLine={false}
                  tick={renderCategoryTick}
                  width={Y_AXIS_WIDTH}
                  interval={0}
                  tickCount={data.length}
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
                <Bar
                  dataKey="sessionsNorm"
                  radius={[15, 15, 15, 15]}
                  fill={chartConfig.sessions.color}
                  opacity={0.3}
                  name="Sessions"
                  isAnimationActive={false}
                  barSize={BAR_SIZE}
                >
                  {data.map((item) => (
                    <Cell
                      key={`sessions-${item.name}`}
                      fill={item.sessions > 0 ? chartConfig.sessions.color : EMPTY_BAR_COLOR}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="goalsNorm"
                  radius={[15, 15, 15, 15]}
                  fill={chartConfig.goals.color}
                  name="Goals"
                  isAnimationActive={false}
                  barSize={BAR_SIZE}
                >
                  {data.map((item) => (
                    <Cell
                      key={`goals-${item.name}`}
                      fill={item.goals > 0 ? chartConfig.goals.color : EMPTY_BAR_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
