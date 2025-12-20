"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { Typography } from "@/components/ui/typography";
import { Building2, Hash } from "lucide-react";

export interface StrategyClusterRow {
  id: string;
  cluster: string;
  keywords: string[];
  topic: string;
}

export function getStrategyClustersTableColumns(): ColumnDef<StrategyClusterRow>[] {
  return [
    {
      id: "cluster",
      accessorKey: "cluster",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Cluster" disableHide={true} />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("cluster")}
        </Typography>
      ),
      meta: {
        label: "Cluster",
        placeholder: "Search clusters...",
        variant: "text",
        icon: Building2,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 200,
      minSize: 150,
      maxSize: undefined,
    },
    {
      id: "keywords",
      accessorFn: (row) => row.keywords,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Keywords" disableHide={true} />
      ),
      cell: ({ row }) => {
        const keywords = row.original.keywords || [];
        return (
          <div className="max-w-full">
            <ExpandablePills items={keywords} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Keywords",
        placeholder: "Search keywords...",
        variant: "text",
        icon: Hash,
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: undefined,
      minSize: 200,
      maxSize: undefined,
    },
  ];
}
