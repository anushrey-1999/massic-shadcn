"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import type { AudienceRow } from "@/types/audience-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getAudienceTableColumns } from "./audience-table-columns";

interface AudienceTableProps {
  data: AudienceRow[];
  pageCount: number;
  personaCounts?: Record<string, number>;
  arsRange?: { min: number; max: number };
  useCaseCounts?: Record<string, number>;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: AudienceRow) => void;
}

export function AudienceTable({
  data,
  pageCount,
  personaCounts = {},
  arsRange = { min: 0, max: 1 },
  useCaseCounts = {},
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: AudienceTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () =>
      getAudienceTableColumns({
        personaCounts,
        arsRange,
        useCaseCounts,
      }),
    [personaCounts, arsRange, useCaseCounts]
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
    },
    queryKeys,
    getRowId: (originalRow: AudienceRow) => originalRow.id,
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
        emptyMessage="No audience data found. Try adjusting your filters or check back later."
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
                placeholder="Search personas..."
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
