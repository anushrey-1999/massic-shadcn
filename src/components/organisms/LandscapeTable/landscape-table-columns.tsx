"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LandscapeRow } from "@/types/landscape-types";
import { Typography } from "@/components/ui/typography";
import { Link, Hash } from "lucide-react";

export function getLandscapeTableColumns(): ColumnDef<LandscapeRow>[] {
  return [
    {
      id: "url",
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.getValue("url") as string;
        return (
          <Typography variant="p" className="truncate" title={url}>
            {url || "-"}
          </Typography>
        );
      },
      enableSorting: true,
    },
    {
      id: "frequency",
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ cell }) => {
        const frequency = cell.getValue<number>();
        return (
          <Typography variant="p">{frequency.toLocaleString()}</Typography>
        );
      },
      enableSorting: true,
    },
  ];
}
