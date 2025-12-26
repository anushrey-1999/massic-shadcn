import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback } from "react"

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months"
export type TableFilterType = "popular" | "growing" | "decaying"
export type GA4SortColumn = "sessions" | "goals"
export type SortDirection = "asc" | "desc"

interface GA4MetricValue {
  Item: string
  Value: string
  Diff: string
  Trend: "up" | "down"
  Tag?: string
}

interface GA4TableRow {
  "Landing page"?: string
  sessionSource?: string
  pagePath?: string
  eventName?: string
  Group?: "Growing" | "Decaying"
  Sessions?: GA4MetricValue
  "Key events"?: GA4MetricValue
  sessions?: GA4MetricValue
  keyEvents?: GA4MetricValue
  [key: string]: any
}

interface GA4ChannelRow {
  "FirstUser DefaultChannelGroup": string
  curData: {
    Sessions: string
    "Key events": string
  }
}

interface GA4ChartDataPoint {
  curDate: string
  preDate: string
  curData: {
    Sessions?: string
    keyEvents?: string
    [key: string]: any
  }
  preData: {
    Sessions?: string
    keyEvents?: string
    [key: string]: any
  }
}

interface GA4MainStats {
  Sessions: {
    Total: string
    Diff: string
    Trend: "up" | "down"
  }
  keyEvents: {
    Total: string
    Diff: string
    Trend: "up" | "down"
  }
}

interface GA4DateData {
  data: string
  mainStats: string
}

export interface GA4ApiResponse {
  err?: boolean
  message?: string
  date?: GA4DateData
  landingPage?: string
  landingPageContentGroup?: string
  firstUserDefaultChannelGroup?: string
  sessionSource?: string
  pagePath?: string
  eventName?: string
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

function parsePercentageChange(diff: string, trend: "up" | "down"): number {
  if (!diff) return 0
  const numericValue = parseFloat(diff.replace("%", ""))
  const value = isNaN(numericValue) ? 0 : Math.round(numericValue)
  return trend === "down" ? -value : value
}

function formatNumber(value: number | string): string {
  if (typeof value === "string") {
    if (/[KMkm]$/.test(value.trim())) {
      return value
    }
    const cleanValue = value.replace(/,/g, "")
    const num = parseFloat(cleanValue)
    if (isNaN(num)) return "0"
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }
  if (isNaN(value)) return "0"
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

function formatDate(dateString: string): string {
  if (!dateString || dateString.length !== 8) return dateString
  try {
    const year = dateString.slice(0, 4)
    const month = dateString.slice(4, 6)
    const day = dateString.slice(6, 8)
    const date = new Date(`${year}-${month}-${day}`)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

function parseNumericValue(value: string | number): number {
  if (typeof value === "number") return value
  const cleanValue = String(value).replace(/[,%]/g, "")
  if (cleanValue.endsWith("K")) {
    return parseFloat(cleanValue) * 1000
  }
  if (cleanValue.endsWith("M")) {
    return parseFloat(cleanValue) * 1000000
  }
  return parseFloat(cleanValue) || 0
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

  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<GA4ApiResponse>({
    queryKey: ["ga4-analytics", businessUniqueId, website, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website")
      }

      const payload = {
        uniqueId: businessUniqueId,
        website: website,
        origin: "ui",
        period: period,
        mode: "changemetric",
        dimensions: [
          {
            name: "landingPage",
            metrics: [
              { name: "sessions" },
              { name: "engagementRate" },
              { name: "bounceRate" },
              { name: "keyEvents" },
            ],
          },
          {
            name: "firstUserDefaultChannelGroup",
            metrics: [
              { name: "sessions" },
              { name: "keyEvents" },
            ],
          },
          {
            name: "date",
            metrics: [
              { name: "Key events" },
              { name: "Sessions" },
            ],
          },
          {
            name: "eventName",
            metrics: [{ name: "keyEvents" }],
          },
          {
            name: "sessionSource",
            metrics: [
              { name: "sessions" },
              { name: "keyEvents" },
            ],
          },
          {
            name: "pagePath",
            metrics: [
              { name: "sessions" },
              { name: "keyEvents" },
            ],
          },
        ],
      }

      const response = await api.post<GA4ApiResponse>(
        "/fetch-ga4-data",
        "node",
        payload
      )

      if (response.err) {
        throw new Error(response.message || "Failed to fetch GA4 data")
      }

      return response
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const chartData = useMemo<GA4ChartDataFormatted[]>(() => {
    if (!rawData?.date?.data) return []

    try {
      const parsed: GA4ChartDataPoint[] = JSON.parse(rawData.date.data)
      if (!Array.isArray(parsed)) return []

      return parsed.map((point) => ({
        date: formatDate(point.curDate),
        sessions: parseInt(point.curData?.Sessions || "0", 10),
        goals: parseInt(point.curData?.keyEvents || "0", 10),
      }))
    } catch {
      return []
    }
  }, [rawData])

  const mainStats = useMemo<GA4MainStats | null>(() => {
    if (!rawData?.date?.mainStats) return null

    try {
      return JSON.parse(rawData.date.mainStats)
    } catch {
      return null
    }
  }, [rawData])

  const sessionsMetric = useMemo(() => {
    if (!mainStats?.Sessions) {
      return { value: "0", change: 0 }
    }
    return {
      value: formatNumber(mainStats.Sessions.Total),
      change: parsePercentageChange(mainStats.Sessions.Diff, mainStats.Sessions.Trend),
    }
  }, [mainStats])

  const goalsMetric = useMemo(() => {
    if (!mainStats?.keyEvents) {
      return { value: "0", change: 0 }
    }
    return {
      value: formatNumber(mainStats.keyEvents.Total),
      change: parsePercentageChange(mainStats.keyEvents.Diff, mainStats.keyEvents.Trend),
    }
  }, [mainStats])

  const parseTableData = useCallback((jsonString: string | undefined): GA4TableRow[] => {
    if (!jsonString) return []
    try {
      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  }, [])

  const goalsRawData = useMemo<GA4TableRow[]>(() => {
    return parseTableData(rawData?.eventName)
  }, [rawData, parseTableData])

  const topSourcesRawData = useMemo<GA4TableRow[]>(() => {
    return parseTableData(rawData?.sessionSource)
  }, [rawData, parseTableData])

  const contentGroupsRawData = useMemo<GA4TableRow[]>(() => {
    return parseTableData(rawData?.landingPageContentGroup)
  }, [rawData, parseTableData])

  const topPagesRawData = useMemo<GA4TableRow[]>(() => {
    return parseTableData(rawData?.pagePath)
  }, [rawData, parseTableData])

  const channelsRawData = useMemo<GA4ChannelRow[]>(() => {
    if (!rawData?.firstUserDefaultChannelGroup) return []
    try {
      const parsed = JSON.parse(rawData.firstUserDefaultChannelGroup)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  }, [rawData])

  const filterAndSortTableData = useCallback((
    data: GA4TableRow[],
    filter: TableFilterType,
    sort: { column: GA4SortColumn; direction: SortDirection },
    keyField: string
  ): GA4TableDataFormatted[] => {
    const filterMap: Record<TableFilterType, string> = {
      popular: "Popular",
      growing: "Growing",
      decaying: "Decaying",
    }

    let filteredData = filter === "popular"
      ? data
      : data.filter((item) => item.Group === filterMap[filter])

    filteredData = [...filteredData].sort((a, b) => {
      const aValue = parseNumericValue(
        sort.column === "sessions"
          ? (a.Sessions?.Value || a.sessions?.Value || "0")
          : (a["Key events"]?.Value || a.keyEvents?.Value || "0")
      )
      const bValue = parseNumericValue(
        sort.column === "sessions"
          ? (b.Sessions?.Value || b.sessions?.Value || "0")
          : (b["Key events"]?.Value || b.keyEvents?.Value || "0")
      )
      return sort.direction === "desc" ? bValue - aValue : aValue - bValue
    })

    return filteredData.map((row) => {
      const sessionsData = row.Sessions || row.sessions
      const goalsData = row["Key events"] || row.keyEvents

      return {
        key: row[keyField] || "",
        sessions: {
          value: sessionsData?.Value || "0",
          change: sessionsData ? parsePercentageChange(sessionsData.Diff, sessionsData.Trend) : 0,
        },
        goals: {
          value: goalsData?.Value || "0",
          change: goalsData ? parsePercentageChange(goalsData.Diff, goalsData.Trend) : 0,
        },
      }
    })
  }, [])

  const filterAndSortGoalsData = useCallback((
    data: GA4TableRow[],
    filter: TableFilterType,
    sort: { column: GA4SortColumn; direction: SortDirection }
  ): GA4GoalDataFormatted[] => {
    const filterMap: Record<TableFilterType, string> = {
      popular: "Popular",
      growing: "Growing",
      decaying: "Decaying",
    }

    let filteredData = filter === "popular"
      ? data
      : data.filter((item) => item.Group === filterMap[filter])

    filteredData = [...filteredData].sort((a, b) => {
      const aValue = parseNumericValue(a.keyEvents?.Value || "0")
      const bValue = parseNumericValue(b.keyEvents?.Value || "0")
      return sort.direction === "desc" ? bValue - aValue : aValue - bValue
    })

    return filteredData.map((row) => {
      const goalsData = row.keyEvents

      return {
        goal: row.eventName || "",
        goals: {
          value: parseNumericValue(goalsData?.Value || "0"),
          change: goalsData ? parsePercentageChange(goalsData.Diff, goalsData.Trend) : 0,
        },
      }
    })
  }, [])

  const goalsData = useMemo(() => {
    return filterAndSortGoalsData(goalsRawData, goalsFilter, goalsSort)
  }, [goalsRawData, goalsFilter, goalsSort, filterAndSortGoalsData])

  const topSourcesData = useMemo(() => {
    return filterAndSortTableData(topSourcesRawData, topSourcesFilter, topSourcesSort, "sessionSource")
  }, [topSourcesRawData, topSourcesFilter, topSourcesSort, filterAndSortTableData])

  const contentGroupsData = useMemo(() => {
    return filterAndSortTableData(contentGroupsRawData, contentGroupsFilter, contentGroupsSort, "Landing page")
  }, [contentGroupsRawData, contentGroupsFilter, contentGroupsSort, filterAndSortTableData])

  const topPagesData = useMemo(() => {
    return filterAndSortTableData(topPagesRawData, topPagesFilter, topPagesSort, "pagePath")
  }, [topPagesRawData, topPagesFilter, topPagesSort, filterAndSortTableData])

  const channelsData = useMemo<GA4ChannelDataFormatted[]>(() => {
    return channelsRawData.map((item) => ({
      name: item["FirstUser DefaultChannelGroup"] || "",
      sessions: parseInt(item.curData?.Sessions || "0", 10),
      goals: parseInt(item.curData?.["Key events"] || "0", 10),
    })).sort((a, b) => b.sessions - a.sessions)
  }, [channelsRawData])

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

  const hasChartData = chartData.length > 0
  const hasGoalsData = goalsRawData.length > 0
  const hasTopSourcesData = topSourcesRawData.length > 0
  const hasContentGroupsData = contentGroupsRawData.length > 0
  const hasTopPagesData = topPagesRawData.length > 0
  const hasChannelsData = channelsRawData.length > 0

  return {
    chartData,
    normalizedChartData,
    normalizedChannelsData,
    sessionsMetric,
    goalsMetric,
    mainStats,
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
    error,
    refetch,
    hasChartData,
    hasGoalsData,
    hasTopSourcesData,
    hasContentGroupsData,
    hasTopPagesData,
    hasChannelsData,
  }
}
