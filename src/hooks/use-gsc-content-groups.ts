import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo, useState, useCallback } from "react";
import { calculateTrend, type TrendResult } from "@/utils/gsc-deepdive-utils";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

export type TimePeriodValue = "7 days" | "14 days" | "28 days" | "3 months" | "6 months" | "12 months";
export type TableFilterType = "popular" | "growing" | "decaying";
export type SortColumn = "impressions" | "clicks";
export type SortDirection = "asc" | "desc";

interface GscV2Response {
  success: boolean;
  data: {
    ranges: { currentStart: string; currentEnd: string; previousStart: string; previousEnd: string };
    current: any[];
    previous: any[];
  };
}

export function useGscContentGroups(
  businessId: string | null,
  siteUrl: string | null,
  period: TimePeriodValue = "3 months",
  apiFilters: DeepdiveFilter[] = []
) {
  const [filter, setFilter] = useState<TableFilterType>("popular");
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "impressions",
    direction: "desc",
  });

  const { data: contentGroupData, isLoading } = useQuery<GscV2Response>({
    queryKey: ["gsc-deepdive-content-group", businessId, siteUrl, period, apiFilters],
    queryFn: async () => {
      const response = await api.post<GscV2Response>("/analytics/gsc/analytics-v2", "node", {
        dimension: "content_group",
        period,
        site_url: siteUrl,
        limit: 100,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
      });
      return response;
    },
    enabled: !!businessId && !!siteUrl,
    staleTime: 5 * 60 * 1000,
  });

  const rawData = useMemo(() => {
    if (!contentGroupData?.data?.current || !contentGroupData?.data?.previous) return [];

    return contentGroupData.data.current.map((item: any) => {
      const group = item.group ?? item.keys?.[0] ?? "";
      const displayName = item.displayName ?? group;
      const prevItem = contentGroupData.data.previous.find((p: any) => (p.group ?? p.keys?.[0]) === group);
      return {
        group,
        displayName,
        impressions: item.impressions ?? 0,
        clicks: item.clicks ?? 0,
        position: item.position ?? 0,
        impressionsTrend: calculateTrend(item.impressions ?? 0, prevItem?.impressions ?? 0),
        clicksTrend: calculateTrend(item.clicks ?? 0, prevItem?.clicks ?? 0),
      };
    });
  }, [contentGroupData]);

  const filteredData = useMemo(() => {
    let filtered =
      filter === "popular"
        ? rawData
        : rawData.filter((item) => {
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
  }, [rawData, filter, sort]);

  const handleFilterChange = useCallback((value: TableFilterType) => setFilter(value), []);
  const handleSort = useCallback((column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  return {
    data: filteredData,
    filter,
    sort,
    handleFilterChange,
    handleSort,
    hasData: rawData.length > 0,
    isLoading,
  };
}
