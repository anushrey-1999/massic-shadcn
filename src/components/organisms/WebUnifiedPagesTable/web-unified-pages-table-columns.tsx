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
      id: "id",
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="ID" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate font-mono text-muted-foreground text-xs" title={row.getValue<string>("id")}>
          {row.getValue<string>("id") || "—"}
        </Typography>
      ),
      meta: { label: "ID" },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 140,
      minSize: 100,
      maxSize: 200,
    },
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
      id: "tier",
      accessorKey: "tier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Tier" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.getValue<string>("tier") || "—"}
        </Badge>
      ),
      meta: {
        label: "Tier",
        placeholder: "Select tier...",
        variant: "text" as const,
      },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 80,
      minSize: 70,
      maxSize: 100,
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
      id: "url",
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="URL" />
      ),
      cell: ({ row }) => {
        const url = row.getValue<string>("url") || "";
        if (!url) return <Typography variant="p" className="text-muted-foreground">—</Typography>;
        return (
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-primary hover:underline font-mono max-w-[280px]"
            title={url}
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
        );
      },
      meta: {
        label: "URL",
        placeholder: "Search URL...",
        variant: "text" as const,
      },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 280,
      minSize: 180,
      maxSize: 400,
    },
    {
      id: "action",
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Action type" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate capitalize text-sm">
          {row.getValue<string>("action") || "—"}
        </Typography>
      ),
      meta: {
        label: "Action type",
        variant: "multiSelect" as const,
        options: [
          { label: "Optimize", value: "optimize" },
          { label: "New", value: "new" },
        ],
        operators: [{ label: "Has any of", value: "inArray" as const }],
      },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
    {
      id: "page_id",
      accessorKey: "page_id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Page ID" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate font-mono text-muted-foreground text-xs" title={row.original.page_id ?? ""}>
          {row.original.page_id ?? "—"}
        </Typography>
      ),
      meta: { label: "Page ID" },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 180,
      minSize: 120,
      maxSize: 280,
    },
    {
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
      id: "final_ops",
      accessorFn: (row) => row.final_ops ?? row.raw?.final_ops ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Final OPS" />
      ),
      cell: ({ row }) => {
        const v = row.original.final_ops ?? row.original.raw?.final_ops;
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return <Typography variant="p" className="font-mono text-sm">{Number.isFinite(n) ? n.toFixed(4) : "—"}</Typography>;
      },
      meta: { label: "Final OPS" },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 100,
      minSize: 90,
      maxSize: 120,
    },
    {
      id: "type_weight",
      accessorFn: (row) => row.type_weight ?? row.raw?.type_weight ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type weight" />
      ),
      cell: ({ row }) => {
        const v = row.original.type_weight ?? row.original.raw?.type_weight;
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return <Typography variant="p" className="font-mono text-sm">{Number.isFinite(n) ? n.toFixed(4) : "—"}</Typography>;
      },
      meta: { label: "Type weight" },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 110,
      minSize: 90,
      maxSize: 130,
    },
    {
      id: "score_final",
      accessorFn: (row) => row.score_final ?? row.raw?.score_final ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Score (final)" />
      ),
      cell: ({ row }) => {
        const v = row.original.score_final ?? row.original.raw?.score_final;
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return <Typography variant="p" className="font-mono text-sm">{Number.isFinite(n) ? n.toFixed(4) : "—"}</Typography>;
      },
      meta: { label: "Score (final)" },
      enableColumnFilter: true,
      enableSorting: true,
      enableHiding: true,
      size: 110,
      minSize: 90,
      maxSize: 130,
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
      enableHiding: false,
      size: 90,
      minSize: 90,
      maxSize: 120,
    },
  ];
}
