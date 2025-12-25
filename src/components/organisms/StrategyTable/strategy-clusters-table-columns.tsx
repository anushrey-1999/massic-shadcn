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

interface StrategyClustersColumnsOptions {
  expandedRowId?: string | null;
  onExpandedRowChange?: (rowId: string | null) => void;
}

export function getStrategyClustersTableColumns(
  options: StrategyClustersColumnsOptions = {}
): ColumnDef<StrategyClusterRow>[] {
  const { expandedRowId = null, onExpandedRowChange } = options;

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
        const rowId = row.original.id;
        const isExpanded = !!expandedRowId && expandedRowId === rowId;

        return (
          <div className="max-w-full">
            <ExpandablePills
              items={keywords}
              pillVariant="outline"
              expanded={isExpanded}
              onExpandedChange={(next) => {
                if (!onExpandedRowChange) return;
                onExpandedRowChange(next ? rowId : null);
              }}
            />
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
