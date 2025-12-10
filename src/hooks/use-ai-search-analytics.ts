import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo } from "react"

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months"

interface AITrendValue {
  Total: string
  Diff: string
  Trend: "up" | "down"
}

interface AISourceData {
  Source: string
  Total: string
  Diff: string
  Trend: "up" | "down"
}

interface AITimeSeriesPoint {
  Date: string
  Value: number
}

interface AISearchApiResponse {
  err?: boolean
  message?: string
  data?: string
}

interface AISearchParsedData {
  AITraffic: string
  TotalTraffic: string
  AIKeyEvents: string
  timeSeriesDatedValues: string
  trafficByAISource: string
}

export interface AITrafficMetric {
  label: string
  value: string | number
  change: number
}

export interface AIChartDataPoint {
  date: string
  traffic: number
}

export interface AISourceFormatted {
  name: string
  value: number
  change: number
  color: string
}

const SOURCE_COLORS: Record<string, string> = {
  chatgpt: "#171717",
  claude: "#3B82F6",
  perplexity: "#E07A5F",
  gemini: "#22D3EE",
  "bing.com/chat": "#00A4EF",
  bing: "#00A4EF",
}

const DEFAULT_AI_SOURCES = [
  { key: "chatgpt", name: "ChatGPT", color: "#171717" },
  { key: "claude", name: "Claude", color: "#3B82F6" },
  { key: "perplexity", name: "Perplexity", color: "#E07A5F" },
  { key: "gemini", name: "Gemini", color: "#22D3EE" },
  { key: "bing.com/chat", name: "Bing", color: "#00A4EF" },
]

function parsePercentageChange(diff: string, trend: "up" | "down"): number {
  if (!diff) return 0
  const numericValue = parseFloat(diff.replace("%", ""))
  const value = isNaN(numericValue) ? 0 : Math.round(numericValue)
  return trend === "down" ? -value : value
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

function getSourceColor(source: string): string {
  const normalizedSource = source.toLowerCase()
  return SOURCE_COLORS[normalizedSource] || "#737373"
}

export function useAISearchAnalytics(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AISearchApiResponse>({
    queryKey: ["ai-search-analytics", businessUniqueId, website, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website")
      }

      const payload = {
        uniqueId: businessUniqueId,
        website: website,
        origin: "ui",
        Period: period,
        mode: "changemetric",
        dimensions: [
          { name: "date" },
          { name: "sessionSource" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "keyEvents" },
        ],
      }

      const response = await api.post<AISearchApiResponse>(
        "/fetch-ai-search-data",
        "node",
        payload
      )

      if (response.err) {
        throw new Error(response.message || "Failed to fetch AI search data")
      }

      return response
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const parsedData = useMemo<AISearchParsedData | null>(() => {
    if (!rawData?.data) return null
    try {
      return JSON.parse(rawData.data)
    } catch {
      return null
    }
  }, [rawData])

  const aiTrafficMetric = useMemo<AITrendValue | null>(() => {
    if (!parsedData?.AITraffic) return null
    try {
      return JSON.parse(parsedData.AITraffic)
    } catch {
      return null
    }
  }, [parsedData])

  const totalTrafficMetric = useMemo<AITrendValue | null>(() => {
    if (!parsedData?.TotalTraffic) return null
    try {
      return JSON.parse(parsedData.TotalTraffic)
    } catch {
      return null
    }
  }, [parsedData])

  const aiKeyEventsMetric = useMemo<AITrendValue | null>(() => {
    if (!parsedData?.AIKeyEvents) return null
    try {
      return JSON.parse(parsedData.AIKeyEvents)
    } catch {
      return null
    }
  }, [parsedData])

  const chartData = useMemo<AIChartDataPoint[]>(() => {
    if (!parsedData?.timeSeriesDatedValues) return []
    try {
      const timeSeriesData: AITimeSeriesPoint[] = JSON.parse(parsedData.timeSeriesDatedValues)
      if (!Array.isArray(timeSeriesData)) return []

      return timeSeriesData
        .sort((a, b) => {
          const dateA = parseInt(a.Date, 10) || 0
          const dateB = parseInt(b.Date, 10) || 0
          return dateA - dateB
        })
        .map((point) => ({
          date: formatDate(point.Date),
          traffic: point.Value || 0,
        }))
    } catch {
      return []
    }
  }, [parsedData])

  const aiSourcesData = useMemo<AISourceFormatted[]>(() => {
    const apiSourcesMap = new Map<string, AISourceFormatted>()

    if (parsedData?.trafficByAISource) {
      try {
        const sourcesData: AISourceData[] = JSON.parse(parsedData.trafficByAISource)
        if (Array.isArray(sourcesData)) {
          sourcesData.forEach((source) => {
            const normalizedKey = source.Source.toLowerCase()
            apiSourcesMap.set(normalizedKey, {
              name: source.Source.charAt(0).toUpperCase() + source.Source.slice(1),
              value: parseInt(source.Total.replace(/,/g, ""), 10) || 0,
              change: parsePercentageChange(source.Diff, source.Trend),
              color: getSourceColor(source.Source),
            })
          })
        }
      } catch {
        // ignore parse errors
      }
    }

    const result: AISourceFormatted[] = DEFAULT_AI_SOURCES.map((defaultSource) => {
      const existingSource = apiSourcesMap.get(defaultSource.key) ||
        apiSourcesMap.get(defaultSource.name.toLowerCase())

      if (existingSource) {
        return {
          ...existingSource,
          name: defaultSource.name,
        }
      }

      return {
        name: defaultSource.name,
        value: 0,
        change: 0,
        color: defaultSource.color,
      }
    })

    return result.sort((a, b) => b.value - a.value)
  }, [parsedData])

  const normalizedSourcesData = useMemo(() => {
    if (aiSourcesData.length === 0) return []

    const maxValue = Math.max(...aiSourcesData.map((d) => d.value || 0))
    if (maxValue === 0) return aiSourcesData.map((item) => ({ ...item, normalizedValue: 0 }))

    return aiSourcesData.map((item) => ({
      ...item,
      normalizedValue: (item.value / maxValue) * 100,
    }))
  }, [aiSourcesData])

  const metricsForCard = useMemo<AITrafficMetric[]>(() => {
    return [
      {
        label: "AI Traffic",
        value: aiTrafficMetric?.Total || "0",
        change: aiTrafficMetric ? parsePercentageChange(aiTrafficMetric.Diff, aiTrafficMetric.Trend) : 0,
      },
      {
        label: "% Total Traffic",
        value: totalTrafficMetric?.Total || "0%",
        change: totalTrafficMetric ? parsePercentageChange(totalTrafficMetric.Diff, totalTrafficMetric.Trend) : 0,
      },
      {
        label: "AI Goals",
        value: aiKeyEventsMetric?.Total || "0",
        change: aiKeyEventsMetric ? parsePercentageChange(aiKeyEventsMetric.Diff, aiKeyEventsMetric.Trend) : 0,
      },
    ]
  }, [aiTrafficMetric, totalTrafficMetric, aiKeyEventsMetric])

  const hasChartData = chartData.length > 0
  const hasSourcesData = aiSourcesData.length > 0

  return {
    chartData,
    normalizedSourcesData,
    metricsForCard,
    aiSourcesData,
    isLoading,
    isFetching,
    error,
    refetch,
    hasChartData,
    hasSourcesData,
  }
}
