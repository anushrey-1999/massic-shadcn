import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo } from "react"
import { AxiosError } from "axios"

interface HistoryDataPoint {
  topic_coverage: number
  impression_relevance: number
  click_relevance: number
}

interface GapAnalysisApiResponse {
  history?: Record<string, HistoryDataPoint>
  err?: boolean
  message?: string
  detail?: string
}

interface ApiErrorResponse {
  detail?: string
  message?: string
}

export type GapAnalysisStatus =
  | "idle"
  | "loading"
  | "success"
  | "not-found"
  | "no-data"
  | "error"

export interface MetricCardData {
  title: string
  percentage: string
  value: number
  trendData: Array<{ date: string; value: number }>
}

export interface GapAnalysisData {
  topicCoverage: MetricCardData
  visibilityRelevance: MetricCardData
  engagementRelevance: MetricCardData
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateString
  }
}

function extractTrendData(
  history: Record<string, HistoryDataPoint> | undefined,
  metricKey: keyof HistoryDataPoint
): Array<{ date: string; value: number }> {
  if (!history) return []

  try {
    const dates = Object.keys(history).sort()
    return dates.map((date) => {
      const metricValue = history[date]?.[metricKey]
      return {
        date: formatDate(date),
        value: metricValue !== undefined && metricValue !== null
          ? Math.round(metricValue * 100)
          : 0,
      }
    })
  } catch {
    return []
  }
}

function getLatestValue(
  history: Record<string, HistoryDataPoint> | undefined,
  metricKey: keyof HistoryDataPoint
): { percentage: string; value: number } {
  if (!history) return { percentage: "0%", value: 0 }

  const dates = Object.keys(history).sort()
  const latestDate = dates[dates.length - 1]

  if (!latestDate || !history[latestDate]) {
    return { percentage: "0%", value: 0 }
  }

  const rawValue = history[latestDate][metricKey]
  const value = Math.round((rawValue ?? 0) * 100)
  return {
    percentage: `${value}%`,
    value,
  }
}

function calculateChange(trendData: Array<{ date: string; value: number }>): number {
  if (trendData.length < 2) return 0

  const latestValue = trendData[trendData.length - 1]?.value ?? 0
  const previousValue = trendData[0]?.value ?? 0
  console.log("Latest Value:", latestValue, "Previous Value:", previousValue, trendData)
  if (previousValue === 0) return latestValue > 0 ? 100 : 0

  return Math.round(((latestValue - previousValue) / previousValue) * 100)
}

async function fetchGapAnalysis(
  businessId: string
): Promise<GapAnalysisApiResponse> {
  try {
    return await api.get<GapAnalysisApiResponse>(
      `/business-analytics?business_id=${businessId}`,
      "python"
    )
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    if (axiosError.response?.status === 404) {
      return { history: undefined, detail: axiosError.response.data?.detail || "Not found" }
    }
    throw error
  }
}

function isNotFoundResponse(data: GapAnalysisApiResponse | undefined): boolean {
  return !!data?.detail?.toLowerCase().includes("not found")
}

export function useGapAnalysis(businessId: string | null) {
  const {
    data: apiData,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["gap-analysis", businessId],
    queryFn: () => fetchGapAnalysis(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 404) return false
      return failureCount < 2
    },
  })

  const analyticsData = useMemo<GapAnalysisData | null>(() => {
    if (!apiData?.history) return null

    const history = apiData.history

    const topicCoverageTrend = extractTrendData(history, "topic_coverage")
    const visibilityRelevanceTrend = extractTrendData(history, "impression_relevance")
    const engagementRelevanceTrend = extractTrendData(history, "click_relevance")

    const topicCoverageLatest = getLatestValue(history, "topic_coverage")
    const visibilityRelevanceLatest = getLatestValue(history, "impression_relevance")
    const engagementRelevanceLatest = getLatestValue(history, "click_relevance")

    return {
      topicCoverage: {
        title: "Topic Coverage",
        percentage: topicCoverageLatest.percentage,
        value: topicCoverageLatest.value,
        trendData: topicCoverageTrend,
      },
      visibilityRelevance: {
        title: "Visibility Rel.",
        percentage: visibilityRelevanceLatest.percentage,
        value: visibilityRelevanceLatest.value,
        trendData: visibilityRelevanceTrend,
      },
      engagementRelevance: {
        title: "Engagement Rel.",
        percentage: engagementRelevanceLatest.percentage,
        value: engagementRelevanceLatest.value,
        trendData: engagementRelevanceTrend,
      },
    }
  }, [apiData])

  const metricCards = useMemo(() => {
    if (!analyticsData) return []

    return [
      {
        key: "topic-coverage",
        title: analyticsData.topicCoverage.title,
        percentage: analyticsData.topicCoverage.percentage,
        value: analyticsData.topicCoverage.value,
        change: calculateChange(analyticsData.topicCoverage.trendData),
        sparklineData: analyticsData.topicCoverage.trendData.map((d) => d.value),
      },
      {
        key: "visibility-relevance",
        title: analyticsData.visibilityRelevance.title,
        percentage: analyticsData.visibilityRelevance.percentage,
        value: analyticsData.visibilityRelevance.value,
        change: calculateChange(analyticsData.visibilityRelevance.trendData),
        sparklineData: analyticsData.visibilityRelevance.trendData.map((d) => d.value),
      },
      {
        key: "engagement-relevance",
        title: analyticsData.engagementRelevance.title,
        percentage: analyticsData.engagementRelevance.percentage,
        value: analyticsData.engagementRelevance.value,
        change: calculateChange(analyticsData.engagementRelevance.trendData),
        sparklineData: analyticsData.engagementRelevance.trendData.map((d) => d.value),
      },
    ]
  }, [analyticsData])

  const isNotFound = useMemo(() => isNotFoundResponse(apiData), [apiData])

  const hasData = useMemo(() => {
    if (isNotFound) return false
    if (!apiData?.history) return false
    return Object.keys(apiData.history).length > 0
  }, [apiData, isNotFound])

  const status = useMemo<GapAnalysisStatus>(() => {
    if (!businessId) return "idle"
    if (isLoading || isFetching) return "loading"
    if (isError) return "error"
    if (isNotFound) return "not-found"
    if (!hasData) return "no-data"
    return "success"
  }, [businessId, isLoading, isFetching, isError, isNotFound, hasData])

  const statusMessage = useMemo(() => {
    switch (status) {
      case "idle":
        return "Select a business to view gap analysis"
      case "loading":
        return "Analyzing your content performance..."
      case "not-found":
        return "Gap analysis not yet available for this business."
      case "no-data":
        return "No gap analysis data available yet. Check back later."
      case "error":
        return "Unable to load gap analysis. Please try again later."
      case "success":
        return ""
      default:
        return ""
    }
  }, [status])

  return {
    analyticsData,
    metricCards,
    isLoading: isLoading || isFetching,
    isError,
    error,
    hasData,
    status,
    statusMessage,
    isNotFound,
  }
}
