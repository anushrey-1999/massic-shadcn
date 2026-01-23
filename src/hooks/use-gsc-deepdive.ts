import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo, useState, useCallback } from "react";
import {
  sumMetrics,
  calculateTrend,
  groupPagesByPath,
  type TrendResult,
  type ContentGroup
} from "@/utils/gsc-deepdive-utils";

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months";
export type TableFilterType = "popular" | "growing" | "decaying";
export type SortColumn = "impressions" | "clicks";
export type SortDirection = "asc" | "desc";

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

function formatNumber(value: number): string {
  if (value >= 1000000) {
    const formatted = Math.round((value / 1000000) * 10) / 10;
    return `${formatted}M`;
  }
  if (value >= 100000) {
    const formatted = Math.round(value / 1000);
    return `${formatted}K`;
  }
  if (value >= 1000) {
    const formatted = Math.round((value / 1000) * 10) / 10;
    return `${formatted}K`;
  }
  return value.toLocaleString();
}

export function useGscDeepdive(
  businessId: string | null,
  siteUrl: string | null,
  period: TimePeriodValue = "3 months"
) {
  // Filter states
  const [contentGroupsFilter, setContentGroupsFilter] = useState<TableFilterType>("popular");
  const [topPagesFilter, setTopPagesFilter] = useState<TableFilterType>("popular");
  const [topQueriesFilter, setTopQueriesFilter] = useState<TableFilterType>("popular");

  // Sort states
  const [contentGroupsSort, setContentGroupsSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" });
  const [topPagesSort, setTopPagesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" });
  const [topQueriesSort, setTopQueriesSort] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "impressions", direction: "desc" });

  const { data: dateData, isLoading: isLoadingDate } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-date", businessId, siteUrl, period],
    queryFn: async () => {
      const response = await api.post<GscV2Response>(
        "/analytics/gsc/analytics-v2",
        "node",
        {
          dimension: "date",
          period,
          site_url: siteUrl,
        }
      );
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const { data: pageData, isLoading: isLoadingPages } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-page", businessId, siteUrl, period],
    queryFn: async () => {
      const response = await api.post<GscV2Response>(
        "/analytics/gsc/analytics-v2",
        "node",
        {
          dimension: "page",
          period,
          site_url: siteUrl,
          limit: 1000,
        }
      );
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const { data: queryData, isLoading: isLoadingQueries } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-query", businessId, siteUrl, period],
    queryFn: async () => {
      const response = await api.post<GscV2Response>(
        "/analytics/gsc/analytics-v2",
        "node",
        {
          dimension: "query",
          period,
          site_url: siteUrl,
          limit: 100,
        }
      );
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const { data: positionData, isLoading: isLoadingPositions } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-position", businessId, siteUrl, period],
    queryFn: async () => {
      const response = await api.post<GscV2Response>(
        "/analytics/gsc/analytics-v2",
        "node",
        {
          dimension: "position-ranges",
          period,
          site_url: siteUrl,
        }
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

    return {
      total: currentTotal,
      trend: calculateTrend(currentTotal, previousTotal),
    };
  }, [dateData]);

  const clicksMetric = useMemo<MetricWithTrend>(() => {
    const currentTotal = sumMetrics(dateData?.data?.current ?? [], 'clicks');
    const previousTotal = sumMetrics(dateData?.data?.previous ?? [], 'clicks');

    return {
      total: currentTotal,
      trend: calculateTrend(currentTotal, previousTotal),
    };
  }, [dateData]);

  const contentGroupsRawData = useMemo(() => {
    if (!pageData?.data?.current || !pageData?.data?.previous) return [];

    const currentGroups = groupPagesByPath(pageData.data.current);
    const previousGroups = groupPagesByPath(pageData.data.previous);

    return currentGroups.map(group => {
      const prevGroup = previousGroups.find(p => p.group === group.group);

      return {
        ...group,
        impressionsTrend: calculateTrend(group.impressions, prevGroup?.impressions ?? 0),
        clicksTrend: calculateTrend(group.clicks, prevGroup?.clicks ?? 0),
      };
    });
  }, [pageData]);

  const topPagesRawData = useMemo(() => {
    if (!pageData?.data?.current || !pageData?.data?.previous) return [];

    return pageData.data.current.map((item: any) => {
      const page = item.keys?.[0] ?? "";
      const prevItem = pageData.data.previous.find((p: any) => p.keys?.[0] === page);

      return {
        page,
        impressions: item.impressions ?? 0,
        clicks: item.clicks ?? 0,
        position: item.position ?? 0,
        impressionsTrend: calculateTrend(item.impressions ?? 0, prevItem?.impressions ?? 0),
        clicksTrend: calculateTrend(item.clicks ?? 0, prevItem?.clicks ?? 0),
      };
    });
  }, [pageData]);

  const topQueriesRawData = useMemo(() => {
    if (!queryData?.data?.current || !queryData?.data?.previous) return [];

    return queryData.data.current.map((item: any) => {
      const query = item.keys?.[0] ?? "";
      const prevItem = queryData.data.previous.find((p: any) => p.keys?.[0] === query);

      return {
        query,
        impressions: item.impressions ?? 0,
        clicks: item.clicks ?? 0,
        position: item.position ?? 0,
        impressionsTrend: calculateTrend(item.impressions ?? 0, prevItem?.impressions ?? 0),
        clicksTrend: calculateTrend(item.clicks ?? 0, prevItem?.clicks ?? 0),
      };
    });
  }, [queryData]);

  // Filter and sort function - matches analytics pattern
  const filterAndSortData = useCallback(<T extends { impressions: number; clicks: number; impressionsTrend?: TrendResult; clicksTrend?: TrendResult }>(
    data: T[],
    filter: TableFilterType,
    sort: { column: SortColumn; direction: SortDirection }
  ): T[] => {
    let filtered = filter === "popular"
      ? data
      : data.filter((item) => {
        if (filter === "growing") {
          return item.impressionsTrend?.trend === "up" || item.clicksTrend?.trend === "up";
        }
        if (filter === "decaying") {
          return item.impressionsTrend?.trend === "down" || item.clicksTrend?.trend === "down";
        }
        return true;
      });

    return [...filtered].sort((a, b) => {
      const aValue = a[sort.column];
      const bValue = b[sort.column];
      return sort.direction === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, []);

  // Filtered and sorted data
  const contentGroupsData = useMemo(() => {
    return filterAndSortData(contentGroupsRawData, contentGroupsFilter, contentGroupsSort);
  }, [contentGroupsRawData, contentGroupsFilter, contentGroupsSort, filterAndSortData]);

  const topPagesData = useMemo(() => {
    return filterAndSortData(topPagesRawData, topPagesFilter, topPagesSort);
  }, [topPagesRawData, topPagesFilter, topPagesSort, filterAndSortData]);

  const topQueriesData = useMemo(() => {
    return filterAndSortData(topQueriesRawData, topQueriesFilter, topQueriesSort);
  }, [topQueriesRawData, topQueriesFilter, topQueriesSort, filterAndSortData]);

  // Filter handlers
  const handleContentGroupsFilterChange = useCallback((filter: TableFilterType) => {
    setContentGroupsFilter(filter);
  }, []);

  const handleTopPagesFilterChange = useCallback((filter: TableFilterType) => {
    setTopPagesFilter(filter);
  }, []);

  const handleTopQueriesFilterChange = useCallback((filter: TableFilterType) => {
    setTopQueriesFilter(filter);
  }, []);

  // Sort handlers
  const handleContentGroupsSort = useCallback((column: SortColumn) => {
    setContentGroupsSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const handleTopPagesSort = useCallback((column: SortColumn) => {
    setTopPagesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const handleTopQueriesSort = useCallback((column: SortColumn) => {
    setTopQueriesSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

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
      {
        key: "pos1_3",
        label: "Pos 1-3",
        value: avgCurrent1_3,
        change: trend1_3.isInfinity ? Infinity : (trend1_3.trend === 'up' ? trend1_3.value : -trend1_3.value),
      },
      {
        key: "pos4_20",
        label: "Pos 4-20",
        value: avgCurrent4_20,
        change: trend4_20.isInfinity ? Infinity : (trend4_20.trend === 'up' ? trend4_20.value : -trend4_20.value),
      },
      {
        key: "pos20_plus",
        label: "Pos 20+",
        value: avgCurrent20_plus,
        change: trend20_plus.isInfinity ? Infinity : (trend20_plus.trend === 'up' ? trend20_plus.value : -trend20_plus.value),
      },
    ];
  }, [positionData]);

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
      impressionsNorm: scaleValueToBand(
        point.impressions,
        minImpressions,
        maxImpressions,
        60,
        100
      ),
      clicksNorm: scaleValueToBand(point.clicks, minClicks, maxClicks, 30, 70),
    }));
  }, [chartData]);

  const normalizedPositionData = useMemo(() => {
    if (positionChartData.length === 0) return [];

    const maxPos1_3 = Math.max(...positionChartData.map((d) => d.pos1_3 || 0));
    const maxPos4_20 = Math.max(...positionChartData.map((d) => d.pos4_20 || 0));
    const maxPos20_plus = Math.max(...positionChartData.map((d) => d.pos20_plus || 0));

    const minPos1_3 = Math.min(...positionChartData.map((d) => d.pos1_3 || 0));
    const minPos4_20 = Math.min(...positionChartData.map((d) => d.pos4_20 || 0));
    const minPos20_plus = Math.min(...positionChartData.map((d) => d.pos20_plus || 0));

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

    return positionChartData.map((point) => ({
      ...point,
      pos1_3Norm: scaleValue(point.pos1_3, minPos1_3, maxPos1_3, 5),
      pos4_20Norm: scaleValue(point.pos4_20, minPos4_20, maxPos4_20, 40),
      pos20_plusNorm: scaleValue(point.pos20_plus, minPos20_plus, maxPos20_plus, 75),
    }));
  }, [positionChartData]);

  const isLoading = isLoadingDate || isLoadingPages || isLoadingQueries || isLoadingPositions;
  const hasContentGroupsData = contentGroupsRawData.length > 0;
  const hasTopPagesData = topPagesRawData.length > 0;
  const hasTopQueriesData = topQueriesRawData.length > 0;

  return {
    chartData,
    normalizedChartData,
    impressionsMetric,
    clicksMetric,
    // Filtered and sorted data
    contentGroupsData,
    topPagesData,
    topQueriesData,
    // Filter states
    contentGroupsFilter,
    topPagesFilter,
    topQueriesFilter,
    // Sort states
    contentGroupsSort,
    topPagesSort,
    topQueriesSort,
    // Filter handlers
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleTopQueriesFilterChange,
    // Sort handlers
    handleContentGroupsSort,
    handleTopPagesSort,
    handleTopQueriesSort,
    // Has data flags
    hasContentGroupsData,
    hasTopPagesData,
    hasTopQueriesData,
    // Position data
    positionChartData: normalizedPositionData,
    positionMetrics,
    isLoading,
    formatNumber,
  };
}
