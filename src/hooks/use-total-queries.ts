import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo, useState, useCallback } from "react";
import type { TimePeriodValue } from "@/hooks/use-gsc-analytics";

interface GscV2Response {
  success: boolean;
  data: {
    ranges: {
      currentStart: string;
      currentEnd: string;
      previousStart: string;
      previousEnd: string;
    };
    current: Array<{
      keys?: string[];
      pos1_3?: number;
      pos4_20?: number;
      pos20_plus?: number;
    }>;
    previous: Array<{
      keys?: string[];
      pos1_3?: number;
      pos4_20?: number;
      pos20_plus?: number;
    }>;
  };
}

export interface PositionCardData {
  label: string;
  value: number;
  change: number;
  key: string;
}

export interface PositionChartData {
  date: string;
  pos1_3: number;
  pos4_20: number;
  pos20_plus: number;
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function toShare(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return part / whole;
}

function toShareChangePercent(currentShare: number, previousShare: number): number {
  const delta = (currentShare - previousShare) * 100;
  return Math.round(delta * 10) / 10;
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
  });

  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<GscV2Response>({
    queryKey: ["overview-position-ranges-v2", businessUniqueId, website, period],
    queryFn: async () => {
      if (!businessUniqueId || !website) {
        throw new Error("Missing business ID or website");
      }

      return api.post<GscV2Response>("/analytics/gsc/analytics-v2", "node", {
        dimension: "position-ranges",
        period,
        site_url: website,
      });
    },
    enabled: !!businessUniqueId && !!website,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const chartData = useMemo<PositionChartData[]>(() => {
    const currentRows = rawData?.data?.current || [];
    if (currentRows.length === 0) return [];

    return currentRows.map((row) => ({
      date: formatDate(row.keys?.[0] ?? ""),
      pos1_3: asNumber(row.pos1_3),
      pos4_20: asNumber(row.pos4_20),
      pos20_plus: asNumber(row.pos20_plus),
    }));
  }, [rawData?.data?.current]);

  const positionCards = useMemo<PositionCardData[]>(() => {
    const currentRows = rawData?.data?.current || [];
    const previousRows = rawData?.data?.previous || [];
    if (currentRows.length === 0 && previousRows.length === 0) return [];

    const currentPos1_3 = currentRows.reduce(
      (sum, row) => sum + asNumber(row.pos1_3),
      0
    );
    const currentPos4_20 = currentRows.reduce(
      (sum, row) => sum + asNumber(row.pos4_20),
      0
    );
    const currentPos20_plus = currentRows.reduce(
      (sum, row) => sum + asNumber(row.pos20_plus),
      0
    );
    const currentTotal = currentPos1_3 + currentPos4_20 + currentPos20_plus;

    const previousPos1_3 = previousRows.reduce(
      (sum, row) => sum + asNumber(row.pos1_3),
      0
    );
    const previousPos4_20 = previousRows.reduce(
      (sum, row) => sum + asNumber(row.pos4_20),
      0
    );
    const previousPos20_plus = previousRows.reduce(
      (sum, row) => sum + asNumber(row.pos20_plus),
      0
    );
    const previousTotal = previousPos1_3 + previousPos4_20 + previousPos20_plus;

    const days = currentRows.length || 1;
    const previousDays = previousRows.length || 1;

    const avgCurrent1_3 = Math.floor(currentPos1_3 / days);
    const avgCurrent4_20 = Math.floor(currentPos4_20 / days);
    const avgCurrent20_plus = Math.floor(currentPos20_plus / days);

    const currentShare1_3 = toShare(currentPos1_3, currentTotal);
    const currentShare4_20 = toShare(currentPos4_20, currentTotal);
    const currentShare20_plus = toShare(currentPos20_plus, currentTotal);

    const previousShare1_3 = toShare(previousPos1_3, previousTotal);
    const previousShare4_20 = toShare(previousPos4_20, previousTotal);
    const previousShare20_plus = toShare(previousPos20_plus, previousTotal);

    const trend1_3 = toShareChangePercent(currentShare1_3, previousShare1_3);
    const trend4_20 = toShareChangePercent(currentShare4_20, previousShare4_20);
    // For Pos20+, lower share is better; invert sign so positive = improvement.
    const trend20_plus = -toShareChangePercent(
      currentShare20_plus,
      previousShare20_plus
    );

    return [
      {
        key: "pos1_3",
        label: "Pos 1-3",
        value: avgCurrent1_3,
        change: trend1_3,
      },
      {
        key: "pos4_20",
        label: "Pos 4-20",
        value: avgCurrent4_20,
        change: trend4_20,
      },
      {
        key: "pos20_plus",
        label: "Pos 20+",
        value: avgCurrent20_plus,
        change: trend20_plus,
      },
    ];
  }, [rawData?.data?.current, rawData?.data?.previous]);

  const normalizedChartData = useMemo(() => {
    if (chartData.length === 0) return [];

    const maxPos1_3 = Math.max(...chartData.map((d) => d.pos1_3 || 0));
    const maxPos4_20 = Math.max(...chartData.map((d) => d.pos4_20 || 0));
    const maxPos20_plus = Math.max(...chartData.map((d) => d.pos20_plus || 0));

    const minPos1_3 = Math.min(...chartData.map((d) => d.pos1_3 || 0));
    const minPos4_20 = Math.min(...chartData.map((d) => d.pos4_20 || 0));
    const minPos20_plus = Math.min(...chartData.map((d) => d.pos20_plus || 0));

    const scaleValue = (
      value: number,
      min: number,
      max: number,
      baseOffset: number
    ): number => {
      if (max === min) return baseOffset + 15;
      const range = max - min;
      const normalized = ((value - min) / range) * 25;
      return baseOffset + normalized;
    };

    return chartData.map((point) => ({
      ...point,
      pos1_3Norm: scaleValue(point.pos1_3, minPos1_3, maxPos1_3, 5),
      pos4_20Norm: scaleValue(point.pos4_20, minPos4_20, maxPos4_20, 40),
      pos20_plusNorm: scaleValue(point.pos20_plus, minPos20_plus, maxPos20_plus, 75),
    }));
  }, [chartData]);

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: checked };
    });
  }, []);

  const positionLegendItems = useMemo(() => {
    return positionCards.map((card) => ({
      ...card,
      checked: visibleLines[card.key] ?? true,
    }));
  }, [positionCards, visibleLines]);

  const hasData = chartData.length > 0;

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
  };
}
