"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import type { ContentSeriesRow } from "@/types/content-series-types";
import { getContentSeriesTableColumns } from "./content-series-table-columns";

interface ContentSeriesTableProps {
  data: ContentSeriesRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: ContentSeriesRow) => void;
}

export function ContentSeriesTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: ContentSeriesTableProps) {
  const columns = React.useMemo(
    () => getContentSeriesTableColumns({}),
    []
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter: true,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
      sorting: [
        {
          field: "final_score",
          desc: true,
        },
      ],
    },
    queryKeys,
    getRowId: (originalRow: ContentSeriesRow) => originalRow.id,
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
        emptyMessage="No content series found. Try adjusting your filters or search."
        onRowClick={onRowClick}
        disableHorizontalScroll={false}
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
                placeholder="Search content..."
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
