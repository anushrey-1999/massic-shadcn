"use client"

import { useMemo } from "react"
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
  impressionsNorm: { label: "Impressions", color: "#9CA3AF" },
  clicksNorm: { label: "Clicks", color: "#2563EB" },
  goalsNorm: { label: "Goals", color: "#059669" },
}

export function MiniAreaChart({ graph }: { graph?: PreviewGraph }) {
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
      if (!value) return 0
      return (Math.log10(value + 1) / logMax) * 100
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
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
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
                    ? "Impressions"
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
            type="monotone"
            dataKey="impressionsNorm"
            stroke="var(--color-impressionsNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="goalsNorm"
            stroke="var(--color-goalsNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="clicksNorm"
            stroke="var(--color-clicksNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}