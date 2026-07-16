"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { AdminEmptyState } from "./admin-states";
import { formatAdminValue } from "./admin-kpi-card";
import type { AdminBreakdownRow } from "../types";

export function AdminBreakdownTable({
  rows,
  metric,
}: {
  rows: AdminBreakdownRow[];
  metric: string;
}) {
  if (!rows.length) return <AdminEmptyState />;
  return (
    <div className="admin-panel w-full min-w-0 max-w-full overflow-hidden rounded-lg border">
      <div
        className="max-w-full overflow-x-auto overscroll-x-contain"
        role="region"
        aria-label="Analytics breakdown table"
        tabIndex={0}
      >
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-general-primary/5 text-general-muted-foreground">
            <tr className="h-9 border-b border-general-border">
              <th className="px-3 text-left font-medium">Group</th>
              {[
                "Current",
                "Previous",
                "Δ",
                "% change",
                "% of total",
                "Trend",
              ].map((label) => (
                <th key={label} className="px-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {label === "Current" && (
                      <ChevronsUpDown className="size-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const positive = (row.changePct || 0) > 0;
              const negative = (row.changePct || 0) < 0;
              return (
                <tr
                  key={row.group}
                  className="h-11 border-b border-general-border transition-colors duration-150 last:border-0 hover:bg-general-primary/4"
                >
                  <td className="max-w-[260px] truncate px-3 font-medium">
                    {row.group}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {formatAdminValue(metric, row.current)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-general-muted-foreground">
                    {formatAdminValue(metric, row.previous)}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {formatAdminValue(metric, row.delta)}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {row.changePct === null
                      ? "—"
                      : `${row.changePct.toFixed(1)}%`}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {row.sharePct.toFixed(1)}%
                  </td>
                  <td className="px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-general-muted-foreground">
                      {positive ? (
                        <ArrowUp className="size-3.5 text-emerald-700" />
                      ) : negative ? (
                        <ArrowDown className="size-3.5 text-red-700" />
                      ) : (
                        "—"
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
