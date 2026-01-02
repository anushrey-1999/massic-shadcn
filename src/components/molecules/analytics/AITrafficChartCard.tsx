"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { StatsBadge } from "./StatsBadge"
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
              <StatsBadge value={metric.change} variant="plain" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1">
        <div
          ref={chartRef}
          style={{ height: chartHeight }}
          className="cursor-grab active:cursor-grabbing"
          onDoubleClick={handleDoubleClick}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={zoomedData} margin={{ top: 0, right:10, left: 20, bottom: 0 }}>
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
                  interval={zoomedData.length <= 7 ? 0 : zoomedData.length <= 14 ? 1 : zoomedData.length <= 30 ? Math.floor(zoomedData.length / 8) : zoomedData.length <= 90 ? Math.floor(zoomedData.length / 10) : Math.floor(zoomedData.length / 12)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="linear"
                  dataKey={dataKey}
                  stroke={strokeColor}
                  fill={`url(#fill${dataKey})`}
                  strokeWidth={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
