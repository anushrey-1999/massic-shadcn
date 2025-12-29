"use client"

import { Target, Loader2, SquareMousePointer } from "lucide-react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
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
  height = 320,
  isLoading = false,
  hasData = true,
  visibleLines,
  onLegendToggle,
}: ClicksGoalsChartCardProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [zoomCenter, setZoomCenter] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const zoomedData = useMemo(() => {
    if (zoomLevel <= 1 || zoomCenter === null || data.length === 0) return data
    const totalPoints = data.length
    const visiblePoints = Math.max(2, Math.floor(totalPoints / zoomLevel))
    const halfVisible = Math.floor(visiblePoints / 2)
    let startIndex = Math.max(0, zoomCenter - halfVisible)
    let endIndex = Math.min(totalPoints - 1, zoomCenter + halfVisible)
    return data.slice(startIndex, endIndex + 1)
  }, [data, zoomLevel, zoomCenter])

  useEffect(() => {
    const element = chartRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const relativeX = x / rect.width
      const dataIndex = Math.floor(relativeX * data.length)
      setZoomCenter(Math.max(0, Math.min(data.length - 1, dataIndex)))
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      setZoomLevel((prev) => Math.max(1, Math.min(prev * zoomFactor, data.length / 2)))
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [data.length])

  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1)
    setZoomCenter(null)
  }, [])

  const legendItems = [
    {
      key: "sessions",
      icon: <SquareMousePointer className="h-6 w-6 rotate-90" />,
      value: String(clicksMetric.value),
      change: clicksMetric.change,
      color: "#2563EB",
      checked: visibleLines.sessions ?? true,
    },
    {
      key: "goals",
      icon: <Target className="h-6 w-6" />,
      value: String(goalsMetric.value),
      change: goalsMetric.change,
      color: "#059669",
      checked: visibleLines.goals ?? true,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3" style={{ height }}>
        <span className="text-muted-foreground text-sm">No GA4 data available</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col  bg-white overflow-hidden border border-general-border p-3 rounded-lg" style={{ height }}>
      <ChartLegend
        items={legendItems}
        onToggle={onLegendToggle}
        className="shrink-0"
      />

      <div
        ref={chartRef}
        className="flex-1 min-h-0 w-full cursor-grab active:cursor-grabbing"
        onDoubleClick={handleDoubleClick}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={zoomedData} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
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
                interval={zoomedData.length <= 7 ? 0 : zoomedData.length <= 14 ? 1 : zoomedData.length <= 30 ? Math.floor(zoomedData.length / 8) : zoomedData.length <= 90 ? Math.floor(zoomedData.length / 10) : Math.floor(zoomedData.length / 12)}
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
                  type="linear"
                  dataKey="sessionsNorm"
                  stroke="#2563EB"
                  fill="url(#fillSessions)"
                  strokeWidth={1}
                  name="Sessions"
                />
              )}
              {visibleLines.goals && (
                <Area
                  type="linear"
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
