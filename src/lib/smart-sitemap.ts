import { addDays, format, parseISO } from "date-fns"
import { getBucketColor } from "@/lib/gsc-index-bucket"
import { CHART_SERIES_COLORS } from "@/utils/analytics-metrics"
import type { Ga4Metrics, GscMetrics, SeriesPoint, SmartSitemapStatus } from "@/hooks/use-smart-sitemap"

export const EMPTY_VALUE = "–"

export const STATUS_LABELS: Record<SmartSitemapStatus, string> = {
  indexed: "Indexed",
  crawled_not_indexed: "Crawled, not indexed",
  discovered_not_indexed: "Discovered, not indexed",
  excluded: "Excluded",
  error: "Crawl error",
  other: "Other",
  unknown: "Unknown",
  pending: "Pending check",
  mixed: "Mixed",
}

/** Order of the overview status bar: healthy first, then problems, then missing knowledge. */
export const STATUS_ORDER: SmartSitemapStatus[] = [
  "indexed",
  "crawled_not_indexed",
  "discovered_not_indexed",
  "mixed",
  "error",
  "excluded",
  "other",
  "unknown",
  "pending",
]

export function statusColor(status: string | null | undefined): string {
  if (status === "pending") return "var(--general-border-three)"
  if (status === "mixed") return "#f59e0b"
  return getBucketColor(status)
}

export function statusLabel(status: string | null | undefined): string {
  return status && status in STATUS_LABELS ? STATUS_LABELS[status as SmartSitemapStatus] : "Unknown"
}

const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const integerFormatter = new Intl.NumberFormat("en-US")
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return EMPTY_VALUE
  return value >= 10000 ? compactFormatter.format(value) : integerFormatter.format(value)
}

export function formatInteger(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : integerFormatter.format(value)
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : `${(value * 100).toFixed(1)}%`
}

export function formatPosition(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : value.toFixed(1)
}

export function formatCurrency(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : currencyFormatter.format(value)
}

export function formatDay(value: string | null | undefined, pattern = "MMM d, yyyy"): string {
  if (!value) return EMPTY_VALUE
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? EMPTY_VALUE : format(parsed, pattern)
}

export type MetricFormat = "count" | "percent" | "position" | "currency"

export function formatMetric(kind: MetricFormat, value: number | null | undefined): string {
  if (kind === "percent") return formatPercent(value)
  if (kind === "position") return formatPosition(value)
  if (kind === "currency") return formatCurrency(value)
  return formatCompact(value)
}

/** Props for the dashboard's `StatsBadge`: the sign drives green or red. */
export interface MetricChangeBadge {
  value: number
  unit: "%" | "pp"
  label?: string
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Counts compare by percent and rates by percentage points. Position compares by
 * places with lower being better, so an improvement is positive. Undefined means
 * there is no comparable previous value.
 */
export function metricChangeBadge(
  kind: MetricFormat,
  current: number | null | undefined,
  previous: number | null | undefined
): MetricChangeBadge | undefined {
  if (current == null || previous == null) return undefined
  if (kind === "position") {
    const improvement = roundOne(previous - current)
    if (improvement === 0) return { value: 0, unit: "%", label: "0.0" }
    return { value: improvement, unit: "%", label: `${improvement > 0 ? "↑" : "↓"}${Math.abs(improvement).toFixed(1)}` }
  }
  if (kind === "percent") return { value: roundOne((current - previous) * 100), unit: "pp" }
  if (previous === 0) return undefined
  return { value: roundOne(((current - previous) / previous) * 100), unit: "%" }
}

export type ChartMetricKey = Exclude<keyof SeriesPoint, "date">
export type DetailMetricKey = ChartMetricKey | "engagedSessions" | "engagementRate" | "revenue"

export interface DetailMetric {
  key: DetailMetricKey
  label: string
  source: "gsc" | "ga4"
  format: MetricFormat
  /** Present when the daily series carries this metric. */
  color?: string
}

export const DETAIL_METRICS: Record<DetailMetricKey, DetailMetric> = {
  clicks: { key: "clicks", label: "Clicks", source: "gsc", format: "count", color: CHART_SERIES_COLORS.clicks },
  impressions: { key: "impressions", label: "Impressions", source: "gsc", format: "count", color: CHART_SERIES_COLORS.impressions },
  ctr: { key: "ctr", label: "CTR", source: "gsc", format: "percent", color: CHART_SERIES_COLORS.clicks },
  position: { key: "position", label: "Avg. position", source: "gsc", format: "position", color: CHART_SERIES_COLORS.impressions },
  sessions: { key: "sessions", label: "Sessions", source: "ga4", format: "count", color: CHART_SERIES_COLORS.sessions },
  keyEvents: { key: "keyEvents", label: "Key events", source: "ga4", format: "count", color: CHART_SERIES_COLORS.goals },
  engagedSessions: { key: "engagedSessions", label: "Engaged sessions", source: "ga4", format: "count" },
  engagementRate: { key: "engagementRate", label: "Engagement rate", source: "ga4", format: "percent" },
  revenue: { key: "revenue", label: "Revenue", source: "ga4", format: "currency" },
}

/** Lines on the trend chart, in the dashboard's legend order. */
export const CHART_LINE_KEYS = ["impressions", "clicks", "sessions", "keyEvents"] as const
export type ChartLineKey = (typeof CHART_LINE_KEYS)[number]

export function metricValue(
  key: DetailMetricKey,
  gsc: GscMetrics | null | undefined,
  ga4: Ga4Metrics | null | undefined
): number | null {
  switch (key) {
    case "clicks":
    case "impressions":
    case "ctr":
    case "position":
      return gsc ? gsc[key] : null
    case "sessions":
    case "keyEvents":
    case "engagedSessions":
    case "engagementRate":
    case "revenue":
      return ga4 ? ga4[key] : null
  }
}

/**
 * One point per day of the range. Sources omit days without activity, so counts
 * become zero up to each source's last observed day; rates stay null (no denominator).
 */
export function fillDailySeries(
  series: SeriesPoint[],
  range: { from: string; to: string },
  dataThrough: { gsc: string | null; ga4: string | null }
): SeriesPoint[] {
  const byDate = new Map(series.map((point) => [point.date, point]))
  const days: SeriesPoint[] = []
  const end = parseISO(range.to)
  for (let day = parseISO(range.from); day <= end; day = addDays(day, 1)) {
    const date = format(day, "yyyy-MM-dd")
    const point = byDate.get(date)
    const gscSeen = dataThrough.gsc != null && date <= dataThrough.gsc
    const ga4Seen = dataThrough.ga4 != null && date <= dataThrough.ga4
    days.push({
      date,
      clicks: point?.clicks ?? (gscSeen ? 0 : null),
      impressions: point?.impressions ?? (gscSeen ? 0 : null),
      ctr: point?.ctr ?? null,
      position: point?.position ?? null,
      sessions: point?.sessions ?? (ga4Seen ? 0 : null),
      keyEvents: point?.keyEvents ?? (ga4Seen ? 0 : null),
    })
  }
  return days
}

export function siteHost(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    return new URL(website.includes("://") ? website : `https://${website}`).host.replace(/^www\./, "")
  } catch {
    return null
  }
}

export function pageUrl(website: string | null | undefined, path: string): string | null {
  if (!website) return null
  try {
    return new URL(path, website.includes("://") ? website : `https://${website}`).toString()
  } catch {
    return null
  }
}
