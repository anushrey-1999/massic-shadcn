"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import type { UnifiedPageRow } from "@/hooks/use-unified-web-optimization";
import { getWebUnifiedPagesTableColumns } from "./web-unified-pages-table-columns";

interface WebUnifiedPagesTableProps {
  data: UnifiedPageRow[];
  businessId: string;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function WebUnifiedPagesTable({
  data,
  businessId,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
}: WebUnifiedPagesTableProps) {
  const columns = React.useMemo(
    () => getWebUnifiedPagesTableColumns({ businessId }),
    [businessId]
  );

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      sorting: [{ id: "ups", desc: true }],
      pagination: { pageIndex: 0, pageSize: 100 },
    },
    getRowId: (row: UnifiedPageRow) => row.id,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
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
                placeholder="Search pages, types..."
              />
            )}
            <DataTableFilterList table={table} shallow={true} align="start" />
          </div>
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} align="end" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          table={table}
          isLoading={isLoading}
          isFetching={isFetching}
          pageSizeOptions={[10, 30, 50, 100, 200]}
          emptyMessage="No pages found."
          disableHorizontalScroll={false}
          className="h-full"
        />
      </div>
    </div>
  );
}
