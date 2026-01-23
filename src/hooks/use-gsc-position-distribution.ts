import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo, useState, useCallback } from "react";
import { calculateTrend } from "@/utils/gsc-deepdive-utils";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months";

interface GscV2Response {
  success: boolean;
  data: {
    ranges: { currentStart: string; currentEnd: string; previousStart: string; previousEnd: string };
    current: any[];
    previous: any[];
  };
}

interface PositionDataPoint {
  date: string;
  pos1_3: number;
  pos4_20: number;
  pos20_plus: number;
}

interface PositionMetric {
  label: string;
  value: number;
  change: number;
  key: string;
  checked?: boolean;
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

export function useGscPositionDistribution(
  businessId: string | null,
  siteUrl: string | null,
  period: TimePeriodValue = "3 months",
  apiFilters: DeepdiveFilter[] = []
) {
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    pos1_3: true,
    pos4_20: true,
    pos20_plus: true,
  });

  const { data: positionData, isLoading } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-position", businessId, siteUrl, period, apiFilters],
    queryFn: async () => {
      const response = await api.post<GscV2Response>("/analytics/gsc/analytics-v2", "node", {
        dimension: "position-ranges",
        period,
        site_url: siteUrl,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
      });
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const positionChartData = useMemo<PositionDataPoint[]>(() => {
    if (!positionData?.data?.current) return [];
    return positionData.data.current.map((item: any) => ({
      date: formatDate(item.keys?.[0] ?? ""),
      pos1_3: Number(item.pos1_3) || 0,
      pos4_20: Number(item.pos4_20) || 0,
      pos20_plus: Number(item.pos20_plus) || 0,
    }));
  }, [positionData]);

  const positionMetrics = useMemo<PositionMetric[]>(() => {
    if (!positionData?.data?.current || !positionData?.data?.previous) return [];

    const currentPos1_3 = positionData.data.current.reduce((sum: number, item: any) => sum + (Number(item.pos1_3) || 0), 0);
    const currentPos4_20 = positionData.data.current.reduce((sum: number, item: any) => sum + (Number(item.pos4_20) || 0), 0);
    const currentPos20_plus = positionData.data.current.reduce((sum: number, item: any) => sum + (Number(item.pos20_plus) || 0), 0);

    const previousPos1_3 = positionData.data.previous.reduce((sum: number, item: any) => sum + (Number(item.pos1_3) || 0), 0);
    const previousPos4_20 = positionData.data.previous.reduce((sum: number, item: any) => sum + (Number(item.pos4_20) || 0), 0);
    const previousPos20_plus = positionData.data.previous.reduce((sum: number, item: any) => sum + (Number(item.pos20_plus) || 0), 0);

    const days = positionData.data.current.length || 1;
    const prevDays = positionData.data.previous.length || 1;

    const avgCurrent1_3 = Math.floor(currentPos1_3 / days);
    const avgCurrent4_20 = Math.floor(currentPos4_20 / days);
    const avgCurrent20_plus = Math.floor(currentPos20_plus / days);

    const avgPrev1_3 = Math.floor(previousPos1_3 / prevDays);
    const avgPrev4_20 = Math.floor(previousPos4_20 / prevDays);
    const avgPrev20_plus = Math.floor(previousPos20_plus / prevDays);

    const trend1_3 = calculateTrend(avgCurrent1_3, avgPrev1_3);
    const trend4_20 = calculateTrend(avgCurrent4_20, avgPrev4_20);
    const trend20_plus = calculateTrend(avgCurrent20_plus, avgPrev20_plus);

    return [
      { key: "pos1_3", label: "Pos 1-3", value: avgCurrent1_3, change: trend1_3.isInfinity ? Infinity : (trend1_3.trend === 'up' ? trend1_3.value : -trend1_3.value), checked: visibleLines.pos1_3 ?? true },
      { key: "pos4_20", label: "Pos 4-20", value: avgCurrent4_20, change: trend4_20.isInfinity ? Infinity : (trend4_20.trend === 'up' ? trend4_20.value : -trend4_20.value), checked: visibleLines.pos4_20 ?? true },
      { key: "pos20_plus", label: "Pos 20+", value: avgCurrent20_plus, change: trend20_plus.isInfinity ? Infinity : (trend20_plus.trend === 'up' ? trend20_plus.value : -trend20_plus.value), checked: visibleLines.pos20_plus ?? true },
    ];
  }, [positionData, visibleLines]);

  const normalizedPositionData = useMemo(() => {
    if (positionChartData.length === 0) return [];

    const maxPos1_3 = Math.max(...positionChartData.map((d) => d.pos1_3 || 0));
    const maxPos4_20 = Math.max(...positionChartData.map((d) => d.pos4_20 || 0));
    const maxPos20_plus = Math.max(...positionChartData.map((d) => d.pos20_plus || 0));

    const minPos1_3 = Math.min(...positionChartData.map((d) => d.pos1_3 || 0));
    const minPos4_20 = Math.min(...positionChartData.map((d) => d.pos4_20 || 0));
    const minPos20_plus = Math.min(...positionChartData.map((d) => d.pos20_plus || 0));

    const scaleValue = (value: number, min: number, max: number, baseOffset: number): number => {
      if (max === min) return baseOffset + 15;
      const range = max - min;
      const normalized = ((value - min) / range) * 25;
      return baseOffset + normalized;
    };

    return positionChartData.map((point) => ({
      ...point,
      pos1_3Norm: scaleValue(point.pos1_3, minPos1_3, maxPos1_3, 5),
      pos4_20Norm: scaleValue(point.pos4_20, minPos4_20, maxPos4_20, 40),
      pos20_plusNorm: scaleValue(point.pos20_plus, minPos20_plus, maxPos20_plus, 75),
    }));
  }, [positionChartData]);

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: checked };
    });
  }, []);

  return {
    positionChartData: normalizedPositionData,
    positionMetrics,
    visibleLines,
    handleLegendToggle,
    isLoading,
    hasData: positionChartData.length > 0,
  };
}
