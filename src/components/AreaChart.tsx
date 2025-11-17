"use client"

import { useMemo, useState } from "react"
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface ChartData {
  [key: string]: string | number
}

interface AreaChartProps {
  chartData: ChartData[]
  chartConfig: ChartConfig
  dateKey?: string // Key for date/time data (defaults to "date" or first string key)
  height?: number
  showGrid?: boolean
  stacked?: boolean
  enableZoom?: boolean // Enable zoom/brush functionality
}

export function AreaChart({
  chartData,
  chartConfig,
  dateKey,
  height = 400,
  showGrid = true,
  stacked = false,
  enableZoom = true,
}: AreaChartProps) {
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = no zoom, >1 = zoomed in
  const [zoomCenter, setZoomCenter] = useState<number | null>(null) // Index where mouse is hovering
  // Extract data keys (excluding date key)
  const { dataKeys, dateKeyName } = useMemo(() => {
    if (chartData.length === 0) return { dataKeys: [], dateKeyName: "date" }

    const firstItem = chartData[0]
    const keys = Object.keys(firstItem)

    // Find date key
    const foundDateKey =
      dateKey ||
      keys.find((key) => {
        const value = firstItem[key]
        return (
          typeof value === "string" &&
          (key.toLowerCase().includes("date") ||
            key.toLowerCase().includes("time") ||
            key.toLowerCase().includes("month") ||
            key.toLowerCase().includes("day"))
        )
      }) ||
      keys[0] // Fallback to first key if no date key found

    // Filter out date key to get data series
    const dataSeriesKeys = keys.filter((key) => key !== foundDateKey)

    return { dataKeys: dataSeriesKeys, dateKeyName: foundDateKey }
  }, [chartData, dateKey])

  // Generate gradient definitions and Area components dynamically
  const { gradients, areas } = useMemo(() => {
    const gradientDefs: React.ReactElement[] = []
    const areaComponents: React.ReactElement[] = []

    dataKeys.forEach((key, index) => {
      const config = chartConfig[key as keyof typeof chartConfig]
      const color = config?.color || `hsl(var(--chart-${(index % 5) + 1}))`
      const gradientId = `gradient-${key}-${index}`

      // Create gradient definition using SVG elements
      gradientDefs.push(
        <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      )

      // Create area component with gradient
      areaComponents.push(
        <Area
          key={key}
          type="monotone"
          dataKey={key}
          stackId={stacked ? "a" : undefined}
          stroke={color}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-in-out"
        />
      )
    })

    return { gradients: gradientDefs, areas: areaComponents }
  }, [dataKeys, chartConfig, stacked])

  if (chartData.length === 0 || dataKeys.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-muted-foreground"
        style={{ height: `${height}px` }}
      >
        No data available
      </div>
    )
  }

  // Filter data based on zoom level
  const displayData = useMemo(() => {
    // If zoomed in with mouse wheel
    if (enableZoom && zoomLevel > 1 && zoomCenter !== null) {
      const totalDataPoints = chartData.length
      
      // Calculate visible points - ensure at least 2 points are always shown
      const minPoints = 2
      const maxPoints = totalDataPoints
      const visiblePoints = Math.max(minPoints, Math.min(maxPoints, Math.floor(totalDataPoints / zoomLevel)))
      
      const halfVisible = Math.floor(visiblePoints / 2)
      
      // Calculate start and end indices centered on zoom center
      let startIndex = Math.max(0, zoomCenter - halfVisible)
      let endIndex = Math.min(totalDataPoints - 1, zoomCenter + halfVisible)
      
      // Ensure we always have at least minPoints
      if (endIndex - startIndex + 1 < minPoints) {
        if (startIndex === 0) {
          endIndex = Math.min(totalDataPoints - 1, minPoints - 1)
        } else if (endIndex === totalDataPoints - 1) {
          startIndex = Math.max(0, totalDataPoints - minPoints)
        } else {
          // Center around zoomCenter
          startIndex = Math.max(0, zoomCenter - Math.floor(minPoints / 2))
          endIndex = Math.min(totalDataPoints - 1, startIndex + minPoints - 1)
        }
      }
      
      // Ensure we don't go beyond array bounds
      startIndex = Math.max(0, Math.min(startIndex, totalDataPoints - minPoints))
      endIndex = Math.max(minPoints - 1, Math.min(endIndex, totalDataPoints - 1))
      
      const sliced = chartData.slice(startIndex, endIndex + 1)
      
      // Safety check: always return at least some data
      if (sliced.length === 0) {
        return chartData
      }
      
      return sliced
    }
    
    return chartData
  }, [chartData, enableZoom, zoomLevel, zoomCenter])

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!enableZoom) return
    
    e.preventDefault()
    
    // Get the chart container and calculate mouse position relative to chart
    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const chartWidth = rect.width - 60 // Account for margins
    const relativeX = x / chartWidth
    
    // Calculate which data point the mouse is over
    const dataIndex = Math.floor(relativeX * chartData.length)
    const centerIndex = Math.max(0, Math.min(chartData.length - 1, dataIndex))
    
    setZoomCenter(centerIndex)
    
    // Zoom in on scroll up, zoom out on scroll down
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel((prev) => {
      const newZoom = prev * zoomFactor
      // Max zoom: show at least 2 points, but allow more zoom for better control
      const maxZoom = chartData.length / 2
      return Math.max(1, Math.min(newZoom, maxZoom))
    })
  }

  // Reset zoom on double click
  const handleDoubleClick = () => {
    if (enableZoom) {
      setZoomLevel(1)
      setZoomCenter(null)
    }
  }

  return (
    <div 
      className="w-full" 
      style={{ height: `${height}px` }}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsAreaChart
          data={displayData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <defs>
            {gradients}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey={dateKeyName}
            tick={{ fill: "#9ca3af" }}
            tickLine={{ stroke: "#9ca3af" }}
            axisLine={{ stroke: "#9ca3af" }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" />}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          />
          <Legend />
          {areas}
        </RechartsAreaChart>
      </ChartContainer>
    </div>
  )
}

