"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";
import { getWebOptimizationAnalysisTableColumns } from "./web-optimization-analysis-table-columns";

interface WebOptimizationAnalysisTableProps {
  data: WebOptimizationAnalysisRow[];
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: WebOptimizationAnalysisRow) => void;
}

export function WebOptimizationAnalysisTable({
  data,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
}: WebOptimizationAnalysisTableProps) {
  const columns = React.useMemo(() => getWebOptimizationAnalysisTableColumns(), []);

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      sorting: [{ id: "ops", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: WebOptimizationAnalysisRow) => originalRow.id,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      isFetching={isFetching}
      pageSizeOptions={[10, 30, 50, 100, 200]}
      emptyMessage="No optimization opportunities found. Try adjusting your filters or check back later."
      onRowClick={onRowClick}
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
              placeholder="Search pages, opportunity, suggestions, or metrics..."
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataTableSortList table={table} align="start" />
          <DataTableViewOptions table={table} align="end" />
        </div>
      </div>
    </DataTable>
  );
}
