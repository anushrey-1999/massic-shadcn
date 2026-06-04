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
import { DownloadCsvButton } from "@/components/ui/download-csv-button";

interface StrategyTableProps {
  businessId?: string;
  data: StrategyRow[];
  pageCount: number;
  offeringCounts?: Record<string, number>;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: StrategyRow) => void;
  toolbarRightPrefix?: React.ReactNode;
  columnVisibilityKey?: string;
  onDownloadCsv?: () => void | Promise<void>;
}

export function StrategyTable({
  businessId,
  data,
  pageCount,
  offeringCounts = {},
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
  toolbarRightPrefix,
  columnVisibilityKey,
  onDownloadCsv,
}: StrategyTableProps) {
  // Always use advanced filter
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () =>
      getStrategyTableColumns({
        businessId,
        offeringCounts,
      }),
    [businessId, offeringCounts]
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
      columnVisibility: {
        offerings: false,
        cluster_names: false,
      },
    },
    queryKeys,
    getRowId: (originalRow: StrategyRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
    persistColumnVisibility: Boolean(columnVisibilityKey),
    columnVisibilityKey,
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
                debounceMs={500}
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
            {onDownloadCsv && (
              <DownloadCsvButton onDownload={onDownloadCsv} disabled={data.length === 0} />
            )}
            {toolbarRightPrefix}
          </div>
        </div>
      </DataTable>
    </div>
  );
}
