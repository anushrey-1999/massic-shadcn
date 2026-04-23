"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { DigitalAdsRow } from "@/types/digital-ads-types";
import { Typography } from "@/components/ui/typography";

export function getSimplifiedTableColumns(): ColumnDef<DigitalAdsRow>[] {
  return [
    {
      id: "cluster_name",
      accessorKey: "cluster_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Subtopic" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate max-w-[200px]" title={row.getValue("cluster_name") as string}>
          {row.getValue("cluster_name")}
        </Typography>
      ),
      meta: {
        label: "Subtopic",
        placeholder: "Search subtopics...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      minSize: 120,
      maxSize: 220,
    },
    {
      id: "opportunity_score",
      accessorKey: "opportunity_score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Opp Score" />
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
        label: "Opp Score",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
  ];
}
