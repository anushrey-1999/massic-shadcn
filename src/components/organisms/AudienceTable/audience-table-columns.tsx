"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  TrendingUp,
  Users,
} from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { AudienceRow } from "@/types/audience-types";
import { Typography } from "@/components/ui/typography";

interface GetAudienceTableColumnsProps {
  personaCounts?: Record<string, number>;
  arsRange?: { min: number; max: number };
  useCaseCounts?: Record<string, number>;
}

export function getAudienceTableColumns({
  personaCounts = {},
  arsRange = { min: 0, max: 1 },
  useCaseCounts = {},
}: GetAudienceTableColumnsProps): ColumnDef<AudienceRow>[] {
  return [
    {
      id: "persona_name",
      accessorKey: "persona_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Personas" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("persona_name")}
        </Typography>
      ),
      meta: {
        label: "Personas",
        placeholder: "Search personas...",
        variant: "text",
        icon: Users,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "ars",
      accessorKey: "ars",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="ARS" />
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
        range: [arsRange.min, arsRange.max],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
  ];
}
