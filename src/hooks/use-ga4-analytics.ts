import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback } from "react"

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months"
export type TableFilterType = "popular" | "growing" | "decaying"
export type GA4SortColumn = "sessions" | "goals"
export type SortDirection = "asc" | "desc"

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

interface Ga4MetricRow {
  keys?: string[]
  sessions?: number
  keyEvents?: number
}

export interface GA4ChartDataFormatted {
  date: string
  sessions: number
  goals: number
}

export interface GA4TableDataFormatted {
  key: string
  sessions: { value: string | number; change: number }
  goals: { value: string | number; change: number }
}

export interface GA4ChannelDataFormatted {
  name: string
  sessions: number
  goals: number
}

export interface GA4GoalDataFormatted {
  goal: string
  goals: { value: number; change: number }
}

interface TimescaleTableInternal {
  key: string
  sessions: number
  goals: number
  sessionsChange: number
  goalsChange: number
}

export interface GA4AnalyticsLoadingState {
  chart: boolean
  goals: boolean
  topSources: boolean
  channels: boolean
  contentGroups: boolean
  topPages: boolean
}

function formatNumber(value: number | string): string {
  if (typeof value === "string") {
    if (/[KMkm]$/.test(value.trim())) {
      return value
    }

    const cleanValue = value.replace(/,/g, "")
    const num = parseFloat(cleanValue)
    if (!Number.isFinite(num)) return "0"
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
    if (Number.isNaN(date.getTime())) return dateString
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

function normalizePageForDisplay(value: string): string {
  const raw = String(value || "").trim()
  if (!raw) return "/"

  try {
    const candidate = raw.startsWith("/")
      ? `https://placeholder.local${raw}`
      : raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`

    const parsed = new URL(candidate)
    const pathname = (parsed.pathname || "/").replace(/\/+/g, "/")
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/g, "")
    return `${normalizedPath}${parsed.search || ""}`
  } catch {
    if (raw.startsWith("/")) return raw
    const stripped = raw
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/^[^/]+/, "")
    return stripped || "/"
  }
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function signedChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? Infinity : 0
  }

  const pct = ((current - previous) / previous) * 100
  return Number.isFinite(pct) ? Math.round(pct) : 0
}

function sumRows(rows: Ga4MetricRow[], metric: "sessions" | "keyEvents"): number {
  return (rows || []).reduce((sum, row) => sum + asNumber(row?.[metric]), 0)
}

function buildEmptyV2Response(): V2Response<Ga4MetricRow> {
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

function buildTimescaleTableRows(current: Ga4MetricRow[], previous: Ga4MetricRow[]): TimescaleTableInternal[] {
  const previousMap = new Map<string, Ga4MetricRow>()

  for (const row of previous || []) {
    const key = String(row?.keys?.[0] || "").trim().toLowerCase()
    if (!key) continue
    previousMap.set(key, row)
  }

  return (current || []).map((row) => {
    const keyRaw = String(row?.keys?.[0] || "").trim()
    const keyNormalized = keyRaw.toLowerCase()
    const previousRow = previousMap.get(keyNormalized)

    const sessionsCurrent = asNumber(row?.sessions)
    const sessionsPrevious = asNumber(previousRow?.sessions)
    const goalsCurrent = asNumber(row?.keyEvents)
    const goalsPrevious = asNumber(previousRow?.keyEvents)

    return {
      key: keyRaw,
      sessions: sessionsCurrent,
      goals: goalsCurrent,
      sessionsChange: signedChange(sessionsCurrent, sessionsPrevious),
      goalsChange: signedChange(goalsCurrent, goalsPrevious),
    }
  })
}

function includeTimescaleRow(row: TimescaleTableInternal, filter: TableFilterType): boolean {
  if (filter === "popular") return true

  if (filter === "growing") {
    return row.sessionsChange > 0 || row.goalsChange > 0
  }

  return row.sessionsChange < 0 || row.goalsChange < 0
}

function sortTimescaleRows(
  rows: TimescaleTableInternal[],
  sort: { column: GA4SortColumn; direction: SortDirection }
): TimescaleTableInternal[] {
  return [...rows].sort((a, b) => {
    const aValue = sort.column === "sessions" ? a.sessions : a.goals
    const bValue = sort.column === "sessions" ? b.sessions : b.goals
    return sort.direction === "desc" ? bValue - aValue : aValue - bValue
  })
}

function buildBasePayload(period: TimePeriodValue, website: string) {
  return {
    site_url: website,
    period,
    traffic_scope: "all",
  }
}

export function useGA4Analytics(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const [goalsFilter, setGoalsFilter] = useState<TableFilterType>("popular")
  const [topSourcesFilter, setTopSourcesFilter] = useState<TableFilterType>("popular")
  const [contentGroupsFilter, setContentGroupsFilter] = useState<TableFilterType>("popular")
  const [topPagesFilter, setTopPagesFilter] = useState<TableFilterType>("popular")

  const [goalsSort, setGoalsSort] = useState<{ column: GA4SortColumn; direction: SortDirection }>({ column: "goals", direction: "desc" })
  const [topSourcesSort, setTopSourcesSort] = useState<{ column: GA4SortColumn; direction: SortDirection }>({ column: "sessions", direction: "desc" })
  const [contentGroupsSort, setContentGroupsSort] = useState<{ column: GA4SortColumn; direction: SortDirection }>({ column: "sessions", direction: "desc" })
  const [topPagesSort, setTopPagesSort] = useState<{ column: GA4SortColumn; direction: SortDirection }>({ column: "sessions", direction: "desc" })

  const enabled = Boolean(businessUniqueId && website)
  const basePayload = useMemo(
    () => (website ? buildBasePayload(period, website) : null),
    [period, website]
  )

  const dateQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-date-all", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const contentGroupQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-content-group-all", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "content_group",
          limit: 200,
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const pageQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-page-all", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "page",
          limit: 300,
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const eventNameQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-event-name", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "event_name",
          limit: 200,
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const sourceMediumQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-source-medium", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "source_medium",
          limit: 200,
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const channelGroupQuery = useQuery<V2Response<Ga4MetricRow>>({
    queryKey: ["ga4-channel-group", businessUniqueId, website, period],
    queryFn: async () => {
      if (!basePayload) {
        throw new Error("Missing business ID or website")
      }

      try {
        return await api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "channel_group",
          limit: 100,
        })
      } catch {
        return buildEmptyV2Response()
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const dateData = dateQuery.data ?? buildEmptyV2Response()
  const contentGroupData = contentGroupQuery.data ?? buildEmptyV2Response()
  const pageData = pageQuery.data ?? buildEmptyV2Response()
  const eventNameData = eventNameQuery.data ?? buildEmptyV2Response()
  const sourceMediumData = sourceMediumQuery.data ?? buildEmptyV2Response()
  const channelGroupData = channelGroupQuery.data ?? buildEmptyV2Response()

  const dateRows = dateData.data.current
  const previousDateRows = dateData.data.previous

  const chartData = useMemo<GA4ChartDataFormatted[]>(() => {
    return dateRows
      .map((row) => {
        const dateKey = normalizeDateKey(String(row?.keys?.[0] || ""))
        if (!dateKey) return null

        return {
          date: formatDate(dateKey),
          sessions: asNumber(row?.sessions),
          goals: asNumber(row?.keyEvents),
        }
      })
      .filter((row): row is GA4ChartDataFormatted => row !== null)
  }, [dateRows])

  const sessionsMetric = useMemo(() => {
    const current = sumRows(dateRows, "sessions")
    const previous = sumRows(previousDateRows, "sessions")
    return {
      value: formatNumber(current),
      change: signedChange(current, previous),
    }
  }, [dateRows, previousDateRows])

  const goalsMetric = useMemo(() => {
    const current = sumRows(dateRows, "keyEvents")
    const previous = sumRows(previousDateRows, "keyEvents")
    return {
      value: formatNumber(current),
      change: signedChange(current, previous),
    }
  }, [dateRows, previousDateRows])

  const goalsRows = useMemo(() => {
    return buildTimescaleTableRows(eventNameData.data.current, eventNameData.data.previous)
  }, [eventNameData.data.current, eventNameData.data.previous])

  const contentGroupRows = useMemo(() => {
    return buildTimescaleTableRows(contentGroupData.data.current, contentGroupData.data.previous)
  }, [contentGroupData.data.current, contentGroupData.data.previous])

  const topPageRows = useMemo(() => {
    return buildTimescaleTableRows(pageData.data.current, pageData.data.previous)
  }, [pageData.data.current, pageData.data.previous])

  const sourceMediumRows = useMemo(() => {
    return buildTimescaleTableRows(sourceMediumData.data.current, sourceMediumData.data.previous)
  }, [sourceMediumData.data.current, sourceMediumData.data.previous])

  const channelRows = useMemo(() => {
    return buildTimescaleTableRows(channelGroupData.data.current, channelGroupData.data.previous)
  }, [channelGroupData.data.current, channelGroupData.data.previous])

  const goalsData = useMemo<GA4GoalDataFormatted[]>(() => {
    return sortTimescaleRows(
      goalsRows.filter((row) => includeTimescaleRow(row, goalsFilter)),
      goalsSort
    ).map((row) => ({
      goal: row.key,
      goals: {
        value: row.goals,
        change: row.goalsChange,
      },
    }))
  }, [goalsFilter, goalsRows, goalsSort])

  const topSourcesData = useMemo<GA4TableDataFormatted[]>(() => {
    return sortTimescaleRows(
      sourceMediumRows.filter((row) => includeTimescaleRow(row, topSourcesFilter)),
      topSourcesSort
    ).map((row) => ({
      key: row.key,
      sessions: {
        value: formatNumber(row.sessions),
        change: row.sessionsChange,
      },
      goals: {
        value: formatNumber(row.goals),
        change: row.goalsChange,
      },
    }))
  }, [sourceMediumRows, topSourcesFilter, topSourcesSort])

  const contentGroupsData = useMemo<GA4TableDataFormatted[]>(() => {
    return sortTimescaleRows(
      contentGroupRows.filter((row) => includeTimescaleRow(row, contentGroupsFilter)),
      contentGroupsSort
    ).map((row) => ({
      key: row.key,
      sessions: {
        value: formatNumber(row.sessions),
        change: row.sessionsChange,
      },
      goals: {
        value: formatNumber(row.goals),
        change: row.goalsChange,
      },
    }))
  }, [contentGroupRows, contentGroupsFilter, contentGroupsSort])

  const topPagesData = useMemo<GA4TableDataFormatted[]>(() => {
    return sortTimescaleRows(
      topPageRows.filter((row) => includeTimescaleRow(row, topPagesFilter)),
      topPagesSort
    ).map((row) => ({
      key: normalizePageForDisplay(row.key),
      sessions: {
        value: formatNumber(row.sessions),
        change: row.sessionsChange,
      },
      goals: {
        value: formatNumber(row.goals),
        change: row.goalsChange,
      },
    }))
  }, [topPageRows, topPagesFilter, topPagesSort])

  const channelsData = useMemo<GA4ChannelDataFormatted[]>(() => {
    return [...channelRows]
      .sort((a, b) => b.sessions - a.sessions)
      .map((row) => ({
        name: row.key || "(not set)",
        sessions: row.sessions,
        goals: row.goals,
      }))
  }, [channelRows])

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return []

    const sessionsValues = chartData.map((d) => d.sessions || 0)
    const goalsValues = chartData.map((d) => d.goals || 0)

    const minSessions = Math.min(...sessionsValues)
    const maxSessions = Math.max(...sessionsValues)
    const minGoals = Math.min(...goalsValues)
    const maxGoals = Math.max(...goalsValues)

    const scaleValueToBand = (value: number, min: number, max: number, bandStart: number, bandEnd: number): number => {
      if (max === min) return (bandStart + bandEnd) / 2
      const normalized = (value - min) / (max - min)
      return bandStart + normalized * (bandEnd - bandStart)
    }

    return chartData.map((point) => ({
      ...point,
      sessionsNorm: scaleValueToBand(point.sessions, minSessions, maxSessions, 50, 100),
      goalsNorm: scaleValueToBand(point.goals, minGoals, maxGoals, 0, 50),
    }))
  }, [chartData])

  const normalizedChannelsData = useMemo(() => {
    if (channelsData.length === 0) return []

    const sessionsValues = channelsData.map((d) => d.sessions || 0)
    const goalsValues = channelsData.map((d) => d.goals || 0)

    const minSessions = Math.min(...sessionsValues)
    const maxSessions = Math.max(...sessionsValues)
    const minGoals = Math.min(...goalsValues)
    const maxGoals = Math.max(...goalsValues)

    const scaleValueToBand = (value: number, min: number, max: number, bandStart: number, bandEnd: number): number => {
      if (max === min) return (bandStart + bandEnd) / 2
      const normalized = (value - min) / (max - min)
      return bandStart + normalized * (bandEnd - bandStart)
    }

    return channelsData.map((item) => ({
      ...item,
      goalsNorm: scaleValueToBand(item.goals, minGoals, maxGoals, 0, 50),
      sessionsNorm: scaleValueToBand(item.sessions, minSessions, maxSessions, 50, 100),
    }))
  }, [channelsData])

  const handleGoalsFilterChange = useCallback((filter: TableFilterType) => {
    setGoalsFilter(filter)
  }, [])

  const handleTopSourcesFilterChange = useCallback((filter: TableFilterType) => {
    setTopSourcesFilter(filter)
  }, [])

  const handleContentGroupsFilterChange = useCallback((filter: TableFilterType) => {
    setContentGroupsFilter(filter)
  }, [])

  const handleTopPagesFilterChange = useCallback((filter: TableFilterType) => {
    setTopPagesFilter(filter)
  }, [])

  const handleGoalsSort = useCallback((column: GA4SortColumn) => {
    setGoalsSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const handleTopSourcesSort = useCallback((column: GA4SortColumn) => {
    setTopSourcesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const handleContentGroupsSort = useCallback((column: GA4SortColumn) => {
    setContentGroupsSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const handleTopPagesSort = useCallback((column: GA4SortColumn) => {
    setTopPagesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const hasChartData = chartData.some((row) => row.sessions > 0 || row.goals > 0)
  const hasGoalsData = goalsData.length > 0
  const hasTopSourcesData = topSourcesData.length > 0
  const hasContentGroupsData = contentGroupsData.length > 0
  const hasTopPagesData = topPagesData.length > 0
  const hasChannelsData = channelsData.length > 0

  const loadingState: GA4AnalyticsLoadingState = {
    chart: dateQuery.isLoading,
    goals: eventNameQuery.isLoading,
    topSources: sourceMediumQuery.isLoading,
    channels: channelGroupQuery.isLoading,
    contentGroups: contentGroupQuery.isLoading,
    topPages: pageQuery.isLoading,
  }

  const isLoading = Object.values(loadingState).some(Boolean)
  const isFetching = [
    dateQuery,
    contentGroupQuery,
    pageQuery,
    eventNameQuery,
    sourceMediumQuery,
    channelGroupQuery,
  ].some((query) => query.isFetching)

  const refetch = useCallback(async () => {
    return Promise.allSettled([
      dateQuery.refetch(),
      contentGroupQuery.refetch(),
      pageQuery.refetch(),
      eventNameQuery.refetch(),
      sourceMediumQuery.refetch(),
      channelGroupQuery.refetch(),
    ])
  }, [channelGroupQuery, contentGroupQuery, dateQuery, eventNameQuery, pageQuery, sourceMediumQuery])

  return {
    chartData,
    normalizedChartData,
    normalizedChannelsData,
    sessionsMetric,
    goalsMetric,
    mainStats: null,
    goalsData,
    topSourcesData,
    contentGroupsData,
    topPagesData,
    channelsData,
    goalsFilter,
    topSourcesFilter,
    contentGroupsFilter,
    topPagesFilter,
    goalsSort,
    topSourcesSort,
    contentGroupsSort,
    topPagesSort,
    handleGoalsFilterChange,
    handleTopSourcesFilterChange,
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleGoalsSort,
    handleTopSourcesSort,
    handleContentGroupsSort,
    handleTopPagesSort,
    isLoading,
    isFetching,
    error: null,
    refetch,
    hasChartData,
    hasGoalsData,
    hasTopSourcesData,
    hasContentGroupsData,
    hasTopPagesData,
    hasChannelsData,
    loadingState,
  }
}
