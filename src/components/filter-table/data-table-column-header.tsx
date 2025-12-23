"use client";

import type { Column } from "@tanstack/react-table";
import * as React from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentPropsWithoutRef<"button"> {
  column: Column<TData, TValue>;
  label: string;
  disableHide?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  label,
  className,
  disableHide = false,
  onClick,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();

  if (!canSort) {
    return <div className={cn(className)}>{label}</div>;
  }

  const sortState = column.getIsSorted();
  const toggleSorting = column.getToggleSortingHandler();

  return (
    <button
      type="button"
      className={cn(
        "-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      aria-sort={
        sortState === "asc"
          ? "ascending"
          : sortState === "desc"
            ? "descending"
            : "none"
      }
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        // Delegate to TanStack handler so multi-sort works correctly.
        // Table-level config decides multi vs single:
        // - Server-side (useDataTable): isMultiSortEvent => true (always append)
        // - Client-side (useLocalDataTable): isMultiSortEvent => false (always replace)
        toggleSorting?.(event);
      }}
    >
      {label}
      {sortState === "desc" ? (
        <ChevronDown />
      ) : sortState === "asc" ? (
        <ChevronUp />
      ) : (
        <ChevronsUpDown />
      )}
    </button>
  );
}
