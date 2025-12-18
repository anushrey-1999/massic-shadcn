"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  Tag,
  TrendingUp,
  BarChart3,
  Sparkles,
  Eye,
} from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Button } from "@/components/ui/button";
import type { WebPageRow } from "@/types/web-page-types";
import { Typography } from "@/components/ui/typography";

function formatVolume(volume: number): string {
  if (!volume && volume !== 0) return "0";

  if (volume >= 1000000) {
    const millions = volume / 1000000;
    return `${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M`;
  }

  if (volume >= 10000) {
    const thousands = volume / 1000;
    return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}K`;
  }

  return volume.toLocaleString();
}

interface GetWebPageTableColumnsProps {
  [key: string]: any;
}

export function getWebPageTableColumns({}: GetWebPageTableColumnsProps = {}): ColumnDef<WebPageRow>[] {
  return [
    {
      id: "keyword",
      accessorKey: "keyword",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Page" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("keyword") || "N/A"}
        </Typography>
      ),
      meta: {
        label: "Page",
        placeholder: "Search pages...",
        variant: "text",
        icon: FileText,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "page_type",
      accessorKey: "page_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ row }) => {
        const pageType = row.getValue<string>("page_type");
        return <Typography variant="p">{pageType || "N/A"}</Typography>;
      },
      meta: {
        label: "Type",
        placeholder: "Search types...",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "search_volume",
      accessorKey: "search_volume",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Volume" />
      ),
      cell: ({ cell }) => {
        const volume = cell.getValue<number>();
        return <Typography variant="p">{formatVolume(volume || 0)}</Typography>;
      },
      meta: {
        label: "Search Volume",
        variant: "number",
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 150,
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
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "page_opportunity_score",
      accessorKey: "page_opportunity_score",
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
        label: "Opportunity Score",
        variant: "range",
        range: [0, 1],
        icon: BarChart3,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        return (
          <Typography variant="p" className="font-mono text-xs">{status || "N/A"}</Typography>
        );
      },
      meta: {
        label: "Status",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
    {
      id: "supporting_keywords",
      accessorKey: "supporting_keywords",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Subtopics" />
      ),
      cell: ({ row }) => {
        const keywords = row.getValue<string[]>("supporting_keywords") || [];
        return (
          <div className="max-w-full">
            <ExpandablePills items={keywords} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Subtopics",
        placeholder: "Search subtopics...",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 250,
      minSize: 200,
      maxSize: 350,
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: () => {
        return (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="default"
              size="icon"
              className="h-6 w-6 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Sparkles className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        );
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
  ];
}
