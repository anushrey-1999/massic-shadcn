"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { ReportRunListItem } from "@/types/report-runs-types";
import { formatDate } from "@/lib/format";

interface GetReportsTableColumnsProps {
  businessId: string;
}

export function getReportsTableColumns({
  businessId,
}: GetReportsTableColumnsProps): ColumnDef<ReportRunListItem>[] {
  return [
    {
      id: "date_generated",
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date Generated" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="text-sm">
          {row.original.created_at ? formatDate(row.original.created_at, "MMM d, yyyy") : "—"}
        </Typography>
      ),
      enableSorting: true,
      meta: {
        label: "Date Generated",
      },
      size: 200,
      minSize: 150,
      maxSize: 250,
    },
    {
      id: "time_generated",
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Time" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="text-sm">
          {row.original.created_at ? formatDate(row.original.created_at, "h:mm a") : "—"}
        </Typography>
      ),
      enableSorting: true,
      meta: {
        label: "Time Generated",
      },
      size: 150,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="text-sm">
          {row.original.status || "—"}
        </Typography>
      ),
      enableSorting: false,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "actions",
      header: () => (
        <div className="flex justify-end px-2 py-[7.5px]">
          <span className="text-sm font-medium text-foreground">Actions</span>
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        // Using a wrapper component to access router
        return <ActionsCell businessId={businessId} reportRunId={row.original.id} />;
      },
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
  ];
}

function ActionsCell({ businessId, reportRunId }: { businessId: string; reportRunId: string }) {
  const router = useRouter();

  return (
    <div className="flex justify-end px-2 py-2.5">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="h-6 w-6 rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/business/${businessId}/reports/${reportRunId}`);
        }}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
