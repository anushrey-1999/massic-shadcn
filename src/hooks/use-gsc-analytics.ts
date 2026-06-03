import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback, useEffect } from "react"
import { calculateTrend } from "@/utils/gsc-deepdive-utils"
import type { DeepdiveApiFilter } from "@/hooks/use-organic-deepdive-filters"
import { eachDayOfInterval, format, isValid, parseISO } from "date-fns"
import type { AnalyticsChartRange } from "@/utils/analytics-chart-grouping"
import type { TimePeriodValue } from "@/utils/analytics-period"
import type { ContentGroupFilterSource } from "@/utils/custom-content-groups"

export { TIME_PERIODS } from "@/utils/analytics-period"
export type { TimePeriodValue }
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
  rawValue?: number
  previousValue?: number
}

export interface GSCTableDataFormatted {
  key: string
  rawKey?: string
  source?: ContentGroupFilterSource
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

export interface V2Response<T = any> {
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
  source?: ContentGroupFilterSource
  impressions?: number
  clicks?: number
}

interface Ga4MetricRow {
  keys?: string[]
  source?: ContentGroupFilterSource
  sessions?: number
  keyEvents?: number
}

interface MergedMetric {
  current: number
  previous: number
  available: boolean
  change?: number
}

interface MergedRow {
  key: string
  rawKey?: string
  source?: ContentGroupFilterSource
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
  source?: ContentGroupFilterSource
}

interface AggregatedGa4Row {
  key: string
  sessions: number
  keyEvents: number
  bestScore: number
  source?: ContentGroupFilterSource
}

function parseDateSafe(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export interface GSCAnalyticsLoadingState {
  chart: boolean
  funnel: boolean
  contentGroups: boolean
  topPages: boolean
  topQueries: boolean
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

  if (raw.startsWith("sc-domain:")) {
    raw = raw.slice("sc-domain:".length)
  }

  const hashIndex = raw.indexOf("#")
  if (hashIndex >= 0) {
    raw = raw.slice(0, hashIndex)
  }

  if (!raw) return "/"

  let withoutOrigin = raw
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(withoutOrigin)) {
    withoutOrigin = withoutOrigin.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
  } else if (withoutOrigin.startsWith("//")) {
    withoutOrigin = withoutOrigin.replace(/^\/\/[^/]*/, "")
  } else if (!withoutOrigin.startsWith("/") && !withoutOrigin.startsWith("?")) {
    const splitIndex = withoutOrigin.search(/[/?]/)
    const hostCandidate = splitIndex >= 0 ? withoutOrigin.slice(0, splitIndex) : withoutOrigin
    if (/^(localhost(:\d+)?|[^/?]+\.[^/?]+(:\d+)?)$/i.test(hostCandidate)) {
      withoutOrigin = splitIndex >= 0 ? withoutOrigin.slice(splitIndex) : "/"
    }
  }

  if (!withoutOrigin) return "/"
  if (withoutOrigin.startsWith("?")) {
    withoutOrigin = `/${withoutOrigin}`
  } else if (!withoutOrigin.startsWith("/")) {
    withoutOrigin = `/${withoutOrigin}`
  }

  const queryIndex = withoutOrigin.indexOf("?")
  const pathPart = queryIndex >= 0 ? withoutOrigin.slice(0, queryIndex) : withoutOrigin
  const queryPart = queryIndex >= 0 ? withoutOrigin.slice(queryIndex + 1) : null

  let normalizedPath = pathPart.replace(/\/+/g, "/")
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`
  }
  if (normalizedPath.length > 1) {
    normalizedPath = normalizedPath.replace(/\/+$/g, "")
  }
  if (!normalizedPath) normalizedPath = "/"

  const normalized = queryPart === null
    ? normalizedPath
    : `${normalizedPath}?${queryPart}`

  return normalized.toLowerCase()
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
    rawValue: metric.current,
    previousValue: metric.previous,
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

    if ((displayKey || "").length > (existing.key || "").length) {
      existing.key = displayKey
    }
  }

  return map
}

function aggregateGscRows(
  rows: GscMetricRow[],
  keyNormalizer: (row: GscMetricRow, value: string) => string | null,
  displayResolver: (row: GscMetricRow) => string
): Map<string, AggregatedGscRow> {
  const map = new Map<string, AggregatedGscRow>()

  for (const row of rows || []) {
    const displayKey = displayResolver(row)
    const normalizedKey = keyNormalizer(row, displayKey)
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
        source: row.source,
      })
      continue
    }

    existing.impressions += impressions
    existing.clicks += clicks

    if (score > existing.bestScore && displayKey) {
      existing.key = displayKey
      existing.bestScore = score
    }
    if (!existing.source && row.source) {
      existing.source = row.source
    }
  }

  return map
}

function aggregateGa4Rows(
  rows: Ga4MetricRow[],
  keyNormalizer: (row: Ga4MetricRow, value: string) => string | null,
  displayResolver: (row: Ga4MetricRow) => string
): Map<string, AggregatedGa4Row> {
  const map = new Map<string, AggregatedGa4Row>()

  for (const row of rows || []) {
    const displayKey = displayResolver(row)
    const normalizedKey = keyNormalizer(row, displayKey)
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
        source: row.source,
      })
      continue
    }

    existing.sessions += sessions
    existing.keyEvents += keyEvents

    if (score > existing.bestScore && displayKey) {
      existing.key = displayKey
      existing.bestScore = score
    }
    if (!existing.source && row.source) {
      existing.source = row.source
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
  rawKeyResolver,
  sourceResolver,
  gscDisplayResolver,
  ga4DisplayResolver,
}: {
  gscCurrent: GscMetricRow[]
  gscPrevious: GscMetricRow[]
  ga4Current: Ga4MetricRow[]
  ga4Previous: Ga4MetricRow[]
  keyNormalizer: (row: GscMetricRow | Ga4MetricRow, value: string) => string | null
  rawKeyResolver?: (row: GscMetricRow | Ga4MetricRow, displayValue: string) => string
  sourceResolver?: (row: GscMetricRow | Ga4MetricRow) => ContentGroupFilterSource | undefined
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
    const displayKey = gscCurrentMap.get(key)?.key || ga4CurrentMap.get(key)?.key || key
    const metadataRow =
      (gscCurrentRow || gscPreviousRow || ga4CurrentRow || ga4PreviousRow || {}) as
        | GscMetricRow
        | Ga4MetricRow

    const impressionsCurrent = asNumber(gscCurrentRow?.impressions)
    const impressionsPrevious = asNumber(gscPreviousRow?.impressions)
    const clicksCurrent = asNumber(gscCurrentRow?.clicks)
    const clicksPrevious = asNumber(gscPreviousRow?.clicks)

    const sessionsCurrent = asNumber(ga4CurrentRow?.sessions)
    const sessionsPrevious = asNumber(ga4PreviousRow?.sessions)
    const goalsCurrent = asNumber(ga4CurrentRow?.keyEvents)
    const goalsPrevious = asNumber(ga4PreviousRow?.keyEvents)

    rows.push({
      key: displayKey,
      rawKey: rawKeyResolver?.(metadataRow, displayKey),
      source: sourceResolver?.(metadataRow),
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
      rawKey: currentEntry.key,
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

function buildDailyChartSeries({
  impressionsMap,
  clicksMap,
  sessionsMap,
  goalsMap,
  start,
  end,
}: {
  impressionsMap: Map<string, number>
  clicksMap: Map<string, number>
  sessionsMap: Map<string, number>
  goalsMap: Map<string, number>
  start?: string
  end?: string
}): GSCChartDataPoint[] {
  const parsedStart = parseDateSafe(start)
  const parsedEnd = parseDateSafe(end)

  if (parsedStart && parsedEnd) {
    return eachDayOfInterval({ start: parsedStart, end: parsedEnd }).map((date) => {
      const dateKey = format(date, "yyyy-MM-dd")

      return {
        date: formatDate(dateKey),
        dateKey,
        impressions: impressionsMap.get(dateKey) ?? 0,
        clicks: clicksMap.get(dateKey) ?? 0,
        sessions: sessionsMap.get(dateKey) ?? 0,
        goals: goalsMap.get(dateKey) ?? 0,
      }
    })
  }

  const keys = Array.from(new Set<string>([
    ...Array.from(impressionsMap.keys()),
    ...Array.from(clicksMap.keys()),
    ...Array.from(sessionsMap.keys()),
    ...Array.from(goalsMap.keys()),
  ])).sort((a, b) => a.localeCompare(b))

  return keys.map((dateKey) => ({
    date: formatDate(dateKey),
    dateKey,
    impressions: impressionsMap.get(dateKey) ?? 0,
    clicks: clicksMap.get(dateKey) ?? 0,
    sessions: sessionsMap.get(dateKey) ?? 0,
    goals: goalsMap.get(dateKey) ?? 0,
  }))
}

export function buildEmptyV2Response<T = any>(): V2Response<T> {
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

function buildBasePayload(period: TimePeriodValue, website: string, filters: DeepdiveApiFilter[]) {
  return {
    period,
    site_url: website,
    ...(filters.length > 0 ? { filters } : {}),
  }
}

export type GA4TrafficScope = "all" | "organic"

export function useGSCAnalytics(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months",
  filters: DeepdiveApiFilter[] = [],
  ga4TrafficScope: GA4TrafficScope = "organic"
) {
  const [contentGroupsFilter, setContentGroupsFilter] = useState<TableFilterType>("popular")
  const [topPagesFilter, setTopPagesFilter] = useState<TableFilterType>("popular")
  const [topQueriesFilter, setTopQueriesFilter] = useState<TableFilterType>("popular")

  const defaultSortColumn: SortColumn = ga4TrafficScope === "all" ? "sessions" : "impressions"
  const [contentGroupsSort, setContentGroupsSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: defaultSortColumn, direction: "desc" })
  const [topPagesSort, setTopPagesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: defaultSortColumn, direction: "desc" })
  const [topQueriesSort, setTopQueriesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: defaultSortColumn, direction: "desc" })

  useEffect(() => {
    if (ga4TrafficScope === "all") {
      setContentGroupsSort({ column: "sessions", direction: "desc" })
      setTopPagesSort({ column: "sessions", direction: "desc" })
      setTopQueriesSort({ column: "sessions", direction: "desc" })
    } else {
      setContentGroupsSort({ column: "impressions", direction: "desc" })
      setTopPagesSort({ column: "impressions", direction: "desc" })
      setTopQueriesSort({ column: "impressions", direction: "desc" })
    }
  }, [ga4TrafficScope])

  const filtersQueryKey = useMemo(() => JSON.stringify(filters ?? []), [filters])
  const enabled = Boolean(businessUniqueId && website)
  const basePayload = useMemo(
    () =>
      website
        ? {
            ...buildBasePayload(period, website, filters),
            businessUniqueId: businessUniqueId || undefined,
          }
        : null,
    [businessUniqueId, filters, period, website]
  )

  const gscDateQuery = useQuery<V2Response<GscMetricRow>>({
    queryKey: ["gsc-date", businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      return api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
        ...basePayload,
        dimension: "date",
      })
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const gscContentGroupsQuery = useQuery<V2Response<GscMetricRow>>({
    queryKey: ["gsc-content-groups", businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      return api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
        ...basePayload,
        dimension: "content_group",
        limit: 200,
      })
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const gscTopPagesQuery = useQuery<V2Response<GscMetricRow>>({
    queryKey: ["gsc-top-pages", businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      return api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
        ...basePayload,
        dimension: "page",
        limit: 500,
      })
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const gscTopQueriesQuery = useQuery<V2Response<GscMetricRow>>({
    queryKey: ["gsc-top-queries", businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      return api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
        ...basePayload,
        dimension: "query",
        limit: 200,
      })
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const ga4DateQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-date", ga4TrafficScope, businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
          traffic_scope: ga4TrafficScope,
        })
      } catch {
        return buildEmptyV2Response<Ga4MetricRow>()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const ga4ContentGroupsQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-content-groups", ga4TrafficScope, businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "content_group",
          limit: 200,
          traffic_scope: ga4TrafficScope,
        })
      } catch {
        return buildEmptyV2Response<Ga4MetricRow>()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const ga4TopPagesQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-top-pages", ga4TrafficScope, businessUniqueId, website, period, filtersQueryKey],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "page",
          limit: 500,
          traffic_scope: ga4TrafficScope,
        })
      } catch {
        return buildEmptyV2Response<Ga4MetricRow>()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const gscDateData = gscDateQuery.data ?? buildEmptyV2Response<GscMetricRow>()
  const gscContentData = gscContentGroupsQuery.data ?? buildEmptyV2Response<GscMetricRow>()
  const gscPagesData = gscTopPagesQuery.data ?? buildEmptyV2Response<GscMetricRow>()
  const gscQueriesData = gscTopQueriesQuery.data ?? buildEmptyV2Response<GscMetricRow>()

  const ga4DateData = ga4DateQuery.data ?? buildEmptyV2Response<Ga4MetricRow>()
  const ga4ContentData = ga4ContentGroupsQuery.data ?? buildEmptyV2Response<Ga4MetricRow>()
  const ga4PagesData = ga4TopPagesQuery.data ?? buildEmptyV2Response<Ga4MetricRow>()

  const chartRanges = useMemo<AnalyticsChartRange>(() => {
    const gscRanges = gscDateData.data.ranges
    const ga4Ranges = ga4DateData.data.ranges

    return {
      currentStart: gscRanges.currentStart || ga4Ranges.currentStart || "",
      currentEnd: gscRanges.currentEnd || ga4Ranges.currentEnd || "",
      previousStart: gscRanges.previousStart || ga4Ranges.previousStart || "",
      previousEnd: gscRanges.previousEnd || ga4Ranges.previousEnd || "",
    }
  }, [ga4DateData.data.ranges, gscDateData.data.ranges])

  const rawCurrentChartData = useMemo<GSCChartDataPoint[]>(() => {
    const gscImpressionsMap = extractDateMap(gscDateData.data.current, "impressions")
    const gscClicksMap = extractDateMap(gscDateData.data.current, "clicks")
    const ga4SessionsMap = extractDateMap(ga4DateData.data.current, "sessions")
    const ga4GoalsMap = extractDateMap(ga4DateData.data.current, "keyEvents")

    return buildDailyChartSeries({
      impressionsMap: gscImpressionsMap,
      clicksMap: gscClicksMap,
      sessionsMap: ga4SessionsMap,
      goalsMap: ga4GoalsMap,
      start: chartRanges.currentStart,
      end: chartRanges.currentEnd,
    })
  }, [chartRanges.currentEnd, chartRanges.currentStart, ga4DateData.data.current, gscDateData.data.current])

  const rawPreviousChartData = useMemo<GSCChartDataPoint[]>(() => {
    const gscImpressionsMap = extractDateMap(gscDateData.data.previous, "impressions")
    const gscClicksMap = extractDateMap(gscDateData.data.previous, "clicks")
    const ga4SessionsMap = extractDateMap(ga4DateData.data.previous, "sessions")
    const ga4GoalsMap = extractDateMap(ga4DateData.data.previous, "keyEvents")

    return buildDailyChartSeries({
      impressionsMap: gscImpressionsMap,
      clicksMap: gscClicksMap,
      sessionsMap: ga4SessionsMap,
      goalsMap: ga4GoalsMap,
      start: chartRanges.previousStart,
      end: chartRanges.previousEnd,
    })
  }, [chartRanges.previousEnd, chartRanges.previousStart, ga4DateData.data.previous, gscDateData.data.previous])

  const chartData = rawCurrentChartData

  const totals = useMemo(() => {
    const currentImpressions = gscDateData.data.current.reduce((sum, row) => sum + asNumber(row.impressions), 0)
    const previousImpressions = gscDateData.data.previous.reduce((sum, row) => sum + asNumber(row.impressions), 0)

    const currentClicks = gscDateData.data.current.reduce((sum, row) => sum + asNumber(row.clicks), 0)
    const previousClicks = gscDateData.data.previous.reduce((sum, row) => sum + asNumber(row.clicks), 0)

    const currentSessions = ga4DateData.data.current.reduce((sum, row) => sum + asNumber(row.sessions), 0)
    const previousSessions = ga4DateData.data.previous.reduce((sum, row) => sum + asNumber(row.sessions), 0)

    const currentGoals = ga4DateData.data.current.reduce((sum, row) => sum + asNumber(row.keyEvents), 0)
    const previousGoals = ga4DateData.data.previous.reduce((sum, row) => sum + asNumber(row.keyEvents), 0)

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
  }, [ga4DateData.data.current, ga4DateData.data.previous, gscDateData.data.current, gscDateData.data.previous])

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
      sessions: { label: "Sessions", color: "#ea580c" },
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
      const numericValue = Number(value) || 0
      if (numericValue === 0) return 0
      if (max === min) return 50
      const pad = (max - min) * 0.05 || 1
      const lo = Math.max(0, min - pad)
      const hi = max + pad
      const normalized = (numericValue - lo) / (hi - lo)
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
      keyNormalizer: (row, value) => {
        if (row.source === "custom") {
          const customName = String((row as GscMetricRow).group || row.keys?.[0] || value || "").trim()
          return customName ? `custom:${customName.toLowerCase()}` : null
        }

        const normalized = normalizeContentGroupKey(value)
        return normalized ? `default:${normalized}` : null
      },
      rawKeyResolver: (row, displayValue) =>
        String((row as GscMetricRow).group || row.keys?.[0] || displayValue || "").trim(),
      sourceResolver: (row) => (row.source === "custom" ? "custom" : "default"),
      gscDisplayResolver: (row) => row.keys?.[0] || row.group || row.displayName || "",
      ga4DisplayResolver: (row) => row.keys?.[0] || "",
    })
  }, [ga4ContentData.data.current, ga4ContentData.data.previous, gscContentData.data.current, gscContentData.data.previous])

  const normalizedContentGroupRows = useMemo(() => {
    const map = new Map<string, MergedRow>()

    for (const row of mergedContentGroupRows) {
      const normalizedDefaultKey = normalizeContentGroupKey(row.rawKey || row.key || "")
      const identity =
        row.source === "custom"
          ? `custom:${String(row.rawKey || row.key || "").trim().toLowerCase()}`
          : normalizedDefaultKey
            ? `default:${normalizedDefaultKey}`
            : null

      if (!identity) continue
      map.set(identity, row)
    }

    return Array.from(map.values())
  }, [mergedContentGroupRows])

  const mergedTopPageRows = useMemo(() => {
    return buildMergedRows({
      gscCurrent: gscPagesData.data.current,
      gscPrevious: gscPagesData.data.previous,
      ga4Current: ga4PagesData.data.current,
      ga4Previous: ga4PagesData.data.previous,
      keyNormalizer: (_row, value) => normalizePageKey(value),
      rawKeyResolver: (row, displayValue) => String(row.keys?.[0] || displayValue || "").trim(),
      gscDisplayResolver: (row) => row.keys?.[0] || "",
      ga4DisplayResolver: (row) => row.keys?.[0] || "",
    })
  }, [ga4PagesData.data.current, ga4PagesData.data.previous, gscPagesData.data.current, gscPagesData.data.previous])

  const topQueryRows = useMemo(() => {
    return buildGscOnlyRows(gscQueriesData.data.current, gscQueriesData.data.previous)
  }, [gscQueriesData.data.current, gscQueriesData.data.previous])

  const filterAndSortMergedTableData = useCallback((
    data: MergedRow[],
    filter: TableFilterType,
    sort: { column: SortColumn; direction: SortDirection },
    includeGa4Columns: boolean
  ): GSCTableDataFormatted[] => {
    return data
      .filter((row) => includeByFilter(row, filter, includeGa4Columns))
      .sort((a, b) => compareBySort(a, b, sort))
      .map((row) => ({
        key: row.key,
        rawKey: row.rawKey,
        source: row.source,
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
    return filterAndSortMergedTableData(normalizedContentGroupRows, contentGroupsFilter, contentGroupsSort, true)
  }, [contentGroupsFilter, contentGroupsSort, filterAndSortMergedTableData, normalizedContentGroupRows])

  const topPagesData = useMemo(() => {
    return filterAndSortMergedTableData(mergedTopPageRows, topPagesFilter, topPagesSort, true)
  }, [filterAndSortMergedTableData, mergedTopPageRows, topPagesFilter, topPagesSort])

  const topQueriesData = useMemo(() => {
    const topQuerySort: { column: SortColumn; direction: SortDirection } =
      topQueriesSort.column === "sessions" || topQueriesSort.column === "goals"
        ? { column: "impressions", direction: topQueriesSort.direction }
        : topQueriesSort

    return filterAndSortMergedTableData(topQueryRows, topQueriesFilter, topQuerySort, false)
  }, [filterAndSortMergedTableData, topQueriesFilter, topQueriesSort, topQueryRows])

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

  const hasFunnelData = funnelChartItems.some((item) => item.value > 0)
  const hasContentGroupsData = normalizedContentGroupRows.length > 0
  const hasTopPagesData = mergedTopPageRows.length > 0
  const hasTopQueriesData = topQueryRows.length > 0

  const loadingState: GSCAnalyticsLoadingState = {
    chart: gscDateQuery.isLoading || ga4DateQuery.isLoading,
    funnel: gscDateQuery.isLoading || ga4DateQuery.isLoading,
    contentGroups: gscContentGroupsQuery.isLoading || ga4ContentGroupsQuery.isLoading,
    topPages: gscTopPagesQuery.isLoading || ga4TopPagesQuery.isLoading,
    topQueries: gscTopQueriesQuery.isLoading,
  }

  const isLoading = Object.values(loadingState).some(Boolean)
  const isFetching = [
    gscDateQuery,
    gscContentGroupsQuery,
    gscTopPagesQuery,
    gscTopQueriesQuery,
    ga4DateQuery,
    ga4ContentGroupsQuery,
    ga4TopPagesQuery,
  ].some((query) => query.isFetching)

  const error =
    gscDateQuery.error ||
    gscContentGroupsQuery.error ||
    gscTopPagesQuery.error ||
    gscTopQueriesQuery.error

  const refetch = useCallback(async () => {
    return Promise.allSettled([
      gscDateQuery.refetch(),
      gscContentGroupsQuery.refetch(),
      gscTopPagesQuery.refetch(),
      gscTopQueriesQuery.refetch(),
      ga4DateQuery.refetch(),
      ga4ContentGroupsQuery.refetch(),
      ga4TopPagesQuery.refetch(),
    ])
  }, [
    ga4ContentGroupsQuery,
    ga4DateQuery,
    ga4TopPagesQuery,
    gscContentGroupsQuery,
    gscDateQuery,
    gscTopPagesQuery,
    gscTopQueriesQuery,
  ])

  return {
    chartData,
    rawCurrentChartData,
    rawPreviousChartData,
    chartRanges,
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
    loadingState,
  }
}
