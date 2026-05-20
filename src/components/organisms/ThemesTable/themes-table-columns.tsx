"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";

const textFilterOperators = [
  { label: "Contains", value: "iLike" as const },
  { label: "Is", value: "eq" as const },
  { label: "Does not contain", value: "notILike" as const },
];

export function getThemesTableColumns(): ColumnDef<ThemeRow>[] {
  return [
    {
      id: "theme_name",
      accessorKey: "theme_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Theme" disableHide={true} />
      ),
      cell: ({ row }) => {
        const name = row.getValue("theme_name") as string;
        return (
          <Typography variant="p" className="truncate" title={name}>
            {name || "-"}
          </Typography>
        );
      },
      meta: {
        label: "Theme",
        placeholder: "Search themes...",
        variant: "text",
        operators: textFilterOperators,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 300,
      minSize: 200,
      filterFn: (row, id, value) => {
        const name = row.getValue(id) as string;
        if (!value) return true;
        return name?.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue("offerings") as string[];
        return (
          <Typography variant="p">
            {offerings?.length ?? 0}
          </Typography>
        );
      },
      meta: {
        label: "Offerings",
        placeholder: "Search offerings...",
        variant: "text",
        operators: textFilterOperators,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 150,
      minSize: 120,
      maxSize: 250,
    },
    {
      id: "topics",
      accessorKey: "topics",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Topics" />
      ),
      cell: ({ row }) => {
        return (
          <Typography variant="p">
            {row.original.topics?.length ?? 0}
          </Typography>
        );
      },
      meta: {
        label: "Topics",
        placeholder: "Search topics...",
        variant: "text",
        operators: textFilterOperators,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 200,
      minSize: 150,
      maxSize: 300,
    },
  ];
}
