import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "./use-api"

export interface TrafficContributor {
  level: string
  key: string
  parent_key: string
  delta_clicks: number
  share: number
  classification: string
  position_delta: number
  is_brand: boolean
}

export interface TrafficDiagnosis {
  cause_code: string
  cause_category: string
  pattern_strength: number
  evidence: Record<string, unknown>
  rationale: string
  confidence: number
  label: string
  detail?: string
  is_primary?: boolean
}

export interface TrafficActions {
  urgent: string[]
  important: string[]
  monitoring: string[]
}

export interface TrafficData {
  anomaly_id: string
  window_start: string
  window_end: string
  delta_clicks: number
  delta_pct: number
  direction: "up" | "down"
  severity: "high" | "medium" | "low"
  primary_cause_category: string
  primary_cause_code: string
  confidence: number
  narrative: {
    headline: string
    summary_bullets: string[]
    primary_diagnosis: TrafficDiagnosis
    contributing_diagnoses: TrafficDiagnosis[]
    top_contributors: TrafficContributor[]
    brand_split: {
      brand_delta: number
      nonbrand_delta: number
      brand_pct: number
    }
    actions: TrafficActions
  }
}

interface UseTrafficAnalysisReturn {
  trafficData: TrafficData | null
  isLoading: boolean
  error: string | null
  message: string | null
  hasAnomaly: boolean
  refetch: () => Promise<void>
}

export function useTrafficAnalysis(
  businessId: string | null,
  businessName: string = "",
  selectedDate: string | null = null
): UseTrafficAnalysisReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["traffic-analysis", businessId, businessName, selectedDate],
    queryFn: async () => {
      if (!businessId) return { trafficData: null, message: null }

      const response = await api.post<{ err?: boolean; data?: TrafficData & { message?: string }; message?: string }>(
        "/analytics/traffic-analysis",
        "node",
        {
          businessId,
          businessName,
          selectedDate,
        }
      )

      if (!response.err && response.data) {
        if (response.data.message && !response.data.anomaly_id && !response.data.delta_clicks) {
          return { trafficData: null, message: response.data.message }
        }
        return { trafficData: response.data, message: null }
      }
      return { trafficData: null, message: response.message || null }
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const hasAnomaly = useMemo(() => {
    return data?.trafficData !== null && !!data?.trafficData?.anomaly_id
  }, [data])

  return {
    trafficData: data?.trafficData || null,
    isLoading,
    error: error ? String(error) : null,
    message: data?.message || null,
    hasAnomaly,
    refetch: async () => { await refetch() },
  }
}
