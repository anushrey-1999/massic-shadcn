"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import { Radio, Tv } from "lucide-react";
import type { TvRadioAdConceptRow, TvRadioChannel } from "@/types/tv-radio-ads-types";

function formatVolume(value: number): string {
  const volume = Number(value || 0);
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 10_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString();
}

function TypeCell({ value }: { value: TvRadioChannel }) {
  return (
    <div className="flex items-center gap-2">
      {value === "Radio" ? (
        <Radio className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Tv className="h-4 w-4 text-muted-foreground" />
      )}
      <Typography variant="p">{value}</Typography>
    </div>
  );
}

export function getTvRadioAdsTableColumns(): ColumnDef<TvRadioAdConceptRow>[] {
  return [
    {
      id: "subtopic",
      accessorKey: "subtopic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Subtopic" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("subtopic")}
        </Typography>
      ),
      meta: {
        label: "Subtopic",
        placeholder: "Search subtopics...",
        variant: "text",
        apiField: "display_name",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 360,
      minSize: 240,
      maxSize: 520,
    },
    {
      id: "type",
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ cell }) => <TypeCell value={cell.getValue<TvRadioChannel>()} />,
      meta: {
        label: "Type",
        variant: "text",
        placeholder: "TV or Radio...",
        apiField: "channel",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "relevance",
      accessorKey: "relevance",
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
        range: [0, 1],
        apiField: "avg_business_relevance",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "opp_score",
      accessorKey: "opp_score",
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
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "volume",
      accessorKey: "volume",
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
        apiField: "total_search_volume",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
    },
  ];
}

export function getTvRadioAdsSplitViewColumns(): ColumnDef<TvRadioAdConceptRow>[] {
  return [
    {
      id: "subtopic",
      accessorKey: "subtopic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Subtopic" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("subtopic")}
        </Typography>
      ),
      meta: {
        label: "Subtopic",
        placeholder: "Search subtopics...",
        variant: "text",
        apiField: "display_name",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      minSize: 150,
      maxSize: 220,
    },
    {
      id: "type",
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ cell }) => <TypeCell value={cell.getValue<TvRadioChannel>()} />,
      meta: {
        label: "Type",
        variant: "text",
        placeholder: "TV or Radio...",
        apiField: "channel",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
    {
      id: "opp_score",
      accessorKey: "opp_score",
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
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
  ];
}
