"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { AudienceUseCaseRow } from "@/types/audience-types";
import { Typography } from "@/components/ui/typography";

export function getUseCaseTableColumns(): ColumnDef<AudienceUseCaseRow>[] {
  return [
    {
      id: "use_case_name",
      accessorKey: "use_case_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Use Case" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate max-w-[200px]" title={row.getValue("use_case_name") as string}>
          {row.getValue("use_case_name")}
        </Typography>
      ),
      meta: {
        label: "Use Case",
        placeholder: "Search use cases...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
  ];
}
