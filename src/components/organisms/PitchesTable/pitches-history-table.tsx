"use client";

import * as React from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DataTable } from "@/components/filter-table";
import { Button } from "@/components/ui/button";
import { getPitchesTableColumns, type PitchRow } from "./pitches-table-columns";

interface PitchesHistoryTableProps {
  businessId: string;
  data: PitchRow[];
  isLoading?: boolean;
}

export function PitchesHistoryTable({
  businessId,
  data,
  isLoading = false,
}: PitchesHistoryTableProps) {
  const columns = React.useMemo(() => {
    return getPitchesTableColumns().map((col) => {
      if (col.id !== "actions") return col;

      return {
        ...col,
        cell: ({ row }: any) => {
          const type = String(row.original?.type || "").trim().toLowerCase();
          const isSnapshot = type === "snapshot";
          const isDetailed = type === "detailed";
          const status = String(row.original?.status || "").trim().toLowerCase();
          const isProcessing =
            status === "pending" || status === "processing" || status === "in_progress";
          const disabled = isDetailed || isProcessing;
          const href = isSnapshot
            ? `/pitches/${businessId}/reports?open=snapshot`
            : `/pitches/${businessId}/reports`;

          return (
            <div className="flex items-center justify-start">
              <Button
                variant="ghost"
                size="icon"
                aria-label="View pitch"
                disabled={disabled}
                asChild={!disabled}
              >
                {disabled ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <Link href={href}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </Button>
            </div>
          );
        },
      };
    });
  }, [businessId]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => (row as any).id,
    enableSorting: false,
    enableFilters: false,
    enableColumnFilters: false,
  });

  return (
    <DataTable
      table={table as any}
      isLoading={isLoading}
      emptyMessage="No pitches found."
      showPagination={false}
      disableHorizontalScroll={true}
      className="h-[calc(100vh-45rem)]"
    />
  );
}

