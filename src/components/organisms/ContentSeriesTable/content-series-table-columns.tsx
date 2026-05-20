"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import type { ContentSeriesRow } from "@/types/content-series-types";

function formatVolume(value: number): string {
  const volume = Number(value || 0);
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 10_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString();
}

interface GetContentSeriesTableColumnsProps {
  compact?: boolean;
}

export function getContentSeriesTableColumns({
  compact = false,
}: GetContentSeriesTableColumnsProps): ColumnDef<ContentSeriesRow>[] {
  const mainColumns: ColumnDef<ContentSeriesRow>[] = [
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Title" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate" title={row.getValue<string>("title")}>
          {row.getValue("title")}
        </Typography>
      ),
      meta: {
        label: "Title",
        placeholder: "Search titles...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: compact ? 190 : 260,
      minSize: compact ? 160 : 200,
      maxSize: compact ? 240 : 420,
    },
    {
      id: "final_score",
      accessorKey: "final_score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Priority" />
      ),
      cell: ({ cell }) => (
        <div className="flex items-center">
          <RelevancePill score={cell.getValue<number>() || 0} />
        </div>
      ),
      meta: {
        label: "Priority",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: compact ? 110 : 130,
      minSize: 100,
      maxSize: compact ? 130 : 160,
    },
  ];

  if (compact) return mainColumns;

  return [
    ...mainColumns.slice(0, 1),
    {
      id: "cluster_name",
      accessorKey: "cluster_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Cluster" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate capitalize" title={row.getValue<string>("cluster_name")}>
          {row.getValue("cluster_name")}
        </Typography>
      ),
      meta: {
        label: "Cluster",
        placeholder: "Search clusters...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 240,
      minSize: 180,
      maxSize: 360,
    },
    {
      id: "intent",
      accessorKey: "intent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Intent" />
      ),
      cell: ({ row }) => {
        const intent = row.getValue<string>("intent");
        return intent ? (
          <Badge variant="outline" className="capitalize">
            {intent}
          </Badge>
        ) : (
          <Typography variant="p" className="text-muted-foreground">-</Typography>
        );
      },
      meta: {
        label: "Intent",
        variant: "select",
        placeholder: "Select intent...",
        options: [
          { label: "Informational", value: "informational" },
          { label: "Commercial", value: "commercial" },
          { label: "Transactional", value: "transactional" },
          { label: "Navigational", value: "navigational" },
        ],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
    },
    mainColumns[1],
    {
      id: "search_volume",
      accessorKey: "search_volume",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Volume" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p">{formatVolume(cell.getValue<number>())}</Typography>
      ),
      meta: {
        label: "Volume",
        variant: "range",
        range: [0, 10000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
    {
      id: "br_score",
      accessorKey: "br_score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Relevance" />
      ),
      cell: ({ cell }) => (
        <div className="flex items-center">
          <RelevancePill score={cell.getValue<number>() || 0} />
        </div>
      ),
      meta: {
        label: "Relevance",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
  ];
}
