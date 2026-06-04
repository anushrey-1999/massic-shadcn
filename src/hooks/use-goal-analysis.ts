import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "./use-api"

export type AnomalyTier = "anomaly" | "candidate" | "normal"
export type BaselineStatus = "FULL" | "PARTIAL" | "NONE"

export interface HeadlineReel {
  text: string
  direction: "up" | "down" | "flat" | "neutral"
}

export interface Win {
  type: "metric" | "channel" | "query"
  text: string
  delta: number
}

export interface DailyPeak {
  date: string
  actual: number
  expected: number
  delta: number
  delta_pct: number
  score: number | string
  direction: "up" | "down"
  tier: AnomalyTier
  baseline_samples?: number
}

export interface Diagnosis {
  cause_code: string
  cause_category?: string
  confidence: number
  rationale: string
  plain_text?: string
  suggested_actions?: string[]
  label?: string
  detail?: string
  evidence_summary?: {
    queries_affected?: number
    pages_affected?: number
    estimated_clicks_lost?: number
    estimated_conversions_lost?: number
  }
  evidence_examples?: Array<Record<string, string | number | boolean | null | undefined>>
}

export interface PageBreakdown {
  page: string
  delta_goals: number
  delta_sessions: number
  delta_clicks?: number | null
  delta_impressions?: number | null
  delta_position?: number | null
  queries?: string[]
}

export interface SourceBreakdown {
  level?: "source"
  key: string
  source?: string
  pages?: PageBreakdown[]
  classification?: string
  delta_goals?: number
  delta_sessions?: number
  share?: number
}

export interface GoalContributor {
  level?: string
  key?: string
  page?: string
  representative_page?: string
  sources?: SourceBreakdown[]
  pages?: PageBreakdown[]
  classification?: string
  delta_goals?: number
  delta_sessions?: number
  delta_conversions?: number
  delta_clicks?: number
  share?: number
}

interface GoalNarrative {
  headline?: string
  headline_reels?: HeadlineReel[]
  context_line?: string
  cross_event_context?: string
  large_position_drop?: boolean
  summary?: string
  summary_bullets?: string[]
  wins?: Win[]
  bottom_line?: string
  primary_diagnosis?: Diagnosis | null
  contributing_diagnoses?: Diagnosis[]
  diagnoses?: Diagnosis[]
  top_contributors?: GoalContributor[]
}

export interface GoalData {
  id: string
  title: string
  percentage: string
  direction: "up" | "down"
  severity: "critical" | "warning" | "positive"
  impactSeverity: "high" | "medium" | "low"
  trackingQuality: "stable" | "uncertain"
  tier: AnomalyTier
  baselineStatus: BaselineStatus
  historyDays: number
  obsStartDate?: string
  obsEndDate?: string
  anomalousComparisonPeriod: boolean
  primaryCause: string
  headlineReels: HeadlineReel[]
  wins: Win[]
  bottomLine: string
  contextLine: string
  crossEventContext?: string
  largePositionDrop: boolean
  description: string
  summaryBullets: string[]
  diagnoses: Diagnosis[]
  primaryDiagnosis: Diagnosis | null
  contributingDiagnoses: Diagnosis[]
  topContributors: GoalContributor[]
  delta: number
  deltaPct: number
  expected?: number
  actual?: number
  dailyPeaks: DailyPeak[]
}

export interface GoalAnalysisResponse {
  state?: "no_goal_tracking" | "insufficient_history"
  show_traffic_fallback?: boolean
  baseline_status?: BaselineStatus
  history_days?: number
  baseline_weeks_available?: number
  obs_start_date?: string
  obs_end_date?: string
  message?: string
  anomalies?: Array<{
    anomaly_id?: string
    type?: "goal"
    metric?: "conversions"
    entity_name?: string
    severity?: "high" | "medium" | "low"
    direction?: "up" | "down"
    tier?: AnomalyTier
    tracking_quality?: "stable" | "uncertain"
    baseline_status?: BaselineStatus
    history_days?: number
    obs_start_date?: string
    obs_end_date?: string
    baseline?: {
      anomalous_comparison_period?: boolean
    }
    detection?: {
      tier?: AnomalyTier
      expected: number
      actual: number
      delta: number
      delta_pct: number
      score: number
      daily_peaks?: DailyPeak[]
      daily_peak_day?: DailyPeak | null
    }
    narrative?: {
      headline?: string
      headline_reels?: HeadlineReel[]
      context_line?: string
      cross_event_context?: string
      large_position_drop?: boolean
      summary?: string
      summary_bullets?: string[]
      wins?: Win[]
      bottom_line?: string
      primary_diagnosis?: Diagnosis | null
      contributing_diagnoses?: Diagnosis[]
      diagnoses?: Diagnosis[]
      top_contributors?: GoalContributor[]
    } | null
    event_name: string
    anomaly_details: {
      direction: string
      severity?: string
      severityLevel: string
      tier?: AnomalyTier
      detection_stats: {
        delta?: number
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
  rawData: GoalAnalysisResponse | null
  criticalCount: number
  warningCount: number
  positiveCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function dedupeDiagnosesByCause(diagnoses: Array<Diagnosis | null | undefined>): Diagnosis[] {
  const seen = new Set<string>()
  const deduped: Diagnosis[] = []

  for (const diagnosis of diagnoses) {
    if (!diagnosis?.cause_code || seen.has(diagnosis.cause_code)) continue
    seen.add(diagnosis.cause_code)
    deduped.push(diagnosis)
  }

  return deduped
}

function contributorDisplayKey(contributor: GoalContributor): string {
  return contributor.key || contributor.page || "Unknown contributor"
}

function collapseTopContributors(contributors: GoalContributor[]): GoalContributor[] {
  const groups = new Map<string, GoalContributor>()

  for (const contributor of contributors) {
    const displayKey = contributorDisplayKey(contributor)
    const existing = groups.get(displayKey)

    if (!existing) {
      groups.set(displayKey, { ...contributor, key: contributor.key || displayKey })
      continue
    }

    existing.delta_conversions = Number(existing.delta_conversions || 0) + Number(contributor.delta_conversions || 0)
    existing.delta_clicks = Number(existing.delta_clicks || 0) + Number(contributor.delta_clicks || 0)
    existing.share = Number(existing.share || 0) + Number(contributor.share || 0)
  }

  return [...groups.values()]
    .sort((a, b) => Math.abs(Number(b.delta_conversions ?? b.delta_clicks ?? 0)) - Math.abs(Number(a.delta_conversions ?? a.delta_clicks ?? 0)))
}

function transformGoalData(data: GoalAnalysisResponse | null): GoalData[] {
  if (!data?.anomalies) return []

  return data.anomalies.map((anomaly, index) => {
    const direction = (anomaly.direction || anomaly.anomaly_details?.direction || "down") as "up" | "down"
    const rawDeltaPct = anomaly.detection?.delta_pct ?? anomaly.anomaly_details?.detection_stats?.delta_pct ?? 0
    const displayDeltaPct = Math.abs(rawDeltaPct) <= 1 ? Math.abs(rawDeltaPct) * 100 : Math.abs(rawDeltaPct)
    const percentage = `${Math.round(displayDeltaPct)}%`
    const normalizedNarrative = (anomaly.narrative || anomaly.anomaly_details?.narrative || {}) as GoalNarrative
    const summaryBullets = (normalizedNarrative?.summary_bullets || []).slice(0, 3)
    const summary = normalizedNarrative?.summary || "No summary available"
    const primaryDiagnosis = normalizedNarrative?.primary_diagnosis || null
    const contributingDiagnoses = dedupeDiagnosesByCause([
      ...(normalizedNarrative?.contributing_diagnoses || []),
    ].filter((diagnosis) => diagnosis?.cause_code !== primaryDiagnosis?.cause_code)).slice(0, 3)
    const fallbackDiagnoses = dedupeDiagnosesByCause(normalizedNarrative?.diagnoses || []).slice(0, 5)
    const diagnoses = primaryDiagnosis
      ? dedupeDiagnosesByCause([primaryDiagnosis, ...contributingDiagnoses]).slice(0, 5)
      : fallbackDiagnoses
    const impactSeverity = (anomaly.severity || anomaly.anomaly_details?.severity || "medium") as "high" | "medium" | "low"
    const legacySeverity = anomaly.anomaly_details?.severityLevel as "critical" | "warning" | "positive" | undefined
    const tier: AnomalyTier =
      (anomaly.tier ||
        anomaly.detection?.tier ||
        anomaly.anomaly_details?.tier ||
        "anomaly") as AnomalyTier
    const dailyPeaks = (anomaly.detection?.daily_peaks || []) as DailyPeak[]

    const headlineReels = (normalizedNarrative?.headline_reels || []) as HeadlineReel[]
    const wins = ((normalizedNarrative?.wins || []) as Win[])
      .filter((win) => Number(win?.delta || 0) > 0)
      .slice(0, 3)
    const bottomLine = normalizedNarrative?.bottom_line || ""
    const contextLine = normalizedNarrative?.context_line || ""
    const crossEventContext = normalizedNarrative?.cross_event_context
    const largePositionDrop = normalizedNarrative?.large_position_drop === true

    return {
      id: anomaly.anomaly_id || (index + 1).toString(),
      title: anomaly.entity_name || anomaly.event_name || "Unknown Event",
      percentage: direction === "down" ? `-${percentage}` : `+${percentage}`,
      direction,
      severity: legacySeverity || (direction === "up" ? "positive" : impactSeverity === "high" ? "critical" : "warning"),
      impactSeverity,
      trackingQuality: anomaly.tracking_quality || "uncertain",
      tier,
      baselineStatus: (anomaly.baseline_status || "FULL") as BaselineStatus,
      historyDays: anomaly.history_days || 56,
      obsStartDate: anomaly.obs_start_date,
      obsEndDate: anomaly.obs_end_date,
      anomalousComparisonPeriod: anomaly.baseline?.anomalous_comparison_period ?? false,
      primaryCause: normalizedNarrative?.headline || primaryDiagnosis?.rationale || "No headline available",
      headlineReels,
      wins,
      bottomLine,
      contextLine,
      crossEventContext,
      largePositionDrop,
      description: summary,
      summaryBullets,
      diagnoses,
      primaryDiagnosis,
      contributingDiagnoses,
      topContributors: (normalizedNarrative?.top_contributors || []).slice(0, 10),
      delta: anomaly.detection?.delta ?? anomaly.anomaly_details?.detection_stats?.delta ?? 0,
      deltaPct: rawDeltaPct,
      expected: anomaly.detection?.expected,
      actual: anomaly.detection?.actual,
      dailyPeaks,
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
    rawData: rawData || null,
    criticalCount,
    warningCount,
    positiveCount,
    isLoading,
    error: error ? String(error) : null,
    refetch: async () => { await refetch() },
  }
}
