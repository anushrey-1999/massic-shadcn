"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableAdvancedToolbar } from "../../filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import type { Task } from "../../../types/data-table-types";
import { useDataTable } from "../../../hooks/use-data-table";
import type { QueryKeys } from "../../../types/data-table-types";
import { getTasksTableColumns } from "./tasks-table-columns";

interface TasksTableProps {
  data: Task[];
  pageCount: number;
  statusCounts: {
    todo: number;
    "in-progress": number;
    done: number;
    canceled: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
  };
  estimatedHoursRange: {
    min: number;
    max: number;
  };
  queryKeys?: Partial<QueryKeys>;
}

export function TasksTable({
  data,
  pageCount,
  statusCounts,
  priorityCounts,
  estimatedHoursRange,
  queryKeys,
}: TasksTableProps) {
  // Always use advanced filter
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () =>
      getTasksTableColumns({
        statusCounts,
        priorityCounts,
        estimatedHoursRange,
      }),
    [statusCounts, priorityCounts, estimatedHoursRange],
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      // Removed columnPinning since no actions column
      // Removed default sorting - let users choose their own sorting
    },
    queryKeys,
    getRowId: (originalRow: Task) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DataTable table={table}>
      <DataTableAdvancedToolbar table={table}>
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
