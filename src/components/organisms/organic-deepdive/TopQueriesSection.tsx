"use client";

import { useState } from "react";
import { Eye, ListOrdered, TrendingUp, TrendingDown } from "lucide-react";
import {
  useGscTopQueries,
  type TimePeriodValue,
  type TableFilterType,
  type SortColumn,
} from "@/hooks/use-gsc-top-queries";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

interface TopQueriesSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveFilter[];
  onRowClick?: (query: string) => void;
}

export function TopQueriesSection({
  businessUniqueId,
  website,
  period,
  filters = [],
  onRowClick,
}: TopQueriesSectionProps) {
  const {
    data: topQueriesData,
    filter: topQueriesFilter,
    sort: topQueriesSort,
    handleFilterChange: handleTopQueriesFilterChange,
    handleSort: handleTopQueriesSort,
    hasData: hasTopQueriesData,
    isLoading,
  } = useGscTopQueries(businessUniqueId, website, period, filters);

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DataTable
        icon={<Eye className="h-4 w-4" />}
        title="Searches to discover you"
        showTabs
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
        ]}
        activeTab={topQueriesFilter}
        onTabChange={(value) =>
          handleTopQueriesFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Top Queries", width: "w-[200px]" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topQueriesData.map((item) => ({
          key: item.query,
          impressions: {
            value: item.impressions,
            change: item.impressionsTrend?.isInfinity
              ? Infinity
              : item.impressionsTrend?.trend === "up"
                ? Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10
                : -(Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10),
          },
          clicks: {
            value: item.clicks,
            change: item.clicksTrend?.isInfinity
              ? Infinity
              : item.clicksTrend?.trend === "up"
                ? Math.round((item.clicksTrend?.value ?? 0) * 10) / 10
                : -(Math.round((item.clicksTrend?.value ?? 0) * 10) / 10),
          },
        }))}
        isLoading={isLoading}
        hasData={hasTopQueriesData}
        sortConfig={topQueriesSort}
        onSort={(column) => handleTopQueriesSort(column as SortColumn)}
        onArrowClick={() => setModalOpen(true)}
        onRowClick={onRowClick ? (row) => onRowClick(String(row.key)) : undefined}
        maxRows={5}
      />

      <DataTableModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Searches to discover you"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={topQueriesFilter}
        onTabChange={(value) =>
          handleTopQueriesFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Top Queries" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topQueriesData.map((item) => ({
          key: item.query,
          impressions: {
            value: item.impressions,
            change: item.impressionsTrend?.isInfinity
              ? Infinity
              : item.impressionsTrend?.trend === "up"
                ? Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10
                : -(Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10),
          },
          clicks: {
            value: item.clicks,
            change: item.clicksTrend?.isInfinity
              ? Infinity
              : item.clicksTrend?.trend === "up"
                ? Math.round((item.clicksTrend?.value ?? 0) * 10) / 10
                : -(Math.round((item.clicksTrend?.value ?? 0) * 10) / 10),
          },
        }))}
        sortConfig={topQueriesSort}
        onSort={(column) => handleTopQueriesSort(column as SortColumn)}
        isLoading={isLoading}
      />
    </>
  );
}
