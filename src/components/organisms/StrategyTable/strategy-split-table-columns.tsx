"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { StrategyRow } from "@/types/strategy-types";
import { Typography } from "@/components/ui/typography";
import { Tag, TrendingUp } from "lucide-react";
import { StrategyTopicCtas } from "./strategy-topic-ctas";

export function getStrategySplitTableColumns({
  businessId,
}: {
  businessId?: string;
} = {}): ColumnDef<StrategyRow>[] {
  return [
    {
      id: "topic",
      accessorKey: "topic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Topic" />
      ),
      cell: ({ row }) => (
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <Typography variant="p" className="min-w-0 flex-1 truncate" title={row.getValue("topic") as string}>
            {row.getValue("topic")}
          </Typography>
          <StrategyTopicCtas businessId={businessId} row={row.original} className="ml-0" />
        </div>
      ),
      meta: {
        label: "Topic",
        placeholder: "Search topics...",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 200,
      minSize: 120,
      maxSize: undefined,
    },
    {
      id: "business_relevance_score",
      accessorKey: "business_relevance_score",
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
        label: "Business Relevance",
        variant: "range",
        range: [0, 1],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 100,
      maxSize: undefined,
    },
  ];
}
