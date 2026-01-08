"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { AudienceRow } from "@/types/audience-types";
import { Typography } from "@/components/ui/typography";

export function getPersonaSplitTableColumns(): ColumnDef<AudienceRow>[] {
  return [
    {
      id: "persona_name",
      accessorKey: "persona_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Personas" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate max-w-[150px]" title={row.getValue("persona_name") as string}>
          {row.getValue("persona_name")}
        </Typography>
      ),
      meta: {
        label: "Personas",
        placeholder: "Search personas...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 150,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "ars",
      accessorKey: "ars",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Relevance" />
      ),
      cell: ({ cell }) => {
        const score = cell.getValue<number>();
        return (
          <div className="flex items-center">
            <RelevancePill score={score || 0} />
          </div>
        );
      },
      meta: {
        label: "ARS",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 100,
      minSize: 90,
      maxSize: 120,
    },
  ];
}
