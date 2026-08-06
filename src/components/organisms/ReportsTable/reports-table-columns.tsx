"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Check, CircleAlert, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import type { ReportRunListItem } from "@/types/report-runs-types";
import { formatDate } from "@/lib/format";
import {
  ScheduledDateCell,
  ScheduledStatusBadge,
} from "./scheduled-report-display";

interface GetReportsTableColumnsProps {
  businessId: string;
  onEditSchedule: () => void;
}

export function getReportsTableColumns({
  businessId,
  onEditSchedule,
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
        <DataTableColumnHeader column={column} label="Date" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="text-sm">
          {row.original.row_type === "schedule" ? (
            <ScheduledDateCell scheduledFor={row.original.scheduled_for} part="date" />
          ) : row.original.created_at ? (
            formatDate(row.original.created_at, "MMM d, yyyy")
          ) : (
            "—"
          )}
        </Typography>
      ),
      enableSorting: true,
      meta: {
        label: "Date",
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
          {row.original.row_type === "schedule" ? (
            <ScheduledDateCell scheduledFor={row.original.scheduled_for} part="time" />
          ) : row.original.created_at ? (
            formatDate(row.original.created_at, "h:mm a")
          ) : (
            "—"
          )}
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
        if (row.original.row_type === "schedule") {
          return <ScheduledStatusBadge scheduledFor={row.original.scheduled_for} />;
        }

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
            return <ReadyToSendBadge />;
          }
        }

        // For non-auto-scheduled reports
        if (!isAutoScheduled) {
          // Show "Ready to Send" for ready_for_approval
          if (deliveryStatus === "ready_for_approval") {
            return <ReadyToSendBadge />;
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
        return (
          <ActionsCell
            businessId={businessId}
            reportRunId={row.original.id}
            isSchedule={row.original.row_type === "schedule"}
            onEditSchedule={onEditSchedule}
          />
        );
      },
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
  ];
}

function ReadyToSendBadge() {
  return (
    <Badge className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-general-border bg-white px-2 py-[3px] text-[10px] font-medium leading-[1.5] tracking-[0.15px] text-general-secondary-foreground hover:bg-white">
      <Send className="h-3 w-3 text-general-muted-foreground" aria-hidden="true" />
      Ready to send
    </Badge>
  );
}

function ActionsCell({
  businessId,
  reportRunId,
  isSchedule,
  onEditSchedule,
}: {
  businessId: string;
  reportRunId: string;
  isSchedule: boolean;
  onEditSchedule: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex justify-end px-2 py-2.5">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="h-6 w-6 rounded-lg"
        aria-label={isSchedule ? "Edit auto-schedule" : "Open report"}
        onClick={(e) => {
          e.stopPropagation();
          if (isSchedule) {
            onEditSchedule();
            return;
          }
          router.push(`/business/${businessId}/reports/${reportRunId}`);
        }}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
