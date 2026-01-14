"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { DigitalAdsKeyword } from "@/types/digital-ads-types";
import { Typography } from "@/components/ui/typography";

export function getKeywordsTableColumns(): ColumnDef<DigitalAdsKeyword>[] {
  return [
    {
      id: "keyword",
      accessorKey: "keyword",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Keyword" disableHide={true} />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("keyword")}
        </Typography>
      ),
      meta: {
        label: "Keyword",
        placeholder: "Search keywords...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "cpc",
      accessorKey: "cpc",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Avg CPC" disableHide={true} />
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
      id: "search_volume",
      accessorKey: "search_volume",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Volume" disableHide={true} />
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
      id: "market_ease",
      accessorKey: "market_ease",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Market Ease" disableHide={true} />
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
        label: "Market Ease",
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
      id: "opportunity_score",
      accessorKey: "opportunity_score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Opp Score" disableHide={true} />
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
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
  ];
}
