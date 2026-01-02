"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import type { WebPageRow } from "@/types/web-page-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getWebPageTableColumns } from "./web-page-table-columns";

interface WebPageTableProps {
  businessId: string;
  data: WebPageRow[];
  pageCount: number;
  offeringCounts?: Record<string, number>;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function WebPageTable({
  businessId,
  data,
  pageCount,
  offeringCounts = {},
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
}: WebPageTableProps) {
  const enableAdvancedFilter = true;


  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const columns = React.useMemo(
    () =>
      getWebPageTableColumns({
        businessId,
        offeringCounts,
        expandedRowId,
        onExpandedRowChange: setExpandedRowId,
      }),
    [businessId, offeringCounts, expandedRowId]
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
        status: false,
      },
    },
    queryKeys,
    getRowId: (originalRow: WebPageRow) => originalRow.id,
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
        emptyMessage="No web pages found. Try adjusting your filters or check back later."
        disableHorizontalScroll={true}
        onRowClick={(row) => {
          const rowId = (row as any).id;
          setExpandedRowId((prev) => (prev === rowId ? null : rowId));
        }}
        selectedRowId={expandedRowId}
        highlightSelectedRow={false}
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
                placeholder="Search pages, keywords..."
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
