"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableAdvancedToolbar } from "../../filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import type { WebPageRow } from "@/types/web-page-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getWebPageTableColumns } from "./web-page-table-columns";

interface WebPageTableProps {
  data: WebPageRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function WebPageTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
}: WebPageTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () => getWebPageTableColumns({}),
    []
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
    },
    queryKeys,
    getRowId: (originalRow: WebPageRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DataTable 
      table={table} 
      isLoading={isLoading}
      isFetching={isFetching}
      pageSizeOptions={[10, 30, 50, 100, 200]}
      emptyMessage="No web pages found. Try adjusting your filters or check back later."
    >
      <DataTableAdvancedToolbar table={table}>
        {onSearchChange && (
          <DataTableSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search pages, keywords..."
          />
        )}
        <DataTableSortList table={table} align="start" />
        <DataTableFilterList
          table={table}
          shallow={shallow}
          debounceMs={debounceMs}
          throttleMs={throttleMs}
          align="start"
        />
      </DataTableAdvancedToolbar>
    </DataTable>
  );
}
