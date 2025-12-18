"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableAdvancedToolbar } from "../../filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import type { DigitalAdsRow } from "@/types/digital-ads-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getDigitalAdsTableColumns } from "./digital-ads-table-columns";

interface DigitalAdsTableProps {
  data: DigitalAdsRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: DigitalAdsRow) => void;
}

export function DigitalAdsTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: DigitalAdsTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () => getDigitalAdsTableColumns(),
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
    getRowId: (originalRow: DigitalAdsRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DataTable 
      table={table} 
      isLoading={isLoading}
      isFetching={isFetching}
      pageSizeOptions={[10, 30, 50, 100, 200]}
      emptyMessage="No digital ads opportunities found. Try adjusting your filters or check back later."
      onRowClick={onRowClick}
    >
      <DataTableAdvancedToolbar table={table}>
        {onSearchChange && (
          <DataTableSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search subtopics..."
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
