"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Badge } from "@/components/ui/badge";
import { WebPageActionCell } from "@/components/organisms/web-page-actions/web-page-action-cell";
import type { UnifiedPageRow } from "@/hooks/use-unified-web-optimization";

function extractPathFromUrl(url: string): string {
  if (!url) return "/";
  try {
    const parsed = url.startsWith("http")
      ? new URL(url)
      : new URL(`https://example.com${url.startsWith("/") ? "" : "/"}${url}`);
    return parsed.pathname || "/";
  } catch {
    const withoutProtocol = url.replace(/^https?:\/\//, "");
    const idx = withoutProtocol.indexOf("/");
    return idx >= 0 ? withoutProtocol.slice(idx) : "/";
  }
}

interface GetColumnsProps {
  businessId: string;
}

export function getWebUnifiedPagesTableColumns({
  businessId,
}: GetColumnsProps): ColumnDef<UnifiedPageRow>[] {
  return [
    {
      id: "page",
      accessorKey: "page",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Page" />
      ),
      cell: ({ row }) => {
        const value = row.getValue<string>("page") || "";
        const isNew = row.original.label === "New";
        const display = isNew ? value : extractPathFromUrl(value);

        if (isNew) {
          return (
            <Typography variant="p" className="truncate" title={value}>
              {display}
            </Typography>
          );
        }

        return (
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-primary hover:underline"
            title={row.original.url}
            onClick={(e) => e.stopPropagation()}
          >
            {display}
          </a>
        );
      },
      meta: {
        label: "Page",
        placeholder: "Search pages...",
        variant: "text" as const,
        operators: [
          { label: "Contains", value: "iLike" as const },
        ],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 400,
    },
    {
      id: "page_type",
      accessorKey: "page_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate capitalize">
          {row.getValue<string>("page_type") || "—"}
        </Typography>
      ),
      meta: {
        label: "Type",
        placeholder: "Select type...",
        variant: "text" as const,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 160,
      minSize: 120,
      maxSize: 220,
    },
    {
      id: "label",
      accessorKey: "label",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Label" />
      ),
      cell: ({ row }) => {
        const label = row.getValue<string>("label");
        return (
          <Badge variant={label === "New" ? "default" : "secondary"}>
            {label}
          </Badge>
        );
      },
      meta: {
        label: "Label",
        variant: "multiSelect" as const,
        options: [
          { label: "New", value: "New" },
          { label: "Existing", value: "Existing" },
        ],
        operators: [{ label: "Has any of", value: "inArray" as const }],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 100,
      minSize: 80,
      maxSize: 130,
    },
    {
      id: "ups",
      accessorKey: "ups",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Priority" />
      ),
      cell: ({ cell }) => {
        const score = cell.getValue<number>() || 0;
        return (
          <div className="flex items-center">
            <RelevancePill score={score / 100} />
          </div>
        );
      },
      meta: {
        label: "Priority",
        variant: "range" as const,
        range: [0, 100] as [number, number],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Action" />
      ),
      cell: ({ row }) => {
        const isNew = row.original.label === "New";
        if (!isNew) return null;

        const pageId = row.original.page_id;
        if (!pageId) return null;

        const fakeWebRow = {
          page_id: pageId,
          keyword: row.original.page,
          page_type: row.original.page_type,
          status: (row.original.raw?.status as string) ?? null,
        } as any;

        return (
          <div className="flex items-center justify-center">
            <WebPageActionCell businessId={businessId} row={fakeWebRow} />
          </div>
        );
      },
      meta: {
        label: "Action",
        align: "center",
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 90,
      minSize: 90,
      maxSize: 120,
    },
  ];
}
