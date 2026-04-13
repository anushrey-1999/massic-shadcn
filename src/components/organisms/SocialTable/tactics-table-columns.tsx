"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TacticRow } from "@/types/social-types";
import { Tag, FileText, TrendingUp, Hash, CheckCircle2, Sparkles, Eye } from "lucide-react";
import { SocialActionCell } from "./social-action-cell";

interface GetTacticsTableColumnsProps {
  channelName?: string;
  businessId?: string;
  expandedRowId?: string | null;
  onExpandedRowChange?: (rowId: string | null) => void;
  hideActions?: boolean;
}

function extractRedditThreadPath(url: string): string {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(part => part !== "");
    const commentsIndex = pathParts.findIndex(part => part === "comments");
    if (commentsIndex !== -1 && pathParts.length > commentsIndex + 2) {
      const threadTitle = pathParts[commentsIndex + 2];
      if (threadTitle) {
        return `/${threadTitle}/`;
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function getTacticsTableColumns({ channelName, businessId, expandedRowId, onExpandedRowChange, hideActions = false }: GetTacticsTableColumnsProps = {}): ColumnDef<TacticRow>[] {
  const isReddit = channelName?.toLowerCase() === "reddit";

  let columns: ColumnDef<TacticRow>[] = [];

  if (isReddit) {
    columns = [
      {
        id: "thread",
        accessorKey: "url",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Thread" />
        ),
        cell: ({ row }) => {
          const url = row.original.url || "";
          const displayPath = extractRedditThreadPath(url);

          if (!url || !displayPath) {
            return (
              <Typography variant="p" className="truncate text-muted-foreground">
                N/A
              </Typography>
            );
          }

          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate"
            >
              <Typography variant="p" className="truncate">
                {displayPath}
              </Typography>
            </a>
          );
        },
        meta: {
          label: "Thread",
          placeholder: "Search threads...",
          variant: "text",
          icon: FileText,
        },
        enableColumnFilter: true,
        enableSorting: false,
        size: 250,
        minSize: 200,
        maxSize: 350,
      },
      {
        id: "campaign_relevance",
        accessorKey: "campaign_relevance",
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
          icon: TrendingUp,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 110,
        minSize: 100,
        maxSize: 130,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue<string>("status") || "N/A";
          return (
            <Badge variant="outline" className="capitalize">
              {status}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          placeholder: "Search status...",
          variant: "text",
          icon: CheckCircle2,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
        minSize: 90,
        maxSize: 120,
      },
      {
        id: "related_keywords",
        accessorFn: (row) => (row.related_keywords || []).length,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Keywords" />
        ),
        cell: ({ row }) => {
          const keywords = row.original.related_keywords || [];
          const rowId = row.original.id;
          const isExpanded = expandedRowId === rowId;
          return (
            <div className="max-w-full">
              <ExpandablePills
                items={keywords}
                pillVariant="outline"
                expanded={isExpanded}
                onExpandedChange={(next) => {
                  onExpandedRowChange?.(next ? rowId : null);
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
        enableSorting: true,
        size: 200,
        minSize: 150,
        maxSize: 250,
      },
    ];
  } else {
    columns = [
      {
        id: "tactic",
        accessorKey: "cluster_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Tactic" />
        ),
        cell: ({ row }) => (
          <Typography variant="p" className="truncate">
            {row.original.cluster_name || "N/A"}
          </Typography>
        ),
        meta: {
          label: "Tactic",
          placeholder: "Search tactics...",
          variant: "text",
          icon: Tag,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 130,
        minSize: 110,
        maxSize: 160,
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Title" />
        ),
        cell: ({ row }) => (
          <Typography variant="p" className="truncate">
            {row.getValue("title") || "N/A"}
          </Typography>
        ),
        meta: {
          label: "Title",
          placeholder: "Search titles...",
          variant: "text",
          icon: FileText,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 170,
        minSize: 140,
        maxSize: 200,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }) => (
          <Typography variant="p" className="line-clamp-2">
            {row.getValue("description") || "N/A"}
          </Typography>
        ),
        meta: {
          label: "Description",
          placeholder: "Search descriptions...",
          variant: "text",
          icon: FileText,
        },
        enableColumnFilter: true,
        enableSorting: false,
        size: 220,
        minSize: 180,
        maxSize: 280,
      },
      {
        id: "campaign_relevance",
        accessorKey: "campaign_relevance",
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
          icon: TrendingUp,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 110,
        minSize: 100,
        maxSize: 130,
      },
      {
        id: "related_keywords",
        accessorFn: (row) => (row.related_keywords || []).length,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Keywords" />
        ),
        cell: ({ row }) => {
          const keywords = row.original.related_keywords || [];
          const rowId = row.original.id;
          const isExpanded = expandedRowId === rowId;
          return (
            <div className="max-w-full">
              <ExpandablePills
                items={keywords}
                pillVariant="outline"
                expanded={isExpanded}
                onExpandedChange={(next) => {
                  onExpandedRowChange?.(next ? rowId : null);
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
        enableSorting: true,
        size: 170,
        minSize: 140,
        maxSize: 200,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue<string>("status") || "N/A";
          return (
            <Badge variant="outline" className="capitalize">
              {status}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          placeholder: "Search status...",
          variant: "text",
          icon: CheckCircle2,
        },
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
        minSize: 90,
        maxSize: 120,
      },
      {
        id: "actions",
        header: () => <div className="text-sm font-semibold">Actions</div>,
        cell: ({ row }) => {
          if (!businessId) {
            return (
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled>
                <Sparkles className="h-4 w-4" />
              </Button>
            );
          }

          return <SocialActionCell businessId={businessId} row={row.original} channelName={channelName} />;
        },
        enableColumnFilter: false,
        enableSorting: false,
        size: 100,
        minSize: 100,
        maxSize: 100,
      },
    ];
  }

  if (hideActions) {
    return columns.filter((col) => col.id !== "actions");
  }

  return columns;
}
