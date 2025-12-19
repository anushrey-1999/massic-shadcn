"use client";

import * as React from "react";
import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

interface UseLocalDataTableProps<TData>
  extends Omit<TableOptions<TData>, "state" | "getCoreRowModel"> {
  initialState?: Partial<TableState>;
}

export function useLocalDataTable<TData>(props: UseLocalDataTableProps<TData>) {
  const { columns, initialState, ...tableProps } = props;

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});
  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialState?.pagination ?? { pageIndex: 0, pageSize: 10 },
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState,
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
      size: 150,
      minSize: 50,
      maxSize: 500,
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  return { table };
}
