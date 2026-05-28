import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";

export type AnalyticsAnomalyTier = "anomaly" | "candidate" | "normal";

export interface AnalyticsAnomalyDailyPeak {
  date: string;
  actual?: number;
  expected?: number;
  delta?: number;
  delta_pct?: number;
  score?: number | string;
  direction?: "up" | "down";
  tier?: AnalyticsAnomalyTier;
  baseline_samples?: number;
}

export interface AnalyticsAnomalyMetricPayload {
  weeklyTier?: AnalyticsAnomalyTier;
  dailyPeakForDate?: AnalyticsAnomalyDailyPeak | null;
  dailyPeaks?: AnalyticsAnomalyDailyPeak[];
  cards?: Array<Record<string, unknown>>;
  card?: Record<string, unknown> | null;
}

export interface AnalyticsAnomalyPayload {
  goal?: AnalyticsAnomalyMetricPayload | null;
  traffic?: AnalyticsAnomalyMetricPayload | null;
}

export interface AnalyticsAnomalyDate {
  date: string;
  hasGoalAnomaly: boolean;
  hasTrafficAnomaly: boolean;
  goalAnomalyCount: number;
  analysisPayload?: AnalyticsAnomalyPayload | null;
}

interface AnalyticsAnomalyDatesResponse {
  success: boolean;
  data: AnalyticsAnomalyDate[];
}

function buildQuery(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return search.toString();
}

export function useAnalyticsAnomalyDates(
  businessId: string | null,
  from: string | null | undefined,
  to: string | null | undefined,
  enabled = true
) {
  const query = businessId && from && to
    ? buildQuery({ businessId, from, to })
    : "";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics-anomaly-dates", businessId, from, to],
    queryFn: async () => {
      const response = await api.get<AnalyticsAnomalyDatesResponse>(
        `/analytics/anomaly-dates?${query}`,
        "node"
      );
      return response.data || [];
    },
    enabled: enabled && !!businessId && !!from && !!to,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    anomalyDates: data || [],
    isLoading,
    error: error ? String(error) : null,
    refetch,
  };
}
