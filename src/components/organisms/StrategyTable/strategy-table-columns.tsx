"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarIcon,
  TrendingUp,
  Hash,
  Building2,
  Tag,
} from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { StrategyRow } from "@/types/strategy-types";
import { Typography } from "@/components/ui/typography";

// Helper to format percentage
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface GetStrategyTableColumnsProps {
  offeringCounts?: Record<string, number>;
  businessRelevanceRange?: { min: number; max: number };
  topicCoverageRange?: { min: number; max: number };
  searchVolumeRange?: { min: number; max: number };
}

export function getStrategyTableColumns({
  offeringCounts = {},
  businessRelevanceRange = { min: 0, max: 1 },
  topicCoverageRange = { min: 0, max: 1 },
  searchVolumeRange = { min: 0, max: 10000 },
}: GetStrategyTableColumnsProps): ColumnDef<StrategyRow>[] {
  return [
    {
      id: "topic",
      accessorKey: "topic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Topic" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("topic")}
        </Typography>
      ),
      meta: {
        label: "Topic",
        placeholder: "Search topics...",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
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
        range: [businessRelevanceRange.min, businessRelevanceRange.max],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "topic_cluster_topic_coverage",
      accessorKey: "topic_cluster_topic_coverage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Coverage" />
      ),
      cell: ({ cell }) => {
        const value = cell.getValue<number>();
        return (
          <Typography variant="p">{formatPercentage(value)}</Typography>
        );
      },
      meta: {
        label: "Topic Coverage",
        variant: "range",
        range: [topicCoverageRange.min, topicCoverageRange.max],
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 90,
      maxSize: 140,
    },
    {
      id: "cluster_names",
      accessorKey: "cluster_names",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Clusters" />
      ),
      cell: ({ row }) => {
        const clusters = row.original.clusters;
        const clusterNames = clusters.map((cluster: any) => cluster.cluster);
        
        return (
          <div className="max-w-full">
            <ExpandablePills items={clusterNames} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Clusters",
        placeholder: "Search clusters...",
        variant: "text",
        icon: Building2,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 180,
      minSize: 150,
      maxSize: 250,
    },
    {
      id: "total_keywords",
      accessorKey: "total_keywords",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Keywords" />
      ),
      cell: ({ row }) => {
        const clusters = row.original.clusters;
        const allKeywords = clusters.flatMap((cluster: any) => cluster.keywords || []);
        
        return (
          <div className="max-w-full">
            <ExpandablePills items={allKeywords} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Total Keywords",
        variant: "number",
        icon: Hash,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 200,
      minSize: 150,
      maxSize: 300,
    },
    {
      id: "total_search_volume",
      accessorKey: "total_search_volume",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Search Volume" />
      ),
      cell: ({ cell }) => {
        const volume = cell.getValue<number>();
        return (
          <Typography variant="p">{volume.toLocaleString()}</Typography>
        );
      },
      meta: {
        label: "Search Volume",
        variant: "range",
        range: [searchVolumeRange.min, searchVolumeRange.max],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue<string[]>("offerings");
        
        return (
          <div className="max-w-full">
            <ExpandablePills items={offerings || []} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Offerings",
        variant: "multiSelect",
        options: Object.entries(offeringCounts).map(([offering, count]) => ({
          label: offering,
          value: offering,
          count,
        })),
        icon: Building2,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
  ];
}
