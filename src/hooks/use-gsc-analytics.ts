import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback } from "react"
import { calculateTrend, sumMetrics } from "@/utils/gsc-deepdive-utils"
import type { DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters"

export const TIME_PERIODS = [
  { id: 1, label: "7 days", value: "7 days" },
  { id: 2, label: "14 days", value: "14 days" },
  { id: 3, label: "28 days", value: "28 days" },
  { id: 4, label: "3 months", value: "3 months" },
  { id: 5, label: "6 months", value: "6 months" },
  { id: 6, label: "12 months", value: "12 months" },
] as const

export type TimePeriodValue = (typeof TIME_PERIODS)[number]["value"]
export type TableFilterType = "popular" | "growing" | "decaying"
export type SortColumn = "impressions" | "clicks" | "sessions" | "goals"
export type SortDirection = "asc" | "desc"

interface TrendDetail {
  Total: string
  Diff: string
  Trend: "up" | "down"
}

export interface GSCTrendData {
  Clk: TrendDetail
  Imp: TrendDetail
  sessions?: TrendDetail
  goals?: TrendDetail
}

export interface GSCChartDataPoint {
  date: string
  dateKey?: string
  impressions: number
  clicks: number
  sessions?: number
  goals?: number
}

export interface GSCFunnelData {
  impressions: { Value: number; Percentage: string }
  clicks: { Value: number; Percentage: string }
  cnv: { Value: number; Percentage?: string }
}

export interface ChartLegendItem {
  key: string
  icon: React.ReactNode
  value: string
  change: number
  checked?: boolean
}

export interface FunnelChartItem {
  label: string
  value: number
  percentage?: string
}

interface MetricCell {
  value: string | number
  change?: number
}

export interface GSCTableDataFormatted {
  key: string
  impressions: MetricCell
  clicks: MetricCell
  sessions?: MetricCell
  goals?: MetricCell
}

interface V2Ranges {
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
}

interface V2Response<T = any> {
  success: boolean
  data: {
    ranges: V2Ranges
    current: T[]
    previous: T[]
  }
}

interface GscMetricRow {
  keys?: string[]
  group?: string
  displayName?: string
  impressions?: number
  clicks?: number
}

interface Ga4MetricRow {
  keys?: string[]
  sessions?: number
  keyEvents?: number
}

interface TimescaleOverviewResponse {
  gscDate: V2Response<GscMetricRow>
  gscContentGroups: V2Response<GscMetricRow>
  gscTopPages: V2Response<GscMetricRow>
  gscTopQueries: V2Response<GscMetricRow>
  ga4Date: V2Response<Ga4MetricRow> | null
  ga4ContentGroups: V2Response<Ga4MetricRow> | null
  ga4TopPages: V2Response<Ga4MetricRow> | null
}

interface MergedMetric {
  current: number
  previous: number
  available: boolean
  change?: number
}

interface MergedRow {
  key: string
  impressions: MergedMetric
  clicks: MergedMetric
  sessions: MergedMetric
  goals: MergedMetric
}

interface AggregatedGscRow {
  key: string
  impressions: number
  clicks: number
  bestScore: number
}

interface AggregatedGa4Row {
  key: string
  sessions: number
  keyEvents: number
  bestScore: number
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: number | string): string {
  if (typeof value === "string") {
    if (/[KMkm]$/.test(value.trim())) {
      return value
    }

    const cleanValue = value.replace(/,/g, "")
    const num = parseFloat(cleanValue)
    if (isNaN(num)) return "0"
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  if (!Number.isFinite(value)) return "0"
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatDate(dateString: string): string {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

function normalizeDateKey(value: string): string | null {
  const trimmed = String(value || "").trim()
  if (!trimmed) return null

  const dashed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`

  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`

  return null
}

function normalizeContentGroupKey(value: string): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null

  let normalized = raw
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`
  }

  normalized = normalized.replace(/\/+$/g, "")
  normalized = normalized.replace(/\/+/g, "/")
  if (!normalized) return "/"
  return normalized.toLowerCase()
}

function normalizePageKey(value: string): string | null {
  let raw = String(value || "").trim()
  if (!raw) return null

  try {
    if (raw.startsWith("sc-domain:")) {
      raw = raw.replace("sc-domain:", "")
      raw = `https://${raw}`
    }

    if (raw.startsWith("/")) {
      const pathOnly = raw.split("#")[0]
      const [pathname, query = ""] = pathOnly.split("?")
      const fixedPath = pathname.replace(/\/+/g, "/") || "/"
      return `${fixedPath}${query ? `?${query}` : ""}`.toLowerCase()
    }

    if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
      raw = `https://${raw}`
    }

    const parsed = new URL(raw)
    const pathname = (parsed.pathname || "/").replace(/\/+/g, "/")
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "")
    return `${parsed.host.toLowerCase()}${normalizedPath}${parsed.search || ""}`
  } catch {
    return raw.toLowerCase()
  }
}

function getSignedChange(current: number, previous: number): number {
  const trend = calculateTrend(current, previous)
  if (trend.isInfinity) {
    return current > 0 ? Infinity : 0
  }

  if (trend.trend === "down") return -trend.value
  if (trend.trend === "up") return trend.value
  return 0
}

function toTrendDetail(current: number, previous: number): TrendDetail {
  const signedChange = getSignedChange(current, previous)
  const absValue = Number.isFinite(signedChange) ? Math.abs(signedChange) : "∞"

  return {
    Total: formatNumber(current),
    Diff: `${absValue}%`,
    Trend: signedChange < 0 ? "down" : "up",
  }
}

function percentage(part: number, whole: number): string {
  if (whole <= 0) return "0%"
  return `${((part / whole) * 100).toFixed(1)}%`
}

function toMetricCell(metric: MergedMetric): MetricCell {
  if (!metric.available) {
    return { value: "—" }
  }

  return {
    value: formatNumber(metric.current),
    change: metric.change,
  }
}

function includeByFilter(row: MergedRow, filter: TableFilterType, includeGa4: boolean): boolean {
  if (filter === "popular") return true

  const changes = [
    row.impressions.change,
    row.clicks.change,
    ...(includeGa4 ? [row.sessions.change, row.goals.change] : []),
  ].filter((value): value is number => value !== undefined)

  if (filter === "growing") return changes.some((value) => value > 0)
  return changes.some((value) => value < 0)
}

function compareBySort(a: MergedRow, b: MergedRow, sort: { column: SortColumn; direction: SortDirection }): number {
  const pick = (row: MergedRow): number | null => {
    const metric = row[sort.column]
    if (!metric?.available) return null
    return metric.current
  }

  const aVal = pick(a)
  const bVal = pick(b)

  if (aVal === null && bVal === null) return 0
  if (aVal === null) return 1
  if (bVal === null) return -1

  return sort.direction === "desc" ? bVal - aVal : aVal - bVal
}

function buildMap<T>(rows: T[], getKey: (row: T) => string | null, getDisplay: (row: T) => string): Map<string, { key: string; row: T }> {
  const map = new Map<string, { key: string; row: T }>()

  for (const row of rows || []) {
    const normalizedKey = getKey(row)
    if (!normalizedKey) continue

    const displayKey = getDisplay(row)
    const existing = map.get(normalizedKey)

    if (!existing) {
      map.set(normalizedKey, { key: displayKey, row })
      continue
    }

    // Prefer non-empty and longer display key to preserve readable URLs/paths.
    if ((displayKey || "").length > (existing.key || "").length) {
      existing.key = displayKey
    }
  }

  return map
}

function aggregateGscRows(
  rows: GscMetricRow[],
  keyNormalizer: (value: string) => string | null,
  displayResolver: (row: GscMetricRow) => string
): Map<string, AggregatedGscRow> {
  const map = new Map<string, AggregatedGscRow>()

  for (const row of rows || []) {
    const displayKey = displayResolver(row)
    const normalizedKey = keyNormalizer(displayKey)
    if (!normalizedKey) continue

    const impressions = asNumber(row.impressions)
    const clicks = asNumber(row.clicks)
    const score = impressions + clicks
    const existing = map.get(normalizedKey)

    if (!existing) {
      map.set(normalizedKey, {
        key: displayKey,
        impressions,
        clicks,
        bestScore: score,
      })
      continue
    }

    existing.impressions += impressions
    existing.clicks += clicks

    // Keep representative key from the row with stronger contribution.
    if (score > existing.bestScore && displayKey) {
      existing.key = displayKey
      existing.bestScore = score
    }
  }

  return map
}

function aggregateGa4Rows(
  rows: Ga4MetricRow[],
  keyNormalizer: (value: string) => string | null,
  displayResolver: (row: Ga4MetricRow) => string
): Map<string, AggregatedGa4Row> {
  const map = new Map<string, AggregatedGa4Row>()

  for (const row of rows || []) {
    const displayKey = displayResolver(row)
    const normalizedKey = keyNormalizer(displayKey)
    if (!normalizedKey) continue

    const sessions = asNumber(row.sessions)
    const keyEvents = asNumber(row.keyEvents)
    const score = sessions + keyEvents
    const existing = map.get(normalizedKey)

    if (!existing) {
      map.set(normalizedKey, {
        key: displayKey,
        sessions,
        keyEvents,
        bestScore: score,
      })
      continue
    }

    existing.sessions += sessions
    existing.keyEvents += keyEvents

    if (score > existing.bestScore && displayKey) {
      existing.key = displayKey
      existing.bestScore = score
    }
  }

  return map
}

function buildMergedRows({
  gscCurrent,
  gscPrevious,
  ga4Current,
  ga4Previous,
  keyNormalizer,
  gscDisplayResolver,
  ga4DisplayResolver,
}: {
  gscCurrent: GscMetricRow[]
  gscPrevious: GscMetricRow[]
  ga4Current: Ga4MetricRow[]
  ga4Previous: Ga4MetricRow[]
  keyNormalizer: (value: string) => string | null
  gscDisplayResolver: (row: GscMetricRow) => string
  ga4DisplayResolver: (row: Ga4MetricRow) => string
}): MergedRow[] {
  const gscCurrentMap = aggregateGscRows(gscCurrent, keyNormalizer, gscDisplayResolver)
  const gscPreviousMap = aggregateGscRows(gscPrevious, keyNormalizer, gscDisplayResolver)
  const ga4CurrentMap = aggregateGa4Rows(ga4Current, keyNormalizer, ga4DisplayResolver)
  const ga4PreviousMap = aggregateGa4Rows(ga4Previous, keyNormalizer, ga4DisplayResolver)

  const keys = new Set<string>([
    ...Array.from(gscCurrentMap.keys()),
    ...Array.from(ga4CurrentMap.keys()),
  ])

  const rows: MergedRow[] = []

  for (const key of keys) {
    const gscCurrentRow = gscCurrentMap.get(key)
    const gscPreviousRow = gscPreviousMap.get(key)
    const ga4CurrentRow = ga4CurrentMap.get(key)
    const ga4PreviousRow = ga4PreviousMap.get(key)

    const gscAvailable = !!gscCurrentMap.get(key) || !!gscPreviousMap.get(key)
    const ga4Available = !!ga4CurrentMap.get(key) || !!ga4PreviousMap.get(key)

    const impressionsCurrent = asNumber(gscCurrentRow?.impressions)
    const impressionsPrevious = asNumber(gscPreviousRow?.impressions)
    const clicksCurrent = asNumber(gscCurrentRow?.clicks)
    const clicksPrevious = asNumber(gscPreviousRow?.clicks)

    const sessionsCurrent = asNumber(ga4CurrentRow?.sessions)
    const sessionsPrevious = asNumber(ga4PreviousRow?.sessions)
    const goalsCurrent = asNumber(ga4CurrentRow?.keyEvents)
    const goalsPrevious = asNumber(ga4PreviousRow?.keyEvents)

    rows.push({
      key: gscCurrentMap.get(key)?.key || ga4CurrentMap.get(key)?.key || key,
      impressions: {
        current: impressionsCurrent,
        previous: impressionsPrevious,
        available: gscAvailable,
        change: gscAvailable ? getSignedChange(impressionsCurrent, impressionsPrevious) : undefined,
      },
      clicks: {
        current: clicksCurrent,
        previous: clicksPrevious,
        available: gscAvailable,
        change: gscAvailable ? getSignedChange(clicksCurrent, clicksPrevious) : undefined,
      },
      sessions: {
        current: sessionsCurrent,
        previous: sessionsPrevious,
        available: ga4Available,
        change: ga4Available ? getSignedChange(sessionsCurrent, sessionsPrevious) : undefined,
      },
      goals: {
        current: goalsCurrent,
        previous: goalsPrevious,
        available: ga4Available,
        change: ga4Available ? getSignedChange(goalsCurrent, goalsPrevious) : undefined,
      },
    })
  }

  return rows
}

function buildGscOnlyRows(current: GscMetricRow[], previous: GscMetricRow[]): MergedRow[] {
  const currentMap = buildMap(
    current,
    (row) => (row.keys?.[0] || "").trim().toLowerCase(),
    (row) => row.keys?.[0] || ""
  )
  const previousMap = buildMap(
    previous,
    (row) => (row.keys?.[0] || "").trim().toLowerCase(),
    (row) => row.keys?.[0] || ""
  )

  return Array.from(currentMap.entries()).map(([key, currentEntry]) => {
    const previousRow = previousMap.get(key)?.row

    const impressionsCurrent = asNumber(currentEntry.row.impressions)
    const impressionsPrevious = asNumber(previousRow?.impressions)
    const clicksCurrent = asNumber(currentEntry.row.clicks)
    const clicksPrevious = asNumber(previousRow?.clicks)

    return {
      key: currentEntry.key,
      impressions: {
        current: impressionsCurrent,
        previous: impressionsPrevious,
        available: true,
        change: getSignedChange(impressionsCurrent, impressionsPrevious),
      },
      clicks: {
        current: clicksCurrent,
        previous: clicksPrevious,
        available: true,
        change: getSignedChange(clicksCurrent, clicksPrevious),
      },
      sessions: { current: 0, previous: 0, available: false },
      goals: { current: 0, previous: 0, available: false },
    }
  })
}

function extractDateMap(rows: Array<GscMetricRow | Ga4MetricRow>, metric: "impressions" | "clicks" | "sessions" | "keyEvents"): Map<string, number> {
  const map = new Map<string, number>()

  for (const row of rows || []) {
    const rawKey = row.keys?.[0] || ""
    const dateKey = normalizeDateKey(rawKey)
    if (!dateKey) continue

    const value = metric === "keyEvents"
      ? asNumber((row as Ga4MetricRow).keyEvents)
      : metric === "sessions"
        ? asNumber((row as Ga4MetricRow).sessions)
        : asNumber((row as GscMetricRow)[metric])

    map.set(dateKey, value)
  }

  return map
}

function buildEmptyV2Response(): V2Response<any> {
  return {
    success: true,
    data: {
      ranges: {
        currentStart: "",
        currentEnd: "",
        previousStart: "",
        previousEnd: "",
      },
      current: [],
      previous: [],
    },
  }
}

export function useGSCAnalytics(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months",
  filters: DeepdiveFilter[] = []
) {
  const [contentGroupsFilter, setContentGroupsFilter] = useState<TableFilterType>("popular")
  const [topPagesFilter, setTopPagesFilter] = useState<TableFilterType>("popular")
  const [topQueriesFilter, setTopQueriesFilter] = useState<TableFilterType>("popular")

  const [contentGroupsSort, setContentGroupsSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })
  const [topPagesSort, setTopPagesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })
  const [topQueriesSort, setTopQueriesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })
  const filtersQueryKey = useMemo(() => JSON.stringify(filters ?? []), [filters])

  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<TimescaleOverviewResponse>({
    queryKey: ["gsc-analytics-v2-overview", businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website")
      }

      const basePayload = {
        period,
        site_url: website,
        ...(filters.length > 0 ? { filters } : {}),
      }

      const [gscDate, gscContentGroups, gscTopPages, gscTopQueries, ga4Date, ga4ContentGroups, ga4TopPages] = await Promise.all([
        api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
        }),
        api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
          ...basePayload,
          dimension: "content_group",
          limit: 200,
        }),
        api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
          ...basePayload,
          dimension: "page",
          limit: 500,
        }),
        api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
          ...basePayload,
          dimension: "query",
          limit: 200,
        }),
        api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
          traffic_scope: "organic",
        }).catch(() => null),
        api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "content_group",
          limit: 200,
          traffic_scope: "organic",
        }).catch(() => null),
        api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "page",
          limit: 500,
          traffic_scope: "organic",
        }).catch(() => null),
      ])

      return {
        gscDate,
        gscContentGroups,
        gscTopPages,
        gscTopQueries,
        ga4Date,
        ga4ContentGroups,
        ga4TopPages,
      }
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const gscDateData = rawData?.gscDate ?? buildEmptyV2Response()
  const gscContentData = rawData?.gscContentGroups ?? buildEmptyV2Response()
  const gscPagesData = rawData?.gscTopPages ?? buildEmptyV2Response()
  const gscQueriesData = rawData?.gscTopQueries ?? buildEmptyV2Response()

  const ga4DateData = rawData?.ga4Date ?? buildEmptyV2Response()
  const ga4ContentData = rawData?.ga4ContentGroups ?? buildEmptyV2Response()
  const ga4PagesData = rawData?.ga4TopPages ?? buildEmptyV2Response()

  const chartData = useMemo<GSCChartDataPoint[]>(() => {
    const gscImpressionsMap = extractDateMap(gscDateData.data.current, "impressions")
    const gscClicksMap = extractDateMap(gscDateData.data.current, "clicks")
    const ga4SessionsMap = extractDateMap(ga4DateData.data.current, "sessions")
    const ga4GoalsMap = extractDateMap(ga4DateData.data.current, "keyEvents")

    const keys = Array.from(new Set<string>([
      ...Array.from(gscImpressionsMap.keys()),
      ...Array.from(gscClicksMap.keys()),
      ...Array.from(ga4SessionsMap.keys()),
      ...Array.from(ga4GoalsMap.keys()),
    ])).sort((a, b) => a.localeCompare(b))

    return keys.map((dateKey) => ({
      date: formatDate(dateKey),
      dateKey,
      impressions: gscImpressionsMap.get(dateKey) ?? 0,
      clicks: gscClicksMap.get(dateKey) ?? 0,
      sessions: ga4SessionsMap.get(dateKey) ?? 0,
      goals: ga4GoalsMap.get(dateKey) ?? 0,
    }))
  }, [gscDateData.data.current, ga4DateData.data.current])

  const totals = useMemo(() => {
    const currentImpressions = sumMetrics(gscDateData.data.current, "impressions")
    const previousImpressions = sumMetrics(gscDateData.data.previous, "impressions")

    const currentClicks = sumMetrics(gscDateData.data.current, "clicks")
    const previousClicks = sumMetrics(gscDateData.data.previous, "clicks")

    const currentSessions = sumMetrics(ga4DateData.data.current, "sessions")
    const previousSessions = sumMetrics(ga4DateData.data.previous, "sessions")

    const currentGoals = sumMetrics(ga4DateData.data.current, "keyEvents")
    const previousGoals = sumMetrics(ga4DateData.data.previous, "keyEvents")

    return {
      currentImpressions,
      previousImpressions,
      currentClicks,
      previousClicks,
      currentSessions,
      previousSessions,
      currentGoals,
      previousGoals,
    }
  }, [gscDateData.data.current, gscDateData.data.previous, ga4DateData.data.current, ga4DateData.data.previous])

  const trendData = useMemo<GSCTrendData>(() => {
    return {
      Imp: toTrendDetail(totals.currentImpressions, totals.previousImpressions),
      Clk: toTrendDetail(totals.currentClicks, totals.previousClicks),
      sessions: toTrendDetail(totals.currentSessions, totals.previousSessions),
      goals: toTrendDetail(totals.currentGoals, totals.previousGoals),
    }
  }, [totals])

  const chartLegendItems = useMemo<ChartLegendItem[]>(() => {
    const impressionsChange = getSignedChange(totals.currentImpressions, totals.previousImpressions)
    const clicksChange = getSignedChange(totals.currentClicks, totals.previousClicks)
    const sessionsChange = getSignedChange(totals.currentSessions, totals.previousSessions)
    const goalsChange = getSignedChange(totals.currentGoals, totals.previousGoals)

    return [
      {
        key: "impressions",
        icon: null,
        value: formatNumber(totals.currentImpressions),
        change: impressionsChange,
        checked: true,
      },
      {
        key: "clicks",
        icon: null,
        value: formatNumber(totals.currentClicks),
        change: clicksChange,
        checked: true,
      },
      {
        key: "sessions",
        icon: null,
        value: formatNumber(totals.currentSessions),
        change: sessionsChange,
        checked: true,
      },
      {
        key: "goals",
        icon: null,
        value: formatNumber(totals.currentGoals),
        change: goalsChange,
        checked: true,
      },
    ]
  }, [totals])

  const funnelData = useMemo<GSCFunnelData>(() => {
    return {
      impressions: {
        Value: totals.currentImpressions,
        Percentage: percentage(totals.currentClicks, totals.currentImpressions),
      },
      clicks: {
        Value: totals.currentClicks,
        Percentage: percentage(totals.currentGoals, totals.currentClicks),
      },
      cnv: {
        Value: totals.currentGoals,
      },
    }
  }, [totals])

  const funnelChartItems = useMemo<FunnelChartItem[]>(() => {
    return [
      {
        label: "Impressions",
        value: funnelData.impressions.Value,
        percentage: funnelData.impressions.Percentage,
      },
      {
        label: "Clicks",
        value: funnelData.clicks.Value,
        percentage: funnelData.clicks.Percentage,
      },
      {
        label: "Goals",
        value: funnelData.cnv.Value,
      },
    ]
  }, [funnelData])

  const chartConfig = useMemo(
    () => ({
      impressions: { label: "Impressions", color: "#6b7280" },
      clicks: { label: "Clicks", color: "#2563eb" },
      sessions: { label: "Sessions", color: "#e11d48" },
      goals: { label: "Goals", color: "#059669" },
    }),
    []
  )

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return []

    const impressionsValues = chartData.map((d) => d.impressions || 0)
    const clicksValues = chartData.map((d) => d.clicks || 0)
    const sessionsValues = chartData.map((d) => d.sessions || 0)
    const goalsValues = chartData.map((d) => d.goals || 0)

    const minImpressions = Math.min(...impressionsValues)
    const maxImpressions = Math.max(...impressionsValues)
    const minClicks = Math.min(...clicksValues)
    const maxClicks = Math.max(...clicksValues)
    const minSessions = Math.min(...sessionsValues)
    const maxSessions = Math.max(...sessionsValues)
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
    return chartData.map((point) => {
      const goalsNormRaw = normalizeToZeroHundred(point.goals || 0, minGoals, maxGoals)
      return {
        ...point,
        impressionsNorm: normalizeToZeroHundred(point.impressions, minImpressions, maxImpressions),
        clicksNorm: normalizeToZeroHundred(point.clicks, minClicks, maxClicks),
        sessionsNorm: normalizeToZeroHundred(point.sessions || 0, minSessions, maxSessions),
        goalsNorm: (goalsNormRaw / 100) * goalsMaxNorm,
      }
    })
  }, [chartData])

  const mergedContentGroupRows = useMemo(() => {
    return buildMergedRows({
      gscCurrent: gscContentData.data.current,
      gscPrevious: gscContentData.data.previous,
      ga4Current: ga4ContentData.data.current,
      ga4Previous: ga4ContentData.data.previous,
      keyNormalizer: normalizeContentGroupKey,
      gscDisplayResolver: (row) => row.keys?.[0] || row.group || row.displayName || "",
      ga4DisplayResolver: (row) => row.keys?.[0] || "",
    })
  }, [gscContentData.data.current, gscContentData.data.previous, ga4ContentData.data.current, ga4ContentData.data.previous])

  const mergedTopPageRows = useMemo(() => {
    return buildMergedRows({
      gscCurrent: gscPagesData.data.current,
      gscPrevious: gscPagesData.data.previous,
      ga4Current: ga4PagesData.data.current,
      ga4Previous: ga4PagesData.data.previous,
      keyNormalizer: normalizePageKey,
      gscDisplayResolver: (row) => row.keys?.[0] || "",
      ga4DisplayResolver: (row) => row.keys?.[0] || "",
    })
  }, [gscPagesData.data.current, gscPagesData.data.previous, ga4PagesData.data.current, ga4PagesData.data.previous])

  const topQueryRows = useMemo(() => {
    return buildGscOnlyRows(gscQueriesData.data.current, gscQueriesData.data.previous)
  }, [gscQueriesData.data.current, gscQueriesData.data.previous])

  const filterAndSortMergedTableData = useCallback((
    data: MergedRow[],
    filter: TableFilterType,
    sort: { column: SortColumn; direction: SortDirection },
    includeGa4Columns: boolean
  ): GSCTableDataFormatted[] => {
    let filteredData = data
      .filter((row) => includeByFilter(row, filter, includeGa4Columns))
      .sort((a, b) => compareBySort(a, b, sort))

    return filteredData.map((row) => ({
      key: row.key,
      impressions: toMetricCell(row.impressions),
      clicks: toMetricCell(row.clicks),
      ...(includeGa4Columns
        ? {
          sessions: toMetricCell(row.sessions),
          goals: toMetricCell(row.goals),
        }
        : {}),
    }))
  }, [])

  const contentGroupsData = useMemo(() => {
    return filterAndSortMergedTableData(mergedContentGroupRows, contentGroupsFilter, contentGroupsSort, true)
  }, [mergedContentGroupRows, contentGroupsFilter, contentGroupsSort, filterAndSortMergedTableData])

  const topPagesData = useMemo(() => {
    return filterAndSortMergedTableData(mergedTopPageRows, topPagesFilter, topPagesSort, true)
  }, [mergedTopPageRows, topPagesFilter, topPagesSort, filterAndSortMergedTableData])

  const topQueriesData = useMemo(() => {
    const topQuerySort: { column: SortColumn; direction: SortDirection } =
      topQueriesSort.column === "sessions" || topQueriesSort.column === "goals"
        ? { column: "impressions", direction: topQueriesSort.direction }
        : topQueriesSort

    return filterAndSortMergedTableData(topQueryRows, topQueriesFilter, topQuerySort, false)
  }, [topQueryRows, topQueriesFilter, topQueriesSort, filterAndSortMergedTableData])

  const handleContentGroupsFilterChange = useCallback((filter: TableFilterType) => {
    setContentGroupsFilter(filter)
  }, [])

  const handleTopPagesFilterChange = useCallback((filter: TableFilterType) => {
    setTopPagesFilter(filter)
  }, [])

  const handleTopQueriesFilterChange = useCallback((filter: TableFilterType) => {
    setTopQueriesFilter(filter)
  }, [])

  const handleContentGroupsSort = useCallback((column: SortColumn) => {
    setContentGroupsSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const handleTopPagesSort = useCallback((column: SortColumn) => {
    setTopPagesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const handleTopQueriesSort = useCallback((column: SortColumn) => {
    const safeColumn = column === "sessions" || column === "goals" ? "impressions" : column

    setTopQueriesSort((prev) => ({
      column: safeColumn,
      direction: prev.column === safeColumn && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const hasData = chartData.some(
    (point) =>
      (point.impressions ?? 0) > 0 ||
      (point.clicks ?? 0) > 0 ||
      (point.sessions ?? 0) > 0 ||
      (point.goals ?? 0) > 0
  )

  const hasFunnelData =
    totals.currentImpressions > 0 || totals.currentClicks > 0 || totals.currentGoals > 0

  const hasContentGroupsData = mergedContentGroupRows.length > 0
  const hasTopPagesData = mergedTopPageRows.length > 0
  const hasTopQueriesData = topQueryRows.length > 0

  return {
    chartData,
    normalizedChartData,
    chartConfig,
    chartLegendItems,
    trendData,
    funnelData,
    funnelChartItems,
    isLoading,
    isFetching,
    error,
    hasData,
    hasFunnelData,
    refetch,
    contentGroupsData,
    topPagesData,
    topQueriesData,
    contentGroupsFilter,
    topPagesFilter,
    topQueriesFilter,
    contentGroupsSort,
    topPagesSort,
    topQueriesSort,
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleTopQueriesFilterChange,
    handleContentGroupsSort,
    handleTopPagesSort,
    handleTopQueriesSort,
    hasContentGroupsData,
    hasTopPagesData,
    hasTopQueriesData,
  }
}
