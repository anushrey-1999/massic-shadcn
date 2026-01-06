"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/filter-table";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { Typography } from "@/components/ui/typography";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { ChatReference } from "./types";

type ReferenceRow = {
  id: string;
  metadata: Record<string, unknown>;
};

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function toCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const v = value / 1_000_000;
    const digits = Math.abs(v) >= 10 ? 0 : 1;
    return `${v.toFixed(digits)}M`;
  }
  if (abs >= 10_000) {
    const v = value / 1_000;
    const digits = Math.abs(v) >= 100 ? 0 : 1;
    return `${v.toFixed(digits)}K`;
  }
  return integerFormatter.format(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function displayLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function isScoreKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes("score") || k.includes("relevance") || k.includes("priority") || k === "ops";
}

function getOrderedMetadataKeys(references: ChatReference[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const ref of references || []) {
    const meta = (ref?.metadata && typeof ref.metadata === "object") ? (ref.metadata as Record<string, unknown>) : null;
    if (!meta) continue;
    for (const key of Object.keys(meta)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }

  return ordered;
}

function toRows(references: ChatReference[]): ReferenceRow[] {
  return (references || []).map((ref, index) => {
    const meta = (ref?.metadata && typeof ref.metadata === "object")
      ? (ref.metadata as Record<string, unknown>)
      : {};
    return {
      id: `${ref.filename || "ref"}-${index}`,
      metadata: meta,
    };
  });
}

function getColumns(keys: string[]): ColumnDef<ReferenceRow>[] {
  return keys.map((key) => {
    const scoreLike = isScoreKey(key);

    return {
      id: key,
      accessorFn: (row) => row.metadata?.[key],
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={displayLabel(key)} />
      ),
      cell: ({ getValue }) => {
        const value = getValue<unknown>();
        const asNumber = toNumber(value);

        if (scoreLike && asNumber !== null) {
          return (
            <div className="flex items-center">
              <RelevancePill score={asNumber} />
            </div>
          );
        }

        if (asNumber !== null) {
          return (
            <Typography variant="p" className="tabular-nums">
              {toCompactNumber(asNumber)}
            </Typography>
          );
        }

        const text =
          typeof value === "string"
            ? value
            : value === null || value === undefined
              ? ""
              : JSON.stringify(value);

        return (
          <Typography variant="p" className="truncate" title={text}>
            {text}
          </Typography>
        );
      },
      enableSorting: true,
      size: 160,
      minSize: 120,
      maxSize: 420,
    } satisfies ColumnDef<ReferenceRow>;
  });
}

export function ReferencesMetadataTable({ references }: { references: ChatReference[] }) {
  const data = React.useMemo(() => toRows(references), [references]);
  const keys = React.useMemo(() => getOrderedMetadataKeys(references), [references]);
  const columns = React.useMemo(() => getColumns(keys), [keys]);

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      sorting: keys.length ? [{ id: keys[0], desc: false }] : [],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (row: ReferenceRow) => row.id,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 w-full">
        <DataTable
          table={table}
          isLoading={false}
          isFetching={false}
          pageSizeOptions={[10, 30, 50, 100, 200]}
          emptyMessage="No sources found."
          disableHorizontalScroll={false}
          className="h-full"
        />
      </div>
    </div>
  );
}
