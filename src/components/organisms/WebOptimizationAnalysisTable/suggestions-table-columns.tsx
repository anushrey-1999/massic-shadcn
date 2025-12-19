"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import type { WebOptimizationSuggestion } from "@/types/web-optimization-analysis-types";

export interface WebOptimizationSuggestionRow extends WebOptimizationSuggestion {
  id: string;
}

export function getWebOptimizationSuggestionsColumns(): ColumnDef<WebOptimizationSuggestionRow>[] {
  return [
    {
      id: "category",
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Category" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate" title={row.getValue("category") as string}>
          {row.getValue("category")}
        </Typography>
      ),
      meta: {
        label: "Category",
        placeholder: "Search categories...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "action",
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Action" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate" title={row.getValue("action") as string}>
          {row.getValue("action")}
        </Typography>
      ),
      meta: {
        label: "Action",
        placeholder: "Search actions...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 560,
      minSize: 300,
      maxSize: 800,
    },
  ];
}
