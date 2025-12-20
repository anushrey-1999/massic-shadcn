"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { LandscapeRow } from "@/types/landscape-types";
import { Typography } from "@/components/ui/typography";
import { Link, Hash } from "lucide-react";

export function getLandscapeTableColumns(): ColumnDef<LandscapeRow>[] {
  return [
    {
      id: "url",
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="URL" disableHide={true} />
      ),
      cell: ({ row }) => {
        const url = row.getValue("url") as string;
        return (
          <Typography variant="p" className="truncate" title={url}>
            {url || "-"}
          </Typography>
        );
      },
      meta: {
        label: "URL",
        placeholder: "Search URLs...",
        variant: "text",
        icon: Link,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 400,
      minSize: 250,
      maxSize: 600,
      filterFn: (row, id, value) => {
        const url = row.getValue(id) as string;
        if (!value) return true;
        return url?.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: "frequency",
      accessorKey: "frequency",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Frequency" disableHide={true} />
      ),
      cell: ({ cell }) => {
        const frequency = cell.getValue<number>();
        return (
          <Typography variant="p">{frequency.toLocaleString()}</Typography>
        );
      },
      enableSorting: true,
      size: 130,
      minSize: 100,
      maxSize: 200,
    },
  ];
}
