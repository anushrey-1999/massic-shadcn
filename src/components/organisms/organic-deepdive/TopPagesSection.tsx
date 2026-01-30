"use client";

import { useState } from "react";
import { Eye, ListOrdered, TrendingUp, TrendingDown } from "lucide-react";
import {
  useGscTopPages,
  type TimePeriodValue,
  type TableFilterType,
  type SortColumn,
} from "@/hooks/use-gsc-top-pages";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

interface TopPagesSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveFilter[];
  onRowClick?: (page: string) => void;
}

export function TopPagesSection({
  businessUniqueId,
  website,
  period,
  filters = [],
  onRowClick,
}: TopPagesSectionProps) {
  const {
    data: topPagesData,
    filter: topPagesFilter,
    sort: topPagesSort,
    handleFilterChange: handleTopPagesFilterChange,
    handleSort: handleTopPagesSort,
    hasData: hasTopPagesData,
    isLoading,
  } = useGscTopPages(businessUniqueId, website, period, filters);

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DataTable
        icon={<></>}
        title="Content people are seeing"
        showTabs
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
        ]}
        activeTab={topPagesFilter}
        onTabChange={(value) =>
          handleTopPagesFilterChange(value as TableFilterType)
        }
        firstColumnTruncate="max-w-[300px]"
        columns={[
          { key: "key", label: "Top Pages", width: "w-[180px]" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topPagesData.map((item) => ({
          key: item.page,
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
        hasData={hasTopPagesData}
        sortConfig={topPagesSort}
        onSort={(column) => handleTopPagesSort(column as SortColumn)}
        onArrowClick={() => setModalOpen(true)}
        onRowClick={onRowClick ? (row) => onRowClick(String(row.key)) : undefined}
        maxRows={5}
      />

      <DataTableModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Top Pages"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={topPagesFilter}
        onTabChange={(value) =>
          handleTopPagesFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Top Page" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topPagesData.map((item) => ({
          key: item.page,
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
        sortConfig={topPagesSort}
        onSort={(column) => handleTopPagesSort(column as SortColumn)}
        isLoading={isLoading}
      />
    </>
  );
}
