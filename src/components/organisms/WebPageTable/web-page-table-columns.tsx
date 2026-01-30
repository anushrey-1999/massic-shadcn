"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Tag, TrendingUp, BarChart3, Building2 } from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { WebPageRow } from "@/types/web-page-types";
import { Typography } from "@/components/ui/typography";
import { WebPageActionCell } from "@/components/organisms/web-page-actions/web-page-action-cell";
import { formatVolume } from "@/lib/format";

interface GetWebPageTableColumnsProps {
  businessId: string;
  offeringCounts?: Record<string, number>;
  expandedRowId?: string | null;
  onExpandedRowChange?: (rowId: string | null) => void;
  hideActions?: boolean;
}

export function getWebPageTableColumns({ businessId, offeringCounts = {}, expandedRowId = null, onExpandedRowChange, hideActions = false }: GetWebPageTableColumnsProps): ColumnDef<WebPageRow>[] {
  const columns: ColumnDef<WebPageRow>[] = [
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
        placeholder: "Select page type...",
        variant: "select",
        options: [
          { label: "Geo page", value: "geographic landing page" },
          { label: "Section in page", value: "section in existing page" },
          { label: "Use case page", value: "category-use case page" },
          { label: "Audience page", value: "category-audience page" },
          { label: "Blog", value: "Blog" },
        ],
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue<string[]>("offerings") || [];

        return (
          <div className="max-w-full">
            <ExpandablePills items={offerings} pillVariant="outline" />
          </div>
        );
      },
      meta: {
        label: "Offerings",
        variant: "multiSelect",
        options: Object.keys(offeringCounts).map((offering) => ({
          label: offering,
          value: offering,
        })),
        operators: [
          { label: "Has any of", value: "inArray" as const },
        ],
        icon: Building2,
        closeOnSelect: true,
      },
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
      size: 150,
      minSize: 120,
      maxSize: 200,
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
      size: 100,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "coverage",
      accessorKey: "coverage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Coverage" />
      ),
      cell: ({ cell }) => {
        const coverage = cell.getValue<number>();
        return <Typography variant="p">{coverage ?? 0}</Typography>;
      },
      meta: {
        label: "Coverage",
        variant: "number",
        icon: BarChart3,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 110,
      minSize: 90,
      maxSize: 140,
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
      size: 90,
      minSize: 90,
      maxSize: 150,
    },
    {
      id: "page_opportunity_score",
      accessorKey: "page_opportunity_score",
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
        icon: TrendingUp,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 80,
      minSize: 80,
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
      id: "sub_topics_count",
      accessorKey: "sub_topics_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Sub Topics" />
      ),
      cell: ({ row }) => {
        const keywords = row.original.supporting_keywords || [];
        const isExpanded = expandedRowId === row.id;
        return (
          <div className="max-w-full">
            <ExpandablePills
              items={keywords}
              pillVariant="outline"
              expanded={isExpanded}
              onExpandedChange={(next) => {
                onExpandedRowChange?.(next ? row.id : null);
              }}
            />
          </div>
        );
      },
      meta: {
        label: "Sub Topics",
        placeholder: "Search sub topics...",
        variant: "number",
        icon: Tag,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 180,
      minSize: 120,
      maxSize: 250,
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <WebPageActionCell businessId={businessId} row={row.original} />
          </div>
        );
      },
      meta: {
        align: "center",
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 70,
      minSize: 70,
      maxSize: 70,
    },
  ];

  if (hideActions) {
    return columns.filter((col) => col.id !== "actions");
  }

  return columns;
}
