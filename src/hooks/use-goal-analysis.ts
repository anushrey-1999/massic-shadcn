import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "./use-api"

export interface Diagnosis {
  cause_code: string
  confidence: number
  rationale: string
  suggested_actions: string[]
}

export interface GoalData {
  id: string
  title: string
  percentage: string
  severity: "critical" | "warning" | "positive"
  primaryCause: string
  description: string
  summaryBullets: string[]
  diagnoses: Diagnosis[]
}

export interface GoalAnalysisResponse {
  anomalies?: Array<{
    event_name: string
    anomaly_details: {
      direction: string
      severityLevel: string
      detection_stats: {
        delta_pct: number
      }
      narrative: {
        headline: string
        summary: string
        summary_bullets: string[]
        diagnoses: Diagnosis[]
      }
    }
  }>
  analysis_summary?: {
    severity_counts: {
      critical: number
      warning: number
      positive: number
    }
  }
}

interface UseGoalAnalysisReturn {
  goalData: GoalData[]
  criticalCount: number
  warningCount: number
  positiveCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function transformGoalData(data: GoalAnalysisResponse | null): GoalData[] {
  if (!data?.anomalies) return []

  return data.anomalies.map((anomaly, index) => {
    const direction = anomaly.anomaly_details?.direction || "down"
    const deltaPct = Math.abs(anomaly.anomaly_details?.detection_stats?.delta_pct || 0)
    const percentage = `${Math.round(deltaPct)}%`
    const summaryBullets = anomaly.anomaly_details?.narrative?.summary_bullets || []
    const summary = anomaly.anomaly_details?.narrative?.summary || "No summary available"

    return {
      id: (index + 1).toString(),
      title: anomaly.event_name || "Unknown Event",
      percentage: direction === "down" ? `-${percentage}` : `+${percentage}`,
      severity: (anomaly.anomaly_details?.severityLevel as "critical" | "warning" | "positive") || "warning",
      primaryCause: anomaly.anomaly_details?.narrative?.headline || "No headline available",
      description: summary,
      summaryBullets,
      diagnoses: anomaly.anomaly_details?.narrative?.diagnoses || [],
    }
  })
}

export function useGoalAnalysis(
  businessId: string | null,
  businessName: string = "",
  selectedDate: string | null = null
): UseGoalAnalysisReturn {
  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ["goal-analysis", businessId, businessName, selectedDate],
    queryFn: async () => {
      if (!businessId) return null

      const response = await api.post<{ err?: boolean; data?: GoalAnalysisResponse; message?: string }>(
        "/analytics/goal-analysis",
        "node",
        {
          businessId,
          businessName,
          selectedDate,
        }
      )

      if (!response.err && response.data) {
        return response.data
      }
      throw new Error(response.message || "Failed to fetch goal analysis")
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const goalData = useMemo(() => transformGoalData(rawData || null), [rawData])

  const { criticalCount, warningCount, positiveCount } = useMemo(() => {
    if (rawData?.analysis_summary?.severity_counts) {
      return {
        criticalCount: rawData.analysis_summary.severity_counts.critical || 0,
        warningCount: rawData.analysis_summary.severity_counts.warning || 0,
        positiveCount: rawData.analysis_summary.severity_counts.positive || 0,
      }
    }
    return {
      criticalCount: goalData.filter((g) => g.severity === "critical").length,
      warningCount: goalData.filter((g) => g.severity === "warning").length,
      positiveCount: goalData.filter((g) => g.severity === "positive").length,
    }
  }, [rawData, goalData])

  return {
    goalData,
    criticalCount,
    warningCount,
    positiveCount,
    isLoading,
    error: error ? String(error) : null,
    refetch: async () => { await refetch() },
  }
}
