"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface ChartData {
  name: string
  [key: string]: string | number
}

interface VerticalBarChartsProps {
  chartData: ChartData[]
  chartConfig: ChartConfig
  stacked?: boolean
  barSize?: number
  maxValue?: number
  tickInterval?: number // Interval between ticks (e.g., 500)
  tickCount?: number // Number of ticks desired (including 0)
}

export function VerticalBarCharts({
  chartData,
  chartConfig,
  stacked = true,
  barSize = 40,
  maxValue,
  tickInterval,
  tickCount,
}: VerticalBarChartsProps) {
  // Extract data keys (excluding 'name')
  const dataKeys = useMemo(() => {
    if (chartData.length === 0) return []
    const firstItem = chartData[0]
    return Object.keys(firstItem).filter((key) => key !== "name")
  }, [chartData])

  // Calculate max value from data if not provided
  const calculatedMaxValue = useMemo(() => {
    if (maxValue !== undefined) return maxValue
    if (chartData.length === 0) return 1000

    let max = 0

    if (stacked) {
      // For stacked, sum all values in each row and find the maximum
      chartData.forEach((item) => {
        const rowSum = dataKeys.reduce((sum, key) => {
          return sum + (Number(item[key]) || 0)
        }, 0)
        max = Math.max(max, rowSum)
      })
    } else {
      // For grouped, find the max individual value across all keys
      chartData.forEach((item) => {
        dataKeys.forEach((key) => {
          const value = Number(item[key]) || 0
          max = Math.max(max, value)
        })
      })
    }

    // Round up to nearest nice number
    const rounded = Math.ceil(max / 1000) * 1000
    return rounded || 1000
  }, [chartData, dataKeys, stacked, maxValue])

  // Calculate dynamic tick interval - use props if provided, otherwise use "nice number" algorithm
  const { ticks, maxDomainValue } = useMemo(() => {
    const max = calculatedMaxValue
    let interval: number
    let tickArray: number[] = []
    let domainMax = max

    // If both tickInterval and tickCount are provided, generate exactly tickCount ticks
    if (tickInterval !== undefined && tickCount !== undefined) {
      interval = tickInterval
      // Generate exactly tickCount ticks starting from 0
      for (let i = 0; i < tickCount; i++) {
        tickArray.push(i * interval)
      }
      // Update domain to match the last tick
      domainMax = (tickCount - 1) * interval
    }
    // If only tickInterval is provided, generate ticks until max value
    else if (tickInterval !== undefined) {
      interval = tickInterval
      // Generate ticks based on the interval
      for (let i = 0; i * interval <= max; i++) {
        const tick = i * interval
        if (tick <= max) {
          tickArray.push(tick)
        }
      }
      // Ensure max value is included if not already
      if (tickArray[tickArray.length - 1] !== max) {
        tickArray.push(max)
      }
    }
    // If only tickCount is provided, calculate interval
    else if (tickCount !== undefined) {
      interval = max / (tickCount - 1)
      // Round to a nice number
      const magnitude = Math.pow(10, Math.floor(Math.log10(interval)))
      const normalized = interval / magnitude
      let niceNormalized: number
      if (normalized <= 1) {
        niceNormalized = 1
      } else if (normalized <= 2) {
        niceNormalized = 2
      } else if (normalized <= 5) {
        niceNormalized = 5
      } else {
        niceNormalized = 10
      }
      interval = niceNormalized * magnitude

      // Generate ticks based on calculated interval
      for (let i = 0; i * interval <= max; i++) {
        const tick = i * interval
        if (tick <= max) {
          tickArray.push(tick)
        }
      }
      // Ensure max value is included if not already
      if (tickArray[tickArray.length - 1] !== max) {
        tickArray.push(max)
      }
    }
    // Otherwise, use the "nice number" algorithm
    else {
      const desiredTicks = 6 // Target number of ticks (including 0)
      const rawInterval = max / (desiredTicks - 1)
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
      const normalized = rawInterval / magnitude

      let niceNormalized: number
      if (normalized <= 1) {
        niceNormalized = 1
      } else if (normalized <= 2) {
        niceNormalized = 2
      } else if (normalized <= 5) {
        niceNormalized = 5
      } else {
        niceNormalized = 10
      }

      interval = niceNormalized * magnitude

      // Generate ticks array
      for (let i = 0; i * interval <= max; i++) {
        const tick = i * interval
        if (tick <= max) {
          tickArray.push(tick)
        }
      }

      // Ensure max value is included if not already
      if (tickArray[tickArray.length - 1] !== max) {
        tickArray.push(max)
      }
    }

    return { ticks: tickArray, maxDomainValue: domainMax }
  }, [calculatedMaxValue, tickInterval, tickCount])

  // Generate Bar components dynamically
  const bars = useMemo(() => {
    return dataKeys.map((key, index) => {
      const isLast = index === dataKeys.length - 1
      const config = chartConfig[key as keyof typeof chartConfig]
      const color = config?.color || "hsl(var(--chart-1))"

      return (
        <Bar
          key={key}
          dataKey={key}
          stackId={stacked ? "a" : undefined}
          fill={color}
          radius={stacked && isLast ? [0, 4, 4, 0] : stacked ? [0, 0, 0, 0] : [0, 4, 4, 0]}
          barSize={barSize}
        />
      )
    })
  }, [dataKeys, chartConfig, stacked, barSize])

  if (chartData.length === 0 || dataKeys.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="h-[500px] w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            top: 20,
            right: 30,
            left: 150,
            bottom: 5,
          }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            domain={[0, maxDomainValue]}
            ticks={ticks}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            width={140}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {bars}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

