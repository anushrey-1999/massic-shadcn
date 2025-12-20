"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { DigitalAdsRow } from "@/types/digital-ads-types";
import { Typography } from "@/components/ui/typography";

export function getDigitalAdsTableColumns(): ColumnDef<DigitalAdsRow>[] {
  return [
    {
      id: "cluster",
      accessorKey: "cluster",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Ad Topics" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("cluster")}
        </Typography>
      ),
      meta: {
        label: "Ad Topics",
        placeholder: "Search ad topics...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "intent_cluster_opportunity_score",
      accessorKey: "intent_cluster_opportunity_score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Priority" />
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
        label: "Priority",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
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
        label: "Relevance",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "total_search_volume",
      accessorKey: "total_search_volume",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Volume" />
      ),
      cell: ({ cell }) => {
        const volume = cell.getValue<number>();
        const formatted = volume >= 10000 
          ? volume >= 1000000 
            ? `${(volume / 1000000).toFixed(1)}M`
            : `${(volume / 1000).toFixed(1)}K`
          : volume.toLocaleString();
        return (
          <Typography variant="p">{formatted}</Typography>
        );
      },
      meta: {
        label: "Volume",
        variant: "range",
        range: [0, 10000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "avg_cpc",
      accessorKey: "avg_cpc",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Avg CPC" />
      ),
      cell: ({ cell }) => {
        const cpc = cell.getValue<number>();
        return (
          <Typography variant="p">${cpc?.toFixed(2) || "0.00"}</Typography>
        );
      },
      meta: {
        label: "Avg CPC",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "comp_sum",
      accessorKey: "comp_sum",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Competition" />
      ),
      cell: ({ cell }) => {
        const comp = cell.getValue<number>();
        return (
          <Typography variant="p">{comp.toLocaleString()}</Typography>
        );
      },
      meta: {
        label: "Competition",
        variant: "range",
        range: [0, 1000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
  ];
}
