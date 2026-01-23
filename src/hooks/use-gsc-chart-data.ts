import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo } from "react";
import { sumMetrics, calculateTrend, type TrendResult } from "@/utils/gsc-deepdive-utils";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months";

interface GscV2Response {
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
  impressions: number;
  clicks: number;
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

export function formatNumber(value: number): string {
  if (value >= 1000000) return `${Math.round((value / 1000000) * 10) / 10}M`;
  if (value >= 100000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${Math.round((value / 1000) * 10) / 10}K`;
  return value.toLocaleString();
}

export function useGscChartData(
  businessId: string | null,
  siteUrl: string | null,
  period: TimePeriodValue = "3 months",
  filters: DeepdiveFilter[] = []
) {
  const { data: dateData, isLoading } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-date", businessId, siteUrl, period, filters],
    queryFn: async () => {
      const response = await api.post<GscV2Response>(
        "/analytics/gsc/analytics-v2",
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
      impressions: item.impressions ?? 0,
      clicks: item.clicks ?? 0,
    }));
  }, [dateData]);

  const impressionsMetric = useMemo<MetricWithTrend>(() => {
    const currentTotal = sumMetrics(dateData?.data?.current ?? [], 'impressions');
    const previousTotal = sumMetrics(dateData?.data?.previous ?? [], 'impressions');
    return { total: currentTotal, trend: calculateTrend(currentTotal, previousTotal) };
  }, [dateData]);

  const clicksMetric = useMemo<MetricWithTrend>(() => {
    const currentTotal = sumMetrics(dateData?.data?.current ?? [], 'clicks');
    const previousTotal = sumMetrics(dateData?.data?.previous ?? [], 'clicks');
    return { total: currentTotal, trend: calculateTrend(currentTotal, previousTotal) };
  }, [dateData]);

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return [];

    const impressionsValues = chartData.map((d) => d.impressions || 0);
    const clicksValues = chartData.map((d) => d.clicks || 0);

    const minImpressions = Math.min(...impressionsValues);
    const maxImpressions = Math.max(...impressionsValues);
    const minClicks = Math.min(...clicksValues);
    const maxClicks = Math.max(...clicksValues);

    const scaleValueToBand = (
      value: number,
      min: number,
      max: number,
      bandStart: number,
      bandEnd: number
    ): number => {
      if (max === min) return (bandStart + bandEnd) / 2;
      const normalized = (value - min) / (max - min);
      return bandStart + normalized * (bandEnd - bandStart);
    };

    return chartData.map((point) => ({
      ...point,
      impressionsNorm: scaleValueToBand(point.impressions, minImpressions, maxImpressions, 60, 100),
      clicksNorm: scaleValueToBand(point.clicks, minClicks, maxClicks, 30, 70),
    }));
  }, [chartData]);

  return {
    chartData,
    normalizedChartData,
    impressionsMetric,
    clicksMetric,
    isLoading,
    formatNumber,
  };
}
