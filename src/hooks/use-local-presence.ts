import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo } from "react"

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months"

interface TrendValue {
  Total: string
  Diff: string
  Trend: "up" | "down"
}

interface TimeSeriesPoint {
  Date: string
  Value: number
}

interface QueryRow {
  Query: string
  Value: number
}

interface ReviewsData {
  alltimereviews: TrendValue
  alltimerating: TrendValue
  ratingspast: TrendValue
  reviewspast: TrendValue
}

interface LocalPresenceApiResponse {
  interactions?: string
  queries?: string
  reviews?: string
}

export interface InteractionChartDataPoint {
  date: string
  interactions: number
}

export interface QueryDataItem {
  queries: string
  searches: { value: number }
}

export interface InteractionMetric {
  label: string
  value: string | number
  change: number
}

export interface ReviewMetrics {
  avgRating: {
    value: number
    change: number
  }
  allTimeReviews: {
    value: string
    change: number
  }
  ratingsPast: {
    value: string
    change: number
  }
}

function parsePercentageChange(diff: string, trend: "up" | "down"): number {
  if (!diff) return 0
  const numericValue = parseFloat(diff.replace("%", ""))
  const value = isNaN(numericValue) ? 0 : Math.round(numericValue * 10) / 10
  return trend === "down" ? -value : value
}

function formatDate(dateString: string): string {
  if (!dateString || dateString.length !== 8) return dateString
  try {
    const day = dateString.slice(0, 2)
    const month = dateString.slice(2, 4)
    const year = dateString.slice(4, 8)
    const date = new Date(`${year}-${month}-${day}`)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

export function useLocalPresence(
  businessUniqueId: string | null,
  period: TimePeriodValue = "3 months",
  location: string = ""
) {
  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<LocalPresenceApiResponse>({
    queryKey: ["local-presence", businessUniqueId, period, location],
    queryFn: async () => {
      if (!businessUniqueId) {
        throw new Error("Missing business ID")
      }

      const response = await api.get<LocalPresenceApiResponse>(
        `/Review/FetchLocalPresence?uniqueId=${businessUniqueId}&period=${period}&location=${encodeURIComponent(location)}`,
        "dotnet"
      )

      return response
    },
    enabled: !!businessUniqueId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const interactionsData = useMemo(() => {
    if (!rawData?.interactions) {
      return {
        chartData: [] as InteractionChartDataPoint[],
        metric: { label: "Total Interactions", value: "0", change: 0 } as InteractionMetric,
      }
    }

    try {
      const parsed = JSON.parse(rawData.interactions)
      if (parsed?.err) {
        return {
          chartData: [] as InteractionChartDataPoint[],
          metric: { label: "Total Interactions", value: "0", change: 0 } as InteractionMetric,
        }
      }

      const timeSeriesData: TimeSeriesPoint[] = JSON.parse(parsed.timeSeriesDatedValues || "[]")
      const totalInteractions: TrendValue = JSON.parse(parsed.totalinteractions || "{}")

      const chartData: InteractionChartDataPoint[] = timeSeriesData.map((point) => ({
        date: formatDate(point.Date),
        interactions: point.Value ?? 0,
      }))

      const metric: InteractionMetric = {
        label: "Interactions",
        value: totalInteractions.Total || "0",
        change: parsePercentageChange(totalInteractions.Diff || "0%", totalInteractions.Trend || "down"),
      }

      return { chartData, metric }
    } catch {
      return {
        chartData: [] as InteractionChartDataPoint[],
        metric: { label: "Total Interactions", value: "0", change: 0 } as InteractionMetric,
      }
    }
  }, [rawData])

  const queriesData = useMemo<QueryDataItem[]>(() => {
    if (!rawData?.queries) return []

    try {
      const parsed = JSON.parse(rawData.queries)
      const rows: QueryRow[] = JSON.parse(parsed.rows || "[]")

      return rows.map((row) => ({
        queries: row.Query,
        searches: { value: row.Value },
      }))
    } catch {
      return []
    }
  }, [rawData])

  const reviewsData = useMemo<ReviewMetrics>(() => {
    const defaultMetrics: ReviewMetrics = {
      avgRating: { value: 0, change: 0 },
      allTimeReviews: { value: "0", change: 0 },
      ratingsPast: { value: "0", change: 0 },
    }

    if (!rawData?.reviews) return defaultMetrics

    try {
      const parsed: ReviewsData = JSON.parse(rawData.reviews)

      return {
        avgRating: {
          value: parseFloat(parsed.ratingspast?.Total || "0") || 0,
          change: parsePercentageChange(parsed.ratingspast?.Diff || "0%", parsed.ratingspast?.Trend || "down"),
        },
        allTimeReviews: {
          value: parsed.alltimereviews?.Total || "0",
          change: parsePercentageChange(parsed.alltimereviews?.Diff || "0%", parsed.alltimereviews?.Trend || "down"),
        },
        ratingsPast: {
          value: parsed.ratingspast?.Total || "0",
          change: parsePercentageChange(parsed.ratingspast?.Diff || "0%", parsed.ratingspast?.Trend || "down"),
        },
      }
    } catch {
      return defaultMetrics
    }
  }, [rawData])

  return {
    interactionsChartData: interactionsData.chartData,
    interactionsMetric: interactionsData.metric,
    queriesData,
    reviewsData,
    isLoading: isLoading || isFetching,
    hasInteractionsData: interactionsData.chartData.length > 0,
    hasQueriesData: queriesData.length > 0,
    hasReviewsData: !!rawData?.reviews,
    error,
    refetch,
  }
}
