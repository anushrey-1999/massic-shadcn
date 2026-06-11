"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Badge } from "@/components/ui/badge";
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

export function getWebUnifiedPagesSplitViewColumns(): ColumnDef<UnifiedPageRow>[] {
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
        return (
          <Typography variant="p" className="truncate" title={value}>
            {display || "—"}
          </Typography>
        );
      },
      meta: {
        label: "Page",
        placeholder: "Search pages...",
        variant: "text" as const,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      minSize: 120,
      maxSize: 260,
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
          <div className="flex items-center">
            <Badge variant={label === "New" ? "default" : "secondary"}>
              {label || "—"}
            </Badge>
          </div>
        );
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 90,
      minSize: 80,
      maxSize: 110,
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
      enableColumnFilter: false,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
  ];
}

