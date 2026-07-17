"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminBusinessFavicon } from "./admin-business-favicon";
import { AdminEmptyState } from "./admin-states";
import { formatAdminValue } from "./admin-kpi-card";
import type { AdminCostRankRow } from "../types";

const PAGE_SIZE = 25;

function RankLabel({
  row,
  showChevron,
}: {
  row: AdminCostRankRow;
  showChevron: boolean;
}) {
  return (
    <>
      {row.siteUrl !== undefined && (
        <AdminBusinessFavicon siteUrl={row.siteUrl} className="size-8" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{row.label}</span>
          {row.badge && (
            <Badge
              variant="outline"
              className="shrink-0 rounded border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
            >
              {row.badge}
            </Badge>
          )}
        </span>
        {row.sublabel && (
          <span className="block truncate text-xs text-general-muted-foreground">
            {row.sublabel}
          </span>
        )}
      </span>
      {showChevron && (
        <ChevronRight
          className="size-4 shrink-0 text-general-muted-foreground"
          aria-hidden="true"
        />
      )}
    </>
  );
}

export function AdminRankedCostTable({
  rows,
  emptyTitle,
  emptyDescription,
  onRowSelect,
}: {
  rows: AdminCostRankRow[];
  emptyTitle: string;
  emptyDescription: string;
  onRowSelect?: (row: AdminCostRankRow) => void;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  if (!rows.length) {
    return (
      <AdminEmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const start = (page - 1) * PAGE_SIZE;
  const visibleRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div
        className="max-w-full overflow-x-auto overscroll-x-contain"
        role="region"
        aria-label="Lifetime cost ranking"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-general-primary/5 text-general-muted-foreground">
            <tr className="h-9 border-b border-general-border">
              <th className="px-3 text-left font-medium">Name</th>
              <th className="px-3 text-right font-medium">Lifetime cost</th>
              <th className="px-3 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                className="h-11 border-b border-general-border transition-colors duration-150 last:border-0 hover:bg-general-primary/4"
              >
                <td className="max-w-[420px] px-3">
                  {onRowSelect ? (
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-general-primary/40"
                      onClick={() => onRowSelect(row)}
                    >
                      <RankLabel row={row} showChevron />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-1">
                      <RankLabel row={row} showChevron={false} />
                    </div>
                  )}
                </td>
                <td className="px-3 text-right tabular-nums">
                  {formatAdminValue("api_cost_total", row.cost)}
                </td>
                <td className="px-3 text-right tabular-nums text-general-muted-foreground">
                  {row.sharePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex min-h-10 items-center justify-between gap-3 border-t border-general-border px-3 py-2 text-xs text-general-muted-foreground">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-16 text-center">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next page"
              disabled={page === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
