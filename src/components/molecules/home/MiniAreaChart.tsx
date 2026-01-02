"use client"

import { useMemo, useId } from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

export type PreviewGraphRow = {
  keys?: [string]
  clicks?: string | number
  impressions?: string | number
  goal?: string | number
}

export type PreviewGraph = {
  rows?: PreviewGraphRow[]
}

const miniChartConfig: ChartConfig = {
  impressionsNorm: { label: "Imp.", color: "#4B5563" },
  clicksNorm: { label: "Clicks", color: "#2563EB" },
  goalsNorm: { label: "Goals", color: "#059669" },
}

function formatTooltipDate(input: unknown) {
  const raw = typeof input === "string" ? input : ""
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return raw

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)
  if (!Number.isFinite(date.getTime())) return raw

  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
  return `${day}, ${month}, ${year}`
}

export function MiniAreaChart({ graph }: { graph?: PreviewGraph }) {
  const impressionsGradientId = useId()
  const clicksGradientId = useId()
  const goalsGradientId = useId()

  const data = useMemo(() => {
    const rows = graph?.rows || []
    return rows.map((row) => ({
      date: row.keys?.[0] || "",
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      goals: Number(row.goal ?? 0),
    }))
  }, [graph?.rows])

  const normalizedData = useMemo(() => {
    if (data.length === 0) return []

    const maxImpressions = Math.max(...data.map((d) => d.impressions || 0))
    const maxClicks = Math.max(...data.map((d) => d.clicks || 0))
    const maxGoals = Math.max(...data.map((d) => d.goals || 0))
    const globalMax = Math.max(maxImpressions, maxClicks, maxGoals)

    if (globalMax === 0) {
      return data.map((point) => ({
        ...point,
        impressionsNorm: 0,
        clicksNorm: 0,
        goalsNorm: 0,
      }))
    }

    const logMax = Math.log10(globalMax + 1)
    const scaleValue = (value: number): number => {
      if (!value) return 2
      return Math.max(2, (Math.log10(value + 1) / logMax) * 100)
    }

    return data.map((point) => ({
      ...point,
      impressionsNorm: scaleValue(point.impressions),
      clicksNorm: scaleValue(point.clicks),
      goalsNorm: scaleValue(point.goals),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-[115px] flex items-center justify-center">
        <Skeleton className="h-[90px] w-full" />
      </div>
    )
  }

  return (
    <div className="h-[115px] w-full">
      <ChartContainer config={miniChartConfig} className="h-full w-full">
        <AreaChart data={normalizedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={impressionsGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4B5563" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#4B5563" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={clicksGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={goalsGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatTooltipDate(value)}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                formatter={(value: unknown, name: unknown, _item: unknown, _index?: number, payload?: unknown) => {
                  void value
                  void _item
                  void _index
                  const seriesKey = String(name || "")
                  const rawKey = seriesKey.endsWith("Norm") ? seriesKey.slice(0, -4) : seriesKey
                  const payloadObj = payload as Record<string, unknown> | undefined
                  const rawValue = payloadObj ? payloadObj[rawKey] : undefined
                  const displayValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0)
                  const label = seriesKey.startsWith("impressions")
                    ? "Impr."
                    : seriesKey.startsWith("clicks")
                      ? "Clicks"
                      : "Goals"

                  return (
                    <>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {Number.isFinite(displayValue) ? displayValue.toLocaleString() : "0"}
                      </span>
                    </>
                  )
                }}
              />
            }
          />
          <Area
            type="linear"
            dataKey="impressionsNorm"
            stroke="var(--color-impressionsNorm)"
            fill={`url(#${impressionsGradientId})`}
            strokeWidth={1}
            dot={false}
          />
          <Area
            type="linear"
            dataKey="goalsNorm"
            stroke="var(--color-goalsNorm)"
            fill={`url(#${goalsGradientId})`}
            strokeWidth={1}
            dot={false}
          />
          <Area
            type="linear"
            dataKey="clicksNorm"
            stroke="var(--color-clicksNorm)"
            fill={`url(#${clicksGradientId})`}
            strokeWidth={1}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}