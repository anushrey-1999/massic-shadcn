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

export type HomeTimePeriodValue =
  | "7 days"
  | "14 days"
  | "28 days"
  | "3 months"
  | "6 months"
  | "12 months"

const miniChartConfig: ChartConfig = {
  impressions: { label: "Imp.", color: "#8662D0" },
  clicks: { label: "Clicks", color: "#2563EB" },
  goals: { label: "Goals", color: "var(--general-unofficial-foreground-alt)" },
}

function formatTooltipDate(input: unknown) {
  const raw = typeof input === "string" ? input : ""
  const monthMatch = raw.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const monthIndex = Number(monthMatch[2]) - 1
    const date = new Date(Date.UTC(year, monthIndex, 1))
    if (!Number.isFinite(date.getTime())) return raw
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
    return `${month} ${year}`
  }
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return raw

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)
  if (!Number.isFinite(date.getTime())) return raw

  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
  return `${day} ${month} ${year}`
}

function normalizeDateKey(raw: string): string | null {
  const trimmed = raw.trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const monthMatch = trimmed.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) return `${monthMatch[1]}-${monthMatch[2]}-01`

  const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (slashMatch) return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`

  return null
}

function dateFromKey(key: string): Date | null {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month, day))
  return Number.isFinite(date.getTime()) ? date : null
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonthsUtc(date: Date, months: number): Date {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

function parseMetricValue(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/,/g, "").trim()
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function getPeriodStartDate(period: HomeTimePeriodValue, endDate: Date): Date {
  switch (period) {
    case "7 days":
      return addDaysUtc(endDate, -6)
    case "14 days":
      return addDaysUtc(endDate, -13)
    case "28 days":
      return addDaysUtc(endDate, -27)
    case "3 months":
      return addMonthsUtc(endDate, -3)
    case "6 months":
      return addMonthsUtc(endDate, -6)
    case "12 months":
      return addMonthsUtc(endDate, -12)
    default:
      return addMonthsUtc(endDate, -3)
  }
}

export function MiniAreaChart({
  graph,
  period = "3 months",
}: {
  graph?: PreviewGraph
  period?: HomeTimePeriodValue
}) {
  const impressionsGradientId = useId()
  const clicksGradientId = useId()
  const goalsGradientId = useId()

  const data = useMemo(() => {
    const rows = graph?.rows || []
    const parsed = rows
      .map((row) => {
        const rawKey = row.keys?.[0] || ""
        const dateKey = normalizeDateKey(rawKey)
        return {
          dateKey,
          impressions: parseMetricValue(row.impressions),
          clicks: parseMetricValue(row.clicks),
          goals: parseMetricValue(row.goal),
        }
      })
      .filter((row): row is { dateKey: string; impressions: number; clicks: number; goals: number } =>
        Boolean(row.dateKey)
      )

    if (parsed.length === 0) return []

    const availableDates = parsed
      .map((row) => dateFromKey(row.dateKey))
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())

    const now = new Date()
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const lastAvailableDate = availableDates[availableDates.length - 1]
    const endDate = lastAvailableDate ?? todayUtc
    const startDate = getPeriodStartDate(period, endDate)
    const dataByDate = new Map(parsed.map((row) => [row.dateKey, row]))

    const filled: Array<{
      date: string
      impressions: number
      clicks: number
      goals: number
    }> = []

    for (let cursor = startDate; cursor <= endDate; cursor = addDaysUtc(cursor, 1)) {
      const key = formatDateKey(cursor)
      const existing = dataByDate.get(key)
      filled.push({
        date: key,
        impressions: existing?.impressions ?? 0,
        clicks: existing?.clicks ?? 0,
        goals: existing?.goals ?? 0,
      })
    }

    return filled
  }, [graph?.rows, period])

  const normalizedData = useMemo(() => {
    if (data.length === 0) return []
    const impressionsValues = data.map((d) => d.impressions)
    const clicksValues = data.map((d) => d.clicks)
    const goalsValues = data.map((d) => d.goals)
    const minImpressions = Math.min(...impressionsValues)
    const maxImpressions = Math.max(...impressionsValues)
    const minClicks = Math.min(...clicksValues)
    const maxClicks = Math.max(...clicksValues)
    const minGoals = Math.min(...goalsValues)
    const maxGoals = Math.max(...goalsValues)

    const normalizeToZeroHundred = (value: number, min: number, max: number): number => {
      const v = Number(value) || 0
      if (v === 0) return 0
      if (max === min) return 50
      const pad = (max - min) * 0.05 || 1
      const lo = Math.max(0, min - pad)
      const hi = max + pad
      const normalized = (v - lo) / (hi - lo)
      return Math.max(0, Math.min(100, normalized * 100))
    }

    const goalsMaxNorm = 78
    return data.map((point) => {
      const goalsNormRaw = normalizeToZeroHundred(point.goals, minGoals, maxGoals)
      return {
        ...point,
        impressionsNorm: normalizeToZeroHundred(point.impressions, minImpressions, maxImpressions),
        clicksNorm: normalizeToZeroHundred(point.clicks, minClicks, maxClicks),
        goalsNorm: (goalsNormRaw / 100) * goalsMaxNorm,
      }
    })
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <Skeleton className="h-[60px] w-full" />
      </div>
    )
  }

  const chartData = normalizedData.length > 0 ? normalizedData : data

  return (
    <div className="h-[80px] w-full self-end">
      <ChartContainer config={miniChartConfig} className="h-full w-full">
        <AreaChart data={chartData} margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={impressionsGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8662D0" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#8662D0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={clicksGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={goalsGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--general-unofficial-foreground-alt)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--general-unofficial-foreground-alt)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            hide
            height={0}
            width={0}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            hide
            width={0}
            domain={normalizedData.length > 0 ? [0, 100] : undefined}
            {...(normalizedData.length > 0
              ? {}
              : {
                  domain: ([dataMin, dataMax]: [number, number]) => {
                    const pad = (dataMax - dataMin) * 0.05 || 1
                    const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad)
                    return [min, dataMax + pad]
                  },
                })}
          />
          {normalizedData.length === 0 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              hide
              width={0}
              domain={([dataMin, dataMax]: [number, number]) => {
                const pad = (dataMax - dataMin) * 0.05 || 1
                const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad)
                return [min, dataMax + pad]
              }}
            />
          )}
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
                  const payloadObj = payload as Record<string, unknown> | undefined
                  const rawKey =
                    seriesKey === "impressionsNorm"
                      ? "impressions"
                      : seriesKey === "clicksNorm"
                        ? "clicks"
                        : seriesKey === "goalsNorm"
                          ? "goals"
                          : seriesKey
                  const rawValue = payloadObj ? payloadObj[rawKey] : undefined
                  const displayValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0)
                  const label =
                    rawKey === "impressions" ? "Impr." : rawKey === "clicks" ? "Clicks" : "Goals"

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
            dataKey={normalizedData.length > 0 ? "impressionsNorm" : "impressions"}
            yAxisId="left"
            stroke="var(--color-impressions)"
            fill={`url(#${impressionsGradientId})`}
            strokeWidth={1}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey={normalizedData.length > 0 ? "clicksNorm" : "clicks"}
            yAxisId="left"
            stroke="var(--color-clicks)"
            fill={`url(#${clicksGradientId})`}
            strokeWidth={1}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey={normalizedData.length > 0 ? "goalsNorm" : "goals"}
            yAxisId="left"
            stroke="var(--color-goals)"
            fill={`url(#${goalsGradientId})`}
            strokeWidth={1}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
