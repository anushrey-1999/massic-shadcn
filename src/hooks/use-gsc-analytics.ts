import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback } from "react"

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
export type SortColumn = "impressions" | "clicks"
export type SortDirection = "asc" | "desc"

interface TrendDetail {
  Total: string
  Diff: string
  Trend: "up" | "down"
}

interface TrendStats {
  Item: string
  Tag: string
  Trend: "up" | "down" | "neutral"
  Previous: string
  Percentage: string
  Diff: string
}

export interface GSCTrendData {
  Clk: TrendDetail
  Imp: TrendDetail
  goals?: TrendDetail
}

export interface GSCChartDataPoint {
  date: string
  impressions: number
  clicks: number
  goals?: number
}

export interface GSCFunnelData {
  impressions: { Value: number; Percentage: string }
  clicks: { Value: number; Percentage: string }
  cnv: { Value: number; Percentage: string }
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

interface GSCDataRow {
  keys: string[]
  impressions: number
  clicks: number
  goal?: number
}

interface GSCTableRow {
  keys: string[]
  impressions: string | number
  clicks: string | number
  ctr: string | number
  position: string | number
  Group: "Popular" | "Growing" | "Decaying"
  status1?: TrendStats
  status2?: TrendStats
  stats1?: TrendStats
  stats2?: TrendStats
}

export interface GSCTableDataFormatted {
  key: string
  impressions: { value: string | number; change: number }
  clicks: { value: string | number; change: number }
}

interface GSCTableResponse {
  rows: GSCTableRow[]
}

interface GSCDateResponse {
  rows: GSCDataRow[]
}

interface GSCApiResponse {
  err?: boolean
  message?: string
  data: Array<
    | { date: string }
    | { page: string }
    | { query: string }
    | { queryclusters: string }
    | { contentgroups: string }
  >
  cards?: string
  trenddata?: string
  funnelData?: string
}

function parsePercentageChange(diff: string): number {
  if (!diff) return 0
  const numericValue = parseFloat(diff.replace("%", ""))
  return isNaN(numericValue) ? 0 : Math.round(numericValue)
}

function formatNumber(value: number | string): string {
  if (typeof value === "string") {
    // If already has K/M suffix, return as-is
    if (/[KMkm]$/.test(value.trim())) {
      return value
    }
    // Remove any commas before parsing
    const cleanValue = value.replace(/,/g, "")
    const num = parseFloat(cleanValue)
    if (isNaN(num)) return "0"
    if (num >= 1000000) {
      const formatted = (num / 1000000).toFixed(1)
      return `${formatted}M`
    }
    if (num >= 1000) {
      const formatted = (num / 1000).toFixed(1)
      return `${formatted}K`
    }
    return num.toLocaleString()
  }
  const num = value
  if (isNaN(num)) return "0"
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1)
    return `${formatted}M`
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1)
    return `${formatted}K`
  }
  return num.toLocaleString()
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

export function useGSCAnalytics(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const [contentGroupsFilter, setContentGroupsFilter] = useState<TableFilterType>("popular")
  const [topPagesFilter, setTopPagesFilter] = useState<TableFilterType>("popular")
  const [topQueriesFilter, setTopQueriesFilter] = useState<TableFilterType>("popular")

  const [contentGroupsSort, setContentGroupsSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })
  const [topPagesSort, setTopPagesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })
  const [topQueriesSort, setTopQueriesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" })

  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<GSCApiResponse>({
    queryKey: ["gsc-analytics", businessUniqueId, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website")
      }

      const payload = {
        uniqueId: businessUniqueId,
        website: website,
        origin: "ui",
        Period: period,
        dimensions: ["date", "page", "query"],
      }

      const response = await api.post<GSCApiResponse>(
        "/fetch-gcs-data",
        "node",
        payload
      )

      if (response.err) {
        throw new Error(response.message || "Failed to fetch GSC data")
      }

      return response
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const chartData = useMemo<GSCChartDataPoint[]>(() => {
    if (!rawData?.data) return []

    const dateItem = rawData.data.find(
      (item): item is { date: string } => "date" in item
    )
    if (!dateItem?.date) return []

    try {
      const parsed: GSCDateResponse = JSON.parse(dateItem.date)
      if (!parsed.rows || !Array.isArray(parsed.rows)) return []

      return parsed.rows.map((row) => ({
        date: formatDate(row.keys?.[0] ?? ""),
        impressions: row.impressions ?? 0,
        clicks: row.clicks ?? 0,
        goals: row.goal,
      }))
    } catch {
      return []
    }
  }, [rawData])

  const trendData = useMemo<GSCTrendData>(() => {
    const defaultTrend: GSCTrendData = {
      Clk: { Total: "0", Diff: "0%", Trend: "down" },
      Imp: { Total: "0", Diff: "0%", Trend: "down" },
    }

    if (!rawData?.trenddata) return defaultTrend

    try {
      const parsed = JSON.parse(rawData.trenddata)
      return {
        Clk: parsed.Clk || defaultTrend.Clk,
        Imp: parsed.Imp || defaultTrend.Imp,
        goals: parsed.goals,
      }
    } catch {
      return defaultTrend
    }
  }, [rawData])

  const funnelData = useMemo<GSCFunnelData | null>(() => {
    if (!rawData?.funnelData) return null

    try {
      const parsed = JSON.parse(rawData.funnelData)
      if (!parsed.impressions || !parsed.clicks || !parsed.cnv) return null
      return parsed
    } catch {
      return null
    }
  }, [rawData])

  const chartLegendItems = useMemo<ChartLegendItem[]>(() => {
    return [
      {
        key: "impressions",
        icon: null,
        value: formatNumber(trendData.Imp.Total),
        change: parsePercentageChange(trendData.Imp.Diff),
        checked: true,
      },
      {
        key: "clicks",
        icon: null,
        value: formatNumber(trendData.Clk.Total),
        change: parsePercentageChange(trendData.Clk.Diff),
        checked: true,
      },
      ...(trendData.goals
        ? [
          {
            key: "goals",
            icon: null,
            value: formatNumber(trendData.goals.Total),
            change: parsePercentageChange(trendData.goals.Diff),
            checked: true,
          },
        ]
        : []),
    ]
  }, [trendData])

  const funnelChartItems = useMemo<FunnelChartItem[]>(() => {
    if (!funnelData) return []

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
        percentage: "",
      },
    ]
  }, [funnelData])

  const chartConfig = useMemo(
    () => ({
      impressions: { label: "Impressions", color: "#6b7280" },
      clicks: { label: "Clicks", color: "#2563eb" },
      goals: { label: "Goals", color: "#059669" },
    }),
    []
  )

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return []

    const impressionsValues = chartData.map((d) => d.impressions || 0)
    const clicksValues = chartData.map((d) => d.clicks || 0)
    const goalsValues = chartData.map((d) => d.goals || 0)

    const minImpressions = Math.min(...impressionsValues)
    const maxImpressions = Math.max(...impressionsValues)
    const minClicks = Math.min(...clicksValues)
    const maxClicks = Math.max(...clicksValues)
    const minGoals = Math.min(...goalsValues)
    const maxGoals = Math.max(...goalsValues)

    const scaleValueToBand = (value: number, min: number, max: number, bandStart: number, bandEnd: number): number => {
      const numericValue = Number(value) || 0
      if (numericValue === 0) return 0
      if (max === min) return (bandStart + bandEnd) / 2
      const normalized = (numericValue - min) / (max - min)
      return bandStart + normalized * (bandEnd - bandStart)
    }

    return chartData.map((point) => ({
      ...point,
      impressionsNorm: scaleValueToBand(point.impressions, minImpressions, maxImpressions, 60, 100),
      clicksNorm: scaleValueToBand(point.clicks, minClicks, maxClicks, 30, 70),
      goalsNorm: scaleValueToBand(point.goals || 0, minGoals, maxGoals, 0, 40),
    }))
  }, [chartData])

  const hasData = chartData.length > 0
  const hasFunnelData = funnelData !== null

  const parseTableData = useCallback((jsonString: string): GSCTableRow[] => {
    try {
      const parsed: GSCTableResponse = JSON.parse(jsonString)
      if (!parsed.rows || !Array.isArray(parsed.rows)) return []
      return parsed.rows
    } catch {
      return []
    }
  }, [])

  const contentGroupsRawData = useMemo<GSCTableRow[]>(() => {
    if (!rawData?.data) return []
    const item = rawData.data.find(
      (d): d is { contentgroups: string } => "contentgroups" in d
    )
    if (!item?.contentgroups) return []
    return parseTableData(item.contentgroups)
  }, [rawData, parseTableData])

  const topPagesRawData = useMemo<GSCTableRow[]>(() => {
    if (!rawData?.data) return []
    const item = rawData.data.find(
      (d): d is { page: string } => "page" in d
    )
    if (!item?.page) return []
    return parseTableData(item.page)
  }, [rawData, parseTableData])

  const topQueriesRawData = useMemo<GSCTableRow[]>(() => {
    if (!rawData?.data) return []
    const item = rawData.data.find(
      (d): d is { query: string } => "query" in d
    )
    if (!item?.query) return []
    return parseTableData(item.query)
  }, [rawData, parseTableData])

  const parseNumericValue = useCallback((value: string | number): number => {
    if (typeof value === "number") return value
    const cleanValue = value.replace(/[,%]/g, "")
    if (cleanValue.endsWith("K")) {
      return parseFloat(cleanValue) * 1000
    }
    if (cleanValue.endsWith("M")) {
      return parseFloat(cleanValue) * 1000000
    }
    return parseFloat(cleanValue) || 0
  }, [])

  const filterAndSortTableData = useCallback((
    data: GSCTableRow[],
    filter: TableFilterType,
    sort: { column: SortColumn; direction: SortDirection }
  ): GSCTableDataFormatted[] => {
    const filterMap: Record<TableFilterType, string> = {
      popular: "Popular",
      growing: "Growing",
      decaying: "Decaying",
    }

    let filteredData = filter === "popular"
      ? data
      : data.filter((item) => item.Group === filterMap[filter])

    filteredData = [...filteredData].sort((a, b) => {
      const aValue = parseNumericValue(a[sort.column])
      const bValue = parseNumericValue(b[sort.column])
      return sort.direction === "desc" ? bValue - aValue : aValue - bValue
    })

    return filteredData.map((row) => {
      const impStats = row.status2 || row.stats2
      const clickStats = row.status1 || row.stats1

      const impressionsChange = impStats
        ? parsePercentageChange(impStats.Percentage) * (impStats.Trend === "down" ? -1 : 1)
        : 0
      const clicksChange = clickStats
        ? parsePercentageChange(clickStats.Percentage) * (clickStats.Trend === "down" ? -1 : 1)
        : 0

      return {
        key: row.keys?.[0] || "",
        impressions: {
          value: row.impressions,
          change: impressionsChange,
        },
        clicks: {
          value: row.clicks,
          change: clicksChange,
        },
      }
    })
  }, [parseNumericValue])

  const contentGroupsData = useMemo(() => {
    return filterAndSortTableData(contentGroupsRawData, contentGroupsFilter, contentGroupsSort)
  }, [contentGroupsRawData, contentGroupsFilter, contentGroupsSort, filterAndSortTableData])

  const topPagesData = useMemo(() => {
    return filterAndSortTableData(topPagesRawData, topPagesFilter, topPagesSort)
  }, [topPagesRawData, topPagesFilter, topPagesSort, filterAndSortTableData])

  const topQueriesData = useMemo(() => {
    return filterAndSortTableData(topQueriesRawData, topQueriesFilter, topQueriesSort)
  }, [topQueriesRawData, topQueriesFilter, topQueriesSort, filterAndSortTableData])

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
    setTopQueriesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }, [])

  const hasContentGroupsData = contentGroupsRawData.length > 0
  const hasTopPagesData = topPagesRawData.length > 0
  const hasTopQueriesData = topQueriesRawData.length > 0

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
