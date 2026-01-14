"use client";

import type { Column } from "@tanstack/react-table";
import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
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
        "flex h-full w-full items-center justify-between gap-2 rounded-none px-2 py-[7.5px] text-left transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        sortState && "bg-accent text-foreground",
        "group [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
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
        toggleSorting?.(event);
      }}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={cn(
          sortState
            ? "[&_svg]:text-foreground"
            : "opacity-0 group-hover:opacity-80 transition-opacity duration-200 ease-in-out"
        )}
      >
        {sortState === "desc" ? (
          <ChevronDown />
        ) : sortState === "asc" ? (
          <ChevronUp />
        ) : (
          <ChevronsUpDown />
        )}
      </span>
    </button>
  );
}
