"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      id: "report",
      accessorKey: "business_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Report" />
      ),
      cell: ({ row }) => {
        const businessName = row.original.business_name || "Business";
        const period = row.original.period || "28 days";
        const reportText = `${businessName} ${period} Performance Report`;
        return (
          <Typography
            variant="p"
            className="text-sm truncate max-w-[350px]"
            title={reportText}
          >
            {reportText}
          </Typography>
        );
      },
      enableSorting: false,
      size: 300,
      minSize: 250,
      maxSize: 400,
    },
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
      cell: ({ row }) => {
        const status = row.original.status;
        const deliveryStatus = row.original.delivery_status;
        const isAutoScheduled = row.original.is_auto_scheduled;

        // For auto-scheduled reports
        if (isAutoScheduled) {
          // Show "Sent" chip
          if (deliveryStatus === "sent") {
            return (
              <Badge
                className="bg-[#DCFCE7] border border-[#E5E5E5] text-[#16A34A] hover:bg-[#DCFCE7] font-medium text-center rounded-[8px] inline-flex items-center justify-center gap-[6px] px-[8px] py-[3px]"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '0.15px',
                }}
              >
                <Check className="h-[12px] w-[12px]" style={{ color: '#16A34A' }} />
                Sent
              </Badge>
            );
          }

          // Show "Ready to Send" chip
          if (deliveryStatus === "ready_for_approval") {
            return (
              <Badge
                className="bg-[#F5F5F5] border-transparent text-[#171717] hover:bg-[#F5F5F5] font-medium text-center rounded-[8px] inline-flex items-center justify-center gap-[6px] px-[8px] py-[3px]"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '0.15px',
                }}
              >
                Ready to send
                <ArrowRight className="h-[12px] w-[12px]" style={{ color: '#D4D4D4' }} />
              </Badge>
            );
          }
        }

        // For non-auto-scheduled reports
        if (!isAutoScheduled) {
          // Show "Ready to Send" for ready_for_approval
          if (deliveryStatus === "ready_for_approval") {
            return (
              <Badge
                className="bg-[#F5F5F5] border-transparent text-[#171717] hover:bg-[#F5F5F5] font-medium text-center rounded-[8px] inline-flex items-center justify-center gap-[6px] px-[8px] py-[3px]"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '0.15px',
                }}
              >
                Ready to send
                <ArrowRight className="h-[12px] w-[12px]" style={{ color: '#D4D4D4' }} />
              </Badge>
            );
          }

          // Show "Error" chip
          if (status === "error") {
            return (
              <Badge
                className="bg-[#FFE2E2] border border-[#E5E5E5] text-[#DC2626] hover:bg-[#FFE2E2] font-medium text-center rounded-[8px] inline-flex items-center justify-center gap-[6px] px-[8px] py-[3px]"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '0.15px',
                }}
              >
                <CircleAlert className="h-[12px] w-[12px]" style={{ color: '#DC2626' }} />
                Error
              </Badge>
            );
          }

          // Show "Sent" chip
          if (deliveryStatus === "sent") {
            return (
              <Badge
                className="bg-[#DCFCE7] border border-[#E5E5E5] text-[#16A34A] hover:bg-[#DCFCE7] font-medium text-center rounded-[8px] inline-flex items-center justify-center gap-[6px] px-[8px] py-[3px]"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '0.15px',
                }}
              >
                <Check className="h-[12px] w-[12px]" style={{ color: '#16A34A' }} />
                Sent
              </Badge>
            );
          }

          // For any other status, show nothing (empty)
          return null;
        }

        // Default: show nothing
        return null;
      },
      enableSorting: false,
      size: 250,
      minSize: 200,
      maxSize: 300,
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
