"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { DigitalAdsRow } from "@/types/digital-ads-types";
import { Typography } from "@/components/ui/typography";

export function getSimplifiedTableColumns(): ColumnDef<DigitalAdsRow>[] {
  return [
    {
      id: "cluster",
      accessorKey: "cluster",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Subtopic" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate max-w-[200px]" title={row.getValue("cluster") as string}>
          {row.getValue("cluster")}
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
      id: "intent_cluster_opportunity_score",
      accessorKey: "intent_cluster_opportunity_score",
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
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
  ];
}
