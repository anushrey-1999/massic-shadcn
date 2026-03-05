import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { sumMetrics } from "@/utils/gsc-deepdive-utils";
import type { FunnelChartItem, TimePeriodValue } from "@/hooks/use-gsc-analytics";

interface V2Response<T = any> {
  success: boolean;
  data: {
    ranges: {
      currentStart: string;
      currentEnd: string;
      previousStart: string;
      previousEnd: string;
    };
    current: T[];
    previous: T[];
  };
}

interface GscMetricRow {
  impressions?: number;
  clicks?: number;
}

interface Ga4MetricRow {
  keyEvents?: number;
}

function buildEmptyV2Response<T = any>(): V2Response<T> {
  return {
    success: true,
    data: {
      ranges: {
        currentStart: "",
        currentEnd: "",
        previousStart: "",
        previousEnd: "",
      },
      current: [],
      previous: [],
    },
  };
}

function percentage(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function useOverviewFunnelData(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const { data, isLoading } = useQuery<{
    gscDate: V2Response<GscMetricRow>;
    ga4Date: V2Response<Ga4MetricRow>;
  }>({
    queryKey: ["overview-funnel-v2", businessUniqueId, website, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website");
      }

      const basePayload = { period, site_url: website };

      const [gscDate, ga4Date] = await Promise.all([
        api.post<V2Response<GscMetricRow>>("/analytics/gsc/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
        }),
        api.post<V2Response<Ga4MetricRow>>("/analytics/ga4/analytics-v2", "node", {
          ...basePayload,
          dimension: "date",
          traffic_scope: "organic",
        }).catch(() => buildEmptyV2Response<Ga4MetricRow>()),
      ]);

      return { gscDate, ga4Date };
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const funnelChartItems = useMemo<FunnelChartItem[]>(() => {
    const gscDateData = data?.gscDate ?? buildEmptyV2Response<GscMetricRow>();
    const ga4DateData = data?.ga4Date ?? buildEmptyV2Response<Ga4MetricRow>();

    const totalImpressions = sumMetrics(gscDateData.data.current, "impressions");
    const totalClicks = sumMetrics(gscDateData.data.current, "clicks");
    const totalGoals = sumMetrics(ga4DateData.data.current, "keyEvents");

    return [
      {
        label: "Impressions",
        value: totalImpressions,
        percentage: percentage(totalClicks, totalImpressions),
      },
      {
        label: "Clicks",
        value: totalClicks,
        percentage: percentage(totalGoals, totalClicks),
      },
      {
        label: "Goals",
        value: totalGoals,
      },
    ];
  }, [data]);

  const hasFunnelData = useMemo(() => {
    return funnelChartItems.some((item) => item.value > 0);
  }, [funnelChartItems]);

  return {
    funnelChartItems,
    hasFunnelData,
    isLoading,
  };
}
