"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";

function extractPathFromUrl(url: string): string {
  if (!url) return "/";
  try {
    const parsed = url.startsWith("http") ? new URL(url) : new URL(`https://example.com${url.startsWith("/") ? "" : "/"}${url}`);
    return parsed.pathname || "/";
  } catch {
    const withoutProtocol = url.replace(/^https?:\/\//, "");
    const idx = withoutProtocol.indexOf("/");
    return idx >= 0 ? withoutProtocol.slice(idx) : "/";
  }
}

export function getWebOptimizationAnalysisSimplifiedColumns(): ColumnDef<WebOptimizationAnalysisRow>[] {
  return [
    {
      id: "page_url",
      accessorKey: "page_url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Page" />
      ),
      cell: ({ row }) => {
        const url = row.getValue<string>("page_url") || "";
        const path = extractPathFromUrl(url);
        return (
          <Typography variant="p" className="truncate" title={url}>
            {path}
          </Typography>
        );
      },
      meta: {
        label: "Page",
        placeholder: "Search pages...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 80,
      maxSize: 160,
    },
    {
      id: "ops",
      accessorKey: "ops",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Priority" />
      ),
      cell: ({ cell }) => {
        const score = cell.getValue<number>() || 0;
        return (
          <div className="flex items-center">
            <RelevancePill score={score} />
          </div>
        );
      },
      meta: {
        label: "OPS",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
  ];
}
