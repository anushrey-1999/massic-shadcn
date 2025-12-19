"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import type { StrategyRow } from "@/types/strategy-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getStrategyTableColumns } from "./strategy-table-columns";

interface StrategyTableProps {
  data: StrategyRow[];
  pageCount: number;
  offeringCounts?: Record<string, number>;
  businessRelevanceRange?: { min: number; max: number };
  topicCoverageRange?: { min: number; max: number };
  searchVolumeRange?: { min: number; max: number };
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: StrategyRow) => void;
}

export function StrategyTable({
  data,
  pageCount,
  offeringCounts = {},
  businessRelevanceRange = { min: 0, max: 1 },
  topicCoverageRange = { min: 0, max: 1 },
  searchVolumeRange = { min: 0, max: 10000 },
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: StrategyTableProps) {
  // Always use advanced filter
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () =>
      getStrategyTableColumns({
        offeringCounts,
        businessRelevanceRange,
        topicCoverageRange,
        searchVolumeRange,
      }),
    [offeringCounts, businessRelevanceRange, topicCoverageRange, searchVolumeRange]
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      sorting: [{ id: "business_relevance_score", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
      columnVisibility: {
        offerings: false,
      },
    },
    queryKeys,
    getRowId: (originalRow: StrategyRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <DataTable 
        table={table} 
        isLoading={isLoading}
        isFetching={isFetching}
        pageSizeOptions={[10, 30, 50, 100, 200]}
        emptyMessage="No strategy topics found. Try adjusting your filters or check back later."
        onRowClick={onRowClick}
        disableHorizontalScroll={true}
      >
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onSearchChange && (
              <DataTableSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Search topics, clusters, keywords..."
              />
            )}
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              align="start"
            />
          </div>
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <DataTableViewOptions table={table} align="end" />
          </div>
        </div>
      </DataTable>
    </div>
  );
}
