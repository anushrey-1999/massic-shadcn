"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Filter, ArrowUpDown, Share2 } from "lucide-react";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import type { TvRadioAdConceptRow } from "@/types/tv-radio-ads-types";
import { getTvRadioAdsTableColumns } from "./tv-radio-ads-table-columns";

interface TvRadioAdsTableProps {
  data: TvRadioAdConceptRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: TvRadioAdConceptRow) => void;
}

export function TvRadioAdsTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: TvRadioAdsTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(() => getTvRadioAdsTableColumns(), []);

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 24,
      },
    },
    queryKeys,
    getRowId: (originalRow: TvRadioAdConceptRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        pageSizeOptions={[10, 24, 50, 100]}
        emptyMessage="No TV & Radio ad concepts found. Try adjusting your filters or search."
        onRowClick={onRowClick}
        disableHorizontalScroll={true}
      >
        <div role="toolbar" aria-orientation="horizontal" className="flex w-full items-start justify-between gap-2 p-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onSearchChange && (
              <DataTableSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Search..."
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
