"use client"

import { useMemo, useState, type ReactNode } from "react"
import { BarChart3, Eye, MousePointerClick, Target } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { AnalyticsChartTooltip } from "@/components/molecules/analytics/AnalyticsChartTooltip"
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { ANALYTICS_CHART_STYLE } from "@/utils/analytics-metrics"
import {
  CHART_LINE_KEYS,
  DETAIL_METRICS,
  formatDay,
  formatInteger,
  formatMetric,
  metricChangeBadge,
  type ChartLineKey,
} from "@/lib/smart-sitemap"
import type { SeriesPoint } from "@/hooks/use-smart-sitemap"

const LINE_ICONS: Record<ChartLineKey, ReactNode> = {
  impressions: <Eye className="h-6 w-6" />,
  clicks: <MousePointerClick className="h-6 w-6 rotate-90" />,
  sessions: <BarChart3 className="h-6 w-6" />,
  keyEvents: <Target className="h-6 w-6" />,
}

type ChartPoint = SeriesPoint & Partial<Record<`${ChartLineKey}Norm`, number | null>>

interface SmartSitemapTrendPanelProps {
  series: SeriesPoint[]
  totals: Record<ChartLineKey, number | null>
  previousTotals: Record<ChartLineKey, number | null>
}

/** Scales each line to 0-100 so lines of different magnitude share one axis, as on the dashboard chart. */
function normalize(series: SeriesPoint[], keys: readonly ChartLineKey[]): ChartPoint[] {
  const bounds = Object.fromEntries(
    keys.map((key) => {
      const values = series.map((point) => point[key]).filter((value): value is number => value != null)
      return [key, { min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0 }]
    })
  ) as Record<ChartLineKey, { min: number; max: number }>
  return series.map((point) => {
    const scaled: ChartPoint = { ...point }
    for (const key of keys) {
      const value = point[key]
      const { min, max } = bounds[key]
      if (value == null) scaled[`${key}Norm`] = null
      else if (value === 0) scaled[`${key}Norm`] = 0
      else if (max === min) scaled[`${key}Norm`] = 50
      else {
        const pad = (max - min) * 0.05 || 1
        const lo = Math.max(0, min - pad)
        scaled[`${key}Norm`] = Math.max(0, Math.min(100, ((value - lo) / (max + pad - lo)) * 100))
      }
    }
    return scaled
  })
}

function tickInterval(length: number): number {
  if (length <= 7) return 0
  if (length <= 14) return 1
  if (length <= 30) return Math.floor(length / 8)
  if (length <= 90) return Math.floor(length / 10)
  return Math.floor(length / 12)
}

export function SmartSitemapTrendPanel({ series, totals, previousTotals }: SmartSitemapTrendPanelProps) {
  const available = useMemo(
    () => CHART_LINE_KEYS.filter((key) => series.some((point) => point[key] != null)),
    [series]
  )
  const [hidden, setHidden] = useState<ChartLineKey[]>([])
  const visible = available.filter((key) => !hidden.includes(key))
  const normalized = visible.length > 1
  const data = useMemo(() => normalize(series, CHART_LINE_KEYS), [series])
  const config: ChartConfig = Object.fromEntries(
    CHART_LINE_KEYS.map((key) => [key, { label: DETAIL_METRICS[key].label, color: DETAIL_METRICS[key].color }])
  )

  const legendItems = CHART_LINE_KEYS.map((key) => {
    const badge = metricChangeBadge("count", totals[key], previousTotals[key])
    return {
      key,
      label: DETAIL_METRICS[key].label,
      icon: LINE_ICONS[key],
      color: DETAIL_METRICS[key].color,
      value: formatMetric("count", totals[key]),
      change: badge?.value ?? 0,
      changeLabel: badge ? badge.label : "–",
      checked: visible.includes(key),
      disabled: !available.includes(key),
    }
  })

  const toggle = (key: string, checked: boolean) => {
    const line = key as ChartLineKey
    if (!checked && visible.length <= 1) return
    setHidden((current) => (checked ? current.filter((value) => value !== line) : [...current, line]))
  }

  return (
    <div className="rounded-lg border border-general-border bg-white p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <ChartLegend variant="box" items={legendItems} onToggle={toggle} />
      </div>
      <div className="relative h-[242px]">
        {available.length ? (
          <ChartContainer config={config} className={ANALYTICS_CHART_STYLE.containerClassName}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={ANALYTICS_CHART_STYLE.margin}>
                <defs>
                  {CHART_LINE_KEYS.map((key) => (
                    <linearGradient key={key} id={`smart-sitemap-fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DETAIL_METRICS[key].color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={DETAIL_METRICS[key].color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray={ANALYTICS_CHART_STYLE.gridDasharray}
                  stroke={ANALYTICS_CHART_STYLE.gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDay(value, "MMM d")}
                  tickLine={false}
                  axisLine={false}
                  tick={ANALYTICS_CHART_STYLE.tick}
                  tickMargin={ANALYTICS_CHART_STYLE.tickMargin}
                  interval={tickInterval(data.length)}
                />
                <YAxis
                  yAxisId="left"
                  hide
                  width={0}
                  domain={
                    normalized
                      ? [0, 100]
                      : ([dataMin, dataMax]: readonly number[]) => {
                          const pad = (dataMax - dataMin) * 0.05 || 1
                          return [Math.max(0, dataMin - pad), dataMax + pad]
                        }
                  }
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const point = payload[0]?.payload as ChartPoint | undefined
                    if (!point) return null
                    return (
                      <AnalyticsChartTooltip label={formatDay(point.date, "MMM d, yyyy")}>
                        {visible
                          .filter((key) => point[key] != null)
                          .map((key) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                              <p className="flex items-center gap-2" style={{ color: DETAIL_METRICS[key].color }}>
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DETAIL_METRICS[key].color }} />
                                {DETAIL_METRICS[key].label}
                              </p>
                              <span className="font-medium text-general-foreground">{formatInteger(point[key])}</span>
                            </div>
                          ))}
                      </AnalyticsChartTooltip>
                    )
                  }}
                />
                {visible.map((key) => (
                  <Area
                    key={key}
                    type="linear"
                    dataKey={normalized ? `${key}Norm` : key}
                    yAxisId="left"
                    stroke={DETAIL_METRICS[key].color}
                    fill={`url(#smart-sitemap-fill-${key})`}
                    strokeWidth={ANALYTICS_CHART_STYLE.strokeWidth}
                    name={DETAIL_METRICS[key].label}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No Search Console or Google Analytics data for this page in this period.
          </div>
        )}
      </div>
    </div>
  )
}
