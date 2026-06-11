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
import { type DeepdiveApiFilter } from "@/hooks/use-organic-deepdive-filters";
import { Button } from "@/components/ui/button";
import { ContentGroupsIcon } from "@/components/molecules/analytics/ContentGroupsIcon";
import { CustomContentGroupsModal } from "@/components/molecules/analytics/CustomContentGroupsModal";

interface ContentGroupsSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveApiFilter[];
  onRowClick?: (group: string, source?: "custom" | "default") => void;
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

  const [customModalOpen, setCustomModalOpen] = useState(false);

  const tableData = contentGroupsData.map((item) => ({
    key: item.displayName || item.group,
    _rawGroup: item.group,
    _source: item.source,
    impressions: {
      value: item.impressions,
      rawValue: item.impressions,
      previousValue: item.previousImpressions,
      change: item.impressionsTrend?.isInfinity
        ? Infinity
        : item.impressionsTrend?.trend === "up"
          ? Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10
          : -(Math.round((item.impressionsTrend?.value ?? 0) * 10) / 10),
    },
    clicks: {
      value: item.clicks,
      rawValue: item.clicks,
      previousValue: item.previousClicks,
      change: item.clicksTrend?.isInfinity
        ? Infinity
        : item.clicksTrend?.trend === "up"
          ? Math.round((item.clicksTrend?.value ?? 0) * 10) / 10
          : -(Math.round((item.clicksTrend?.value ?? 0) * 10) / 10),
    },
  }));

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
        data={tableData}
        isLoading={isLoading}
        hasData={hasContentGroupsData}
        emptyState={
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="max-w-[260px] text-sm text-[#737373]">
              No content groups yet. Define custom content groups to start clustering related pages.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[8px] border-[#D4D4D4] bg-white px-4 text-[14px] font-medium text-[#0A0A0A]"
              onClick={(event) => {
                event.stopPropagation();
                setCustomModalOpen(true);
              }}
            >
              Define Content Groups
            </Button>
          </div>
        }
        sortConfig={contentGroupsSort}
        onSort={(column) => handleContentGroupsSort(column as SortColumn)}
        onArrowClick={() => setCustomModalOpen(true)}
        onRowClick={
          onRowClick
            ? (row) =>
                onRowClick(
                  String(row._rawGroup || row.key),
                  row._source === "custom" ? "custom" : "default"
                )
            : undefined
        }
        maxRows={5}
        renderFirstColumn={(row, value) =>
          row._source === "custom" ? (
            <>
              <span className="truncate">{value}</span>
              <ContentGroupsIcon className="h-[13px] w-[13px] shrink-0 text-[#2E6A56]" />
            </>
          ) : (
            <span className="truncate">{value}</span>
          )
        }
      />

      <CustomContentGroupsModal
        open={customModalOpen}
        onOpenChange={setCustomModalOpen}
        businessUniqueId={businessUniqueId}
        siteUrl={website}
        period={period}
        trafficScope="organic"
      />
    </>
  );
}
