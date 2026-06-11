import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo } from "react";
import { sumMetrics, calculateTrend, type TrendResult } from "@/utils/gsc-deepdive-utils";
import { type DeepdiveApiFilter } from "@/hooks/use-organic-deepdive-filters";
import { type TimePeriodValue } from "@/hooks/use-gsc-chart-data";

interface Ga4V2Response {
  success: boolean;
  data: {
    ranges: {
      currentStart: string;
      currentEnd: string;
      previousStart: string;
      previousEnd: string;
    };
    current: any[];
    previous: any[];
  };
}

interface ChartDataPoint {
  date: string;
  keyEvents: number;
}

interface MetricWithTrend {
  total: number;
  trend: TrendResult;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

export function useGa4ChartData(
  businessId: string | null,
  siteUrl: string | null,
  period: TimePeriodValue = "3 months",
  filters: DeepdiveApiFilter[] = []
) {
  const { data: dateData, isLoading } = useQuery<Ga4V2Response>({
    queryKey: ["ga4-deepdive-date", businessId, siteUrl, period, filters],
    queryFn: async () => {
      const response = await api.post<Ga4V2Response>(
        "/analytics/ga4/analytics-v2",
        "node",
        { dimension: "date", period, site_url: siteUrl, filters: filters.length > 0 ? filters : undefined }
      );
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!dateData?.data?.current) return [];
    return dateData.data.current.map((item: any) => ({
      date: formatDate(item.keys?.[0] ?? ""),
      keyEvents: Number(item.keyEvents ?? 0),
    }));
  }, [dateData]);

  const keyEventsMetric = useMemo<MetricWithTrend>(() => {
    const currentTotal = sumMetrics(dateData?.data?.current ?? [], "keyEvents");
    const previousTotal = sumMetrics(dateData?.data?.previous ?? [], "keyEvents");
    return { total: currentTotal, trend: calculateTrend(currentTotal, previousTotal) };
  }, [dateData]);

  return {
    chartData,
    keyEventsMetric,
    isLoading,
  };
}
