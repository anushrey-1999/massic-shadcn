"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { DataTable } from "@/components/filter-table/index";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SplitTableViewProps<TLeftData, TRightData> {
  // Left table props
  leftTable: Table<TLeftData>;
  leftEmptyMessage?: string;
  leftTableProps?: {
    onRowClick?: (row: TLeftData) => void;
    selectedRowId?: string | null;
    showPagination?: boolean;
    pageSizeOptions?: number[];
    hideRowsPerPage?: boolean;
    paginationAlign?: "left" | "right" | "between";
  };

  // Right table props
  rightTable: Table<TRightData>;
  rightEmptyMessage?: string;
  rightTableProps?: {
    showPagination?: boolean;
    pageSizeOptions?: number[];
  };

  // Unified controls
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchColumnIds?: {
    left?: string;
    right?: string;
  };

  // Table hooks props (for filter list)
  leftTableHooks?: {
    shallow?: boolean;
    debounceMs?: number;
    throttleMs?: number;
  };
  rightTableHooks?: {
    shallow?: boolean;
    debounceMs?: number;
    throttleMs?: number;
  };

  // Column mapping for syncing
  columnMapping?: Record<string, string>;

  // Layout
  leftTableWidth?: string;
  rightTableWidth?: string;
  gap?: string;

  // Back button
  onBack?: () => void;

  // Whether to show filter list (FilterList writes to URL params)
  showFilters?: boolean;
}

export function SplitTableView<TLeftData, TRightData>({
  leftTable,
  leftEmptyMessage = "No data found.",
  leftTableProps = {},
  rightTable,
  rightEmptyMessage = "No data found.",
  rightTableProps = {},
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchColumnIds,
  leftTableHooks = {},
  rightTableHooks = {},
  columnMapping = {},
  leftTableWidth = "35%",
  rightTableWidth = "65%",
  gap = "1rem",
  onBack,
  showFilters = true,
}: SplitTableViewProps<TLeftData, TRightData>) {
  // Memoize searchable columns to avoid finding them on every render
  const leftSearchableColumn = React.useMemo(() => {
    if (searchColumnIds?.left) {
      return leftTable.getColumn(searchColumnIds.left);
    }
    return leftTable.getAllColumns().find(
      (col) => col.getCanFilter() && col.columnDef.meta?.variant === "text"
    );
  }, [leftTable, searchColumnIds?.left]);

  const rightSearchableColumn = React.useMemo(() => {
    if (searchColumnIds?.right) {
      return rightTable.getColumn(searchColumnIds.right);
    }
    return rightTable.getAllColumns().find(
      (col) => col.getCanFilter() && col.columnDef.meta?.variant === "text"
    );
  }, [rightTable, searchColumnIds?.right]);

  // Apply search to both tables - memoized to prevent unnecessary updates
  React.useEffect(() => {
    if (search) {
      leftSearchableColumn?.setFilterValue(search);
      rightSearchableColumn?.setFilterValue(search);
    } else {
      leftSearchableColumn?.setFilterValue(undefined);
      rightSearchableColumn?.setFilterValue(undefined);
    }
  }, [search, leftSearchableColumn, rightSearchableColumn]);

  // Sync column filters between tables - only sync when there's an explicit column mapping
  const isSyncingFilters = React.useRef(false);
  React.useEffect(() => {
    if (isSyncingFilters.current) {
      isSyncingFilters.current = false;
      return;
    }

    const leftFilters = leftTable.getState().columnFilters;
    if (leftFilters.length === 0) return;

    isSyncingFilters.current = true;
    leftFilters.forEach((filter) => {
      const columnId = filter.id;
      const mappedColumnId = columnMapping[columnId];

      // Only sync if there's an explicit mapping
      if (!mappedColumnId) return;

      const rightColumn = rightTable.getColumn(mappedColumnId);
      if (rightColumn && rightColumn.getFilterValue() !== filter.value) {
        rightColumn.setFilterValue(filter.value);
      }
    });
    isSyncingFilters.current = false;
  }, [leftTable.getState().columnFilters, rightTable, columnMapping]);

  // Sync sorting between tables - only sync when there's an explicit column mapping
  // This prevents trying to sync left-only columns to the right table
  const isSyncingSort = React.useRef(false);
  const lastSyncedLeftSort = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (isSyncingSort.current) {
      isSyncingSort.current = false;
      return;
    }

    const leftSort = leftTable.getState().sorting;
    if (leftSort.length === 0) {
      lastSyncedLeftSort.current = null;
      return;
    }

    const sort = leftSort[0];
    const leftSortSignature = `${sort.id}:${sort.desc ? "desc" : "asc"}`;
    if (lastSyncedLeftSort.current === leftSortSignature) return;

    // Mark this left-sort as handled immediately so right-side user sorting
    // doesn't get overwritten on re-renders.
    lastSyncedLeftSort.current = leftSortSignature;

    // Only sync if there's an explicit mapping in columnMapping
    const mappedColumnId = columnMapping[sort.id];

    // Don't sync if there's no mapping - let UnifiedSortList handle independent sorting
    if (!mappedColumnId) return;

    const rightColumn = rightTable.getColumn(mappedColumnId);

    // Only proceed if the mapped column exists in the right table
    if (rightColumn) {
      const currentRightSort = rightTable.getState().sorting;
      const needsUpdate = !currentRightSort.some(
        (s) => s.id === mappedColumnId && s.desc === sort.desc
      );

      if (needsUpdate) {
        isSyncingSort.current = true;
        rightTable.setSorting([{ id: mappedColumnId, desc: sort.desc }]);
        isSyncingSort.current = false;
      }
    }
  }, [leftTable.getState().sorting, rightTable, columnMapping]);

  return (
    <div className="bg-white rounded-lg p-4 flex-1 min-h-0 flex flex-col">
      {/* Unified Toolbar - Controls both tables */}
      <div className="shrink-0 mb-4">
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {onSearchChange && (
              <DataTableSearch
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div
        className="flex-1 min-h-0 flex"
        style={{ gap, alignItems: 'stretch' }}
      >
        <div
          className="flex flex-col shrink-0 h-full overflow-hidden"
          style={{ width: leftTableWidth, minWidth: 0, maxWidth: leftTableWidth }}
        >
          <DataTable
            table={leftTable}
            isLoading={false}
            isFetching={false}
            pageSizeOptions={leftTableProps.pageSizeOptions || [10, 30, 50, 100, 200]}
            emptyMessage={leftEmptyMessage}
            onRowClick={leftTableProps.onRowClick}
            selectedRowId={leftTableProps.selectedRowId}
            showPagination={leftTableProps.showPagination !== false}
            hideRowsPerPage={leftTableProps.hideRowsPerPage}
            paginationAlign={leftTableProps.paginationAlign || "right"}
            disableHorizontalScroll={true}
            className="h-full"
          />
        </div>
        <div
          className="flex flex-col flex-1 min-w-0 h-full overflow-hidden"
        >
          <DataTable
            table={rightTable}
            isLoading={false}
            isFetching={false}
            pageSizeOptions={rightTableProps.pageSizeOptions || [10, 30, 50, 100, 200]}
            emptyMessage={rightEmptyMessage}
            showPagination={rightTableProps.showPagination !== false}
            className="h-full"
            disableHorizontalScroll={true}
          />
        </div>
      </div>
    </div>
  );
}
