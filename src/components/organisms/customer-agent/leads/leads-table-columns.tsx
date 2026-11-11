"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNowStrict } from "date-fns";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { LeadStatus, VisitorLead } from "@/types/customer-agent";

const STATUS_TONES: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-green-100 text-green-800" },
  seen: { label: "Seen", className: "bg-gray-100 text-gray-700" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-500" },
};

function Tag({ className, children }: { className: string; children: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getLeadsTableColumns(): ColumnDef<VisitorLead>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
      cell: ({ row }) => {
        const name = row.original.name?.trim();
        return name ? (
          <Typography variant="p" className="truncate" title={name}>
            {name}
          </Typography>
        ) : (
          <span className="text-muted-foreground">Unnamed visitor</span>
        );
      },
      meta: { label: "Name" },
      enableSorting: false,
      size: 170,
      minSize: 130,
      maxSize: 260,
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Email" />,
      cell: ({ row }) => {
        const email = row.original.email;
        return email ? (
          <a href={`mailto:${email}`} className="block truncate text-primary hover:underline" title={email}>
            {email}
          </a>
        ) : (
          <Empty />
        );
      },
      meta: { label: "Email" },
      enableSorting: false,
      size: 210,
      minSize: 160,
      maxSize: 300,
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Phone" />,
      cell: ({ row }) => {
        const phone = row.original.phone;
        return phone ? (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="block truncate hover:underline" title={phone}>
            {phone}
          </a>
        ) : (
          <Empty />
        );
      },
      meta: { label: "Phone" },
      enableSorting: false,
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "note",
      accessorKey: "note",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Note" />,
      cell: ({ row }) => {
        const note = row.original.note?.trim();
        return note ? (
          <Typography variant="p" className="line-clamp-2 whitespace-normal" title={note}>
            {note}
          </Typography>
        ) : (
          <Empty />
        );
      },
      meta: { label: "Note" },
      enableSorting: false,
      size: 280,
      minSize: 200,
      maxSize: 420,
    },
    {
      id: "preferred_time",
      accessorKey: "preferred_time",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Preferred time" />,
      cell: ({ row }) => {
        const value = row.original.preferred_time?.trim();
        return value ? (
          <Typography variant="p" className="truncate" title={value}>
            {value}
          </Typography>
        ) : (
          <Empty />
        );
      },
      meta: { label: "Preferred time" },
      enableSorting: false,
      enableHiding: true,
      size: 150,
      minSize: 120,
      maxSize: 220,
    },
    {
      id: "urgency",
      accessorKey: "urgency",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Urgency" />,
      cell: ({ row }) =>
        row.original.urgency === "urgent" ? (
          <Tag className="bg-red-100 text-red-800">Urgent</Tag>
        ) : (
          <span className="text-muted-foreground">Normal</span>
        ),
      meta: { label: "Urgency" },
      enableSorting: false,
      size: 110,
      minSize: 90,
      maxSize: 140,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const tone = STATUS_TONES[row.original.status] ?? STATUS_TONES.seen;
        return <Tag className={tone.className}>{tone.label}</Tag>;
      },
      meta: {
        label: "Status",
        variant: "select" as const,
        options: [
          { label: "New", value: "new" },
          { label: "Seen", value: "seen" },
          { label: "Closed", value: "closed" },
        ],
        operators: [{ label: "Is", value: "eq" as const }],
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 110,
      minSize: 90,
      maxSize: 140,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Received" />,
      cell: ({ row }) => {
        const date = parseDate(row.original.created_at);
        if (!date) return <Empty />;
        return (
          <time
            dateTime={row.original.created_at}
            title={format(date, "PPp")}
            className="whitespace-nowrap text-muted-foreground"
          >
            {formatDistanceToNowStrict(date, { addSuffix: true })}
          </time>
        );
      },
      meta: { label: "Received" },
      enableSorting: false,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
  ];
}
