"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return integerFormatter.format(value);
}

function formatDecimal(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";

  // GSC CTR is typically 0..1, but some backends return 0..100.
  const normalized = value > 1 ? value / 100 : value;

  return new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalized);
}

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

export function getWebOptimizationAnalysisTableColumns(): ColumnDef<WebOptimizationAnalysisRow>[] {
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
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-primary hover:underline"
            title={url}
            onClick={(e) => e.stopPropagation()}
          >
            {path}
          </a>
        );
      },
      meta: {
        label: "Page",
        placeholder: "Search pages...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "opportunity",
      accessorKey: "opportunity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Opportunity" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate" title={row.getValue("opportunity") as string}>
          {row.getValue("opportunity")}
        </Typography>
      ),
      meta: {
        label: "Opportunity",
        placeholder: "Search opportunities...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 180,
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
        label: "Priority",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "impressions",
      accessorKey: "impressions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Impr." />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatNumber(cell.getValue<number>() || 0)}
        </Typography>
      ),
      meta: {
        label: "Impr.",
        variant: "range",
        range: [0, 100000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 120,
      maxSize: 160,
    },
    {
      id: "clicks",
      accessorKey: "clicks",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Clicks" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatNumber(cell.getValue<number>() || 0)}
        </Typography>
      ),
      meta: {
        label: "Clicks",
        variant: "range",
        range: [0, 100000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "avg_position",
      accessorKey: "avg_position",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Avg. Pos" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatDecimal(cell.getValue<number>() || 0, 2)}
        </Typography>
      ),
      meta: {
        label: "Avg. Pos",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 120,
      maxSize: 160,
    },
    {
      id: "ctr",
      accessorKey: "ctr",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="CTR" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatPercent(cell.getValue<number>() || 0)}
        </Typography>
      ),
      meta: {
        label: "CTR",
        variant: "range",
        range: [0, 1],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "sessions",
      accessorKey: "sessions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Sessions" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatNumber(cell.getValue<number>() || 0)}
        </Typography>
      ),
      meta: {
        label: "Sessions",
        variant: "range",
        range: [0, 100000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 110,
      maxSize: 150,
    },
    {
      id: "goals",
      accessorKey: "goals",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Goals" />
      ),
      cell: ({ cell }) => (
        <Typography variant="p" className="tabular-nums">
          {formatNumber(cell.getValue<number>() || 0)}
        </Typography>
      ),
      meta: {
        label: "Goals",
        variant: "range",
        range: [0, 100000000],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 110,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "suggestions_count",
      accessorKey: "suggestions_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Suggestions" />
      ),
      cell: ({ cell }) => {
        const count = cell.getValue<number>() || 0;
        return (
          <Typography variant="p" className="tabular-nums">
            {formatNumber(count)}
          </Typography>
        );
      },
      meta: {
        label: "Suggestions",
        variant: "range",
        range: [0, 100],
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      minSize: 110,
      maxSize: 140,
    },
  ];
}
