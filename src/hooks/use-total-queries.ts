import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useMemo, useState, useCallback } from "react"
import type { TimePeriodValue } from "@/hooks/use-gsc-analytics"

interface CardValue {
  Item: string
  Tag?: string
  Trend?: "up" | "down" | "neutral"
  Previous?: string
  Total?: string
  Percentage: string
  Diff: string
}

interface TimeSeriesData {
  Date: string
  Pos1_3: number
  Pos4_20: number
  Pos20_Plus: number
}

interface TotalQueriesResponse {
  err?: boolean
  msg?: string
  message?: string
  cardValues?: string
  timeSeriesDatedValues?: string
}

export interface PositionCardData {
  label: string
  value: number
  change: number
  key: string
}

export interface PositionChartData {
  date: string
  pos1_3: number
  pos4_20: number
  pos20_plus: number
}

function parsePercentageChange(diff: string): number {
  if (!diff) return 0
  const numericValue = parseFloat(diff.replace("%", ""))
  return isNaN(numericValue) ? 0 : Math.round(numericValue)
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

export function useTotalQueries(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    pos1_3: true,
    pos4_20: true,
    pos20_plus: true,
  })

  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<TotalQueriesResponse>({
    queryKey: ["total-queries", businessUniqueId, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website")
      }

      const payload = {
        uniqueId: businessUniqueId,
        website: website,
        origin: "ui",
        Period: period,
        dimensions: ["query"],
      }

      const response = await api.post<TotalQueriesResponse>(
        "/fetch-total-queries",
        "node",
        payload
      )

      if (response.err) {
        throw new Error(response.msg || response.message || "Failed to fetch total queries data")
      }

      return response
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const positionCards = useMemo<PositionCardData[]>(() => {
    if (!rawData?.cardValues) return []

    try {
      const parsed: CardValue[] = JSON.parse(rawData.cardValues)
      const output: Record<string, CardValue> = {}

      parsed.forEach(({ Item, ...rest }) => {
        output[Item] = { Item, ...rest }
      })

      const cards: PositionCardData[] = []

      if (output["Pos1_3"]) {
        cards.push({
          key: "pos1_3",
          label: "Pos 1-3",
          value: parseInt(output["Pos1_3"].Diff?.replace(/[^0-9-]/g, "") || "0", 10) || 0,
          change: parsePercentageChange(output["Pos1_3"].Percentage),
        })
      }

      if (output["Pos4_20"]) {
        cards.push({
          key: "pos4_20",
          label: "Pos 4-20",
          value: parseInt(output["Pos4_20"].Diff?.replace(/[^0-9-]/g, "") || "0", 10) || 0,
          change: parsePercentageChange(output["Pos4_20"].Percentage),
        })
      }

      if (output["Pos20_Plus"]) {
        cards.push({
          key: "pos20_plus",
          label: "Pos 20+",
          value: parseInt(output["Pos20_Plus"].Diff?.replace(/[^0-9-]/g, "") || "0", 10) || 0,
          change: parsePercentageChange(output["Pos20_Plus"].Percentage),
        })
      }

      return cards
    } catch {
      return []
    }
  }, [rawData])

  const chartData = useMemo<PositionChartData[]>(() => {
    if (!rawData?.timeSeriesDatedValues) return []

    try {
      const parsed: TimeSeriesData[] = JSON.parse(rawData.timeSeriesDatedValues)

      if (!Array.isArray(parsed)) return []

      return parsed.map((row) => ({
        date: formatDate(row.Date ?? ""),
        pos1_3: row.Pos1_3 ?? 0,
        pos4_20: row.Pos4_20 ?? 0,
        pos20_plus: row.Pos20_Plus ?? 0,
      }))
    } catch {
      return []
    }
  }, [rawData])

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return []

    const maxPos1_3 = Math.max(...chartData.map((d) => d.pos1_3 || 0))
    const maxPos4_20 = Math.max(...chartData.map((d) => d.pos4_20 || 0))
    const maxPos20_plus = Math.max(...chartData.map((d) => d.pos20_plus || 0))

    const minPos1_3 = Math.min(...chartData.map((d) => d.pos1_3 || 0))
    const minPos4_20 = Math.min(...chartData.map((d) => d.pos4_20 || 0))
    const minPos20_plus = Math.min(...chartData.map((d) => d.pos20_plus || 0))

    const scaleValue = (value: number, min: number, max: number, baseOffset: number): number => {
      if (max === min) return baseOffset + 15
      const range = max - min
      const normalized = ((value - min) / range) * 25
      return baseOffset + normalized
    }

    return chartData.map((point) => ({
      ...point,
      pos1_3Norm: scaleValue(point.pos1_3, minPos1_3, maxPos1_3, 5),
      pos4_20Norm: scaleValue(point.pos4_20, minPos4_20, maxPos4_20, 40),
      pos20_plusNorm: scaleValue(point.pos20_plus, minPos20_plus, maxPos20_plus, 75),
    }))
  }, [chartData])

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length
      if (!checked && checkedCount <= 1) {
        return prev
      }
      return { ...prev, [key]: checked }
    })
  }, [])

  const positionLegendItems = useMemo(() => {
    return positionCards.map((card) => ({
      ...card,
      checked: visibleLines[card.key] ?? true,
    }))
  }, [positionCards, visibleLines])

  const hasData = chartData.length > 0

  return {
    positionCards,
    positionLegendItems,
    chartData,
    normalizedChartData,
    visibleLines,
    isLoading,
    isFetching,
    error,
    hasData,
    refetch,
    handleLegendToggle,
  }
}
