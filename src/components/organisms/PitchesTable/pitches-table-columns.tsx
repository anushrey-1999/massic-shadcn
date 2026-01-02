"use client";

import type { ColumnDef } from "@tantml/react-table";
import { Building2, CalendarClock, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";

import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export type PitchRow = {
  id: string;
  business: string;
  type: string;
  dateTime: string;
  business_id: string;
};

export function getPitchesTableColumns(): ColumnDef<PitchRow>[] {
  return [
    {
      id: "business",
      accessorKey: "business",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Business" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("business")}
        </Typography>
      ),
      meta: {
        label: "Business",
        placeholder: "Search businesses...",
        variant: "text",
        icon: Building2,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 320,
      minSize: 220,
      maxSize: 420,
    },
    {
      id: "type",
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("type")}
        </Typography>
      ),
      meta: {
        label: "Type",
        placeholder: "Search types...",
        variant: "text",
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 260,
    },
    {
      id: "dateTime",
      accessorKey: "dateTime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date & Time" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("dateTime")}
        </Typography>
      ),
      meta: {
        label: "Date & Time",
        placeholder: "Filter by date...",
        variant: "dateRange",
        icon: CalendarClock,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 220,
      minSize: 180,
      maxSize: 300,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-start">
          <Link href={`/pitches/${row.original.business_id}/summary`}>
            <Button variant="ghost" size="icon" aria-label="View pitch summary">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 90,
      minSize: 80,
      maxSize: 100,
    },
  ];
}
