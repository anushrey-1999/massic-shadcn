"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import type { TopicSignalRow } from "@/types/topic-signals-types";
import { getTopicSignalsTableColumns } from "./topic-signals-table-columns";

interface TopicSignalsTableProps {
  data: TopicSignalRow[];
  pageCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: TopicSignalRow) => void;
  toolbarRightPrefix?: React.ReactNode;
  selectedRowId?: string | null;
  compact?: boolean;
}

export function TopicSignalsTable({
  data,
  pageCount,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onRowClick,
  toolbarRightPrefix,
  selectedRowId,
  compact = false,
}: TopicSignalsTableProps) {
  const columns = React.useMemo(() => getTopicSignalsTableColumns(), []);
  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter: !compact,
    initialState: {
      sorting: [{ field: "display_rank", desc: false }],
      pagination: {
        pageIndex: 0,
        pageSize: compact ? 24 : 100,
      },
      columnVisibility: compact
        ? {
            confidence: false,
            growth: false,
            trend_geography: false,
            local_volume: false,
            seasonal_peak_months: false,
            ramp_state: false,
            momentum: false,
            display_rank: false,
          }
        : {
            display_rank: false,
            momentum: false,
            seasonal_peak_months: false,
            ramp_state: false,
          },
    },
    queryKeys: {
      page: compact ? "signalsDetailPage" : "signalsPage",
      perPage: compact ? "signalsDetailPerPage" : "signalsPerPage",
      sort: compact ? "signalsDetailSort" : "signalsSort",
      filters: compact ? "signalsDetailFilters" : "signalsFilters",
      joinOperator: compact ? "signalsDetailJoinOperator" : "signalsJoinOperator",
    },
    getRowId: (row) => String(row.id),
    shallow: false,
    clearOnDefault: true,
    persistColumnVisibility: !compact,
    columnVisibilityKey: !compact ? "topic-signals-columns" : undefined,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        pageSizeOptions={compact ? [10, 24, 50] : [10, 30, 50, 100, 200]}
        emptyMessage="No topic signals found."
        onRowClick={onRowClick}
        selectedRowId={selectedRowId}
        showPagination={true}
        hideRowsPerPage={compact}
        paginationAlign={compact ? "left" : "right"}
        disableHorizontalScroll={compact}
        className="h-full"
      >
        {!compact && (
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
                  placeholder="Search signal topics..."
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
              {toolbarRightPrefix}
            </div>
          </div>
        )}
      </DataTable>
    </div>
  );
}
