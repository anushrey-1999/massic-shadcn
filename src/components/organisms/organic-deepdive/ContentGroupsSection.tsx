"use client";

import { useState } from "react";
import { ListOrdered, TrendingUp, TrendingDown } from "lucide-react";
import {
  useGscContentGroups,
  type TimePeriodValue,
  type TableFilterType,
  type SortColumn,
} from "@/hooks/use-gsc-content-groups";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

interface ContentGroupsSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveFilter[];
  onRowClick?: (group: string) => void;
}

export function ContentGroupsSection({
  businessUniqueId,
  website,
  period,
  filters = [],
  onRowClick,
}: ContentGroupsSectionProps) {
  const {
    data: contentGroupsData,
    filter: contentGroupsFilter,
    sort: contentGroupsSort,
    handleFilterChange: handleContentGroupsFilterChange,
    handleSort: handleContentGroupsSort,
    hasData: hasContentGroupsData,
    isLoading,
  } = useGscContentGroups(businessUniqueId, website, period, filters);

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DataTable
        title="Content Groups"
        showTabs
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
        ]}
        activeTab={contentGroupsFilter}
        onTabChange={(value) =>
          handleContentGroupsFilterChange(value as TableFilterType)
        }
        firstColumnTruncate="max-w-[300px]"
        columns={[
          { key: "key", label: "Content Groups", width: "w-[180px]" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={contentGroupsData.map((item) => ({
          key: item.displayName || item.group,
          _rawGroup: item.group,
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
        hasData={hasContentGroupsData}
        sortConfig={contentGroupsSort}
        onSort={(column) => handleContentGroupsSort(column as SortColumn)}
        onArrowClick={() => setModalOpen(true)}
        onRowClick={onRowClick ? (row) => onRowClick(String(row._rawGroup || row.key)) : undefined}
        maxRows={5}
      />

      <DataTableModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Content Groups"
        icon={<></>}
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={contentGroupsFilter}
        onTabChange={(value) =>
          handleContentGroupsFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Content Group" },
          { key: "impressions", label: "Impr.", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={contentGroupsData.map((item) => ({
          key: item.displayName || item.group,
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
        sortConfig={contentGroupsSort}
        onSort={(column) => handleContentGroupsSort(column as SortColumn)}
        isLoading={isLoading}
      />
    </>
  );
}
