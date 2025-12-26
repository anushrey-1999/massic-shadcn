"use client"

import { ReactNode, useState, useCallback, useMemo, useRef, useEffect } from "react"
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
  height = 230,
  showYAxis = false,
  className,
}: AreaChartCardProps) {
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

  return (
    <div className={className}>
      {legendItems && (
        <ChartLegend className="mb-4" items={legendItems} />
      )}
      <div
        ref={chartRef}
        style={{ height }}
        className="cursor-grab active:cursor-grabbing"
        onDoubleClick={handleDoubleClick}
      >
        <ChartContainer config={config} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={zoomedData} margin={{ top: 10, right: 10, left: 20, bottom: 25 }}>
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
                interval={zoomedData.length <= 7 ? 0 : zoomedData.length <= 14 ? 1 : zoomedData.length <= 30 ? Math.floor(zoomedData.length / 8) : zoomedData.length <= 90 ? Math.floor(zoomedData.length / 10) : Math.floor(zoomedData.length / 12)}
              />
              {showYAxis ? <YAxis /> : <YAxis hide />}
              <ChartTooltip content={<ChartTooltipContent />} />
              {areas.map((area) => (
                <Area
                  key={area.dataKey}
                  type="linear"
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
