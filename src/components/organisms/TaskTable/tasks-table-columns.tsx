"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarIcon,
  CircleDashed,
  Clock,
  Text,
} from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import type { Task } from "../../../types/data-table-types";

// Task schema definitions
const tasks = {
  status: {
    enumValues: ["todo", "in-progress", "done", "canceled"] as const,
  },
  priority: {
    enumValues: ["low", "medium", "high"] as const,
  },
  label: {
    enumValues: ["bug", "feature", "enhancement", "documentation"] as const,
  },
};

// Helper functions for icons
function getStatusIcon(status: string) {
  const statusIcons = {
    canceled: CircleDashed,
    done: CircleDashed,
    "in-progress": CircleDashed,
    todo: CircleDashed,
  };
  return statusIcons[status as keyof typeof statusIcons] || CircleDashed;
}

function getPriorityIcon(priority: string) {
  const priorityIcons = {
    high: ArrowUpDown,
    low: ArrowUpDown,
    medium: ArrowUpDown,
  };
  return priorityIcons[priority as keyof typeof priorityIcons] || ArrowUpDown;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return "";
    }
    
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(dateObj);
  } catch {
    return "";
  }
}

interface GetTasksTableColumnsProps {
  statusCounts: Record<Task["status"], number>;
  priorityCounts: Record<Task["priority"], number>;
  estimatedHoursRange: { min: number; max: number };
}

export function getTasksTableColumns({
  statusCounts,
  priorityCounts,
  estimatedHoursRange,
}: GetTasksTableColumnsProps): ColumnDef<Task>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Task" />
      ),
      cell: ({ row }) => (
        <div className="truncate font-mono text-sm">{row.getValue("code")}</div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 120, // Fixed width: 120px
      minSize: 100,
      maxSize: 150,
      // align defaults to "left" - no need to specify
    },
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Title" />
      ),
      cell: ({ row }) => {
        const label = tasks.label.enumValues.find(
          (label) => label === row.original.label,
        );

        return (
          <div className="flex items-center gap-2 min-w-0">
            {label && <Badge variant="outline" className="shrink-0">{label}</Badge>}
            <span className="truncate font-medium flex-1 min-w-0">
              {row.getValue("title")}
            </span>
          </div>
        );
      },
      meta: {
        label: "Title",
        placeholder: "Search titles...",
        variant: "text",
        icon: Text,
      },
      enableColumnFilter: true,
      size: 300, // Fixed width: 300px (flexible, can be adjusted)
      minSize: 200,
      maxSize: 400,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ cell }) => {
        const status = tasks.status.enumValues.find(
          (status) => status === cell.getValue<Task["status"]>(),
        );

        if (!status) return null;

        const Icon = getStatusIcon(status);

        return (
          <Badge variant="outline" className="py-1 [&>svg]:size-3.5 w-fit">
            <Icon />
            <span className="capitalize">{status}</span>
          </Badge>
        );
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: tasks.status.enumValues.map((status) => ({
          label: status.charAt(0).toUpperCase() + status.slice(1),
          value: status,
          count: statusCounts[status],
          icon: getStatusIcon(status),
        })),
        icon: CircleDashed,
      },
      enableColumnFilter: true,
      size: 140, // Fixed width: 140px
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Priority" />
      ),
      cell: ({ cell }) => {
        const priority = tasks.priority.enumValues.find(
          (priority) => priority === cell.getValue<Task["priority"]>(),
        );

        if (!priority) return null;

        const Icon = getPriorityIcon(priority);

        return (
          <Badge variant="outline" className="py-1 [&>svg]:size-3.5 w-fit">
            <Icon />
            <span className="capitalize">{priority}</span>
          </Badge>
        );
      },
      meta: {
        label: "Priority",
        variant: "multiSelect",
        options: tasks.priority.enumValues.map((priority) => ({
          label: priority.charAt(0).toUpperCase() + priority.slice(1),
          value: priority,
          count: priorityCounts[priority],
          icon: getPriorityIcon(priority),
        })),
        icon: ArrowUpDown,
      },
      enableColumnFilter: true,
      size: 130, // Fixed width: 130px
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "estimatedHours",
      accessorKey: "estimatedHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Est. Hours" />
      ),
      cell: ({ cell }) => {
        const estimatedHours = cell.getValue<number>();
        return <div className="font-medium">{estimatedHours}</div>;
      },
      meta: {
        label: "Est. Hours",
        variant: "range",
        range: [estimatedHoursRange.min, estimatedHoursRange.max],
        unit: "hr",
        icon: Clock,
        // align defaults to "left" - no need to specify
      },
      enableColumnFilter: true,
      size: 110, // Fixed width: 110px
      minSize: 90,
      maxSize: 130,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created At" />
      ),
      cell: ({ cell }) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(cell.getValue<Date>())}
        </div>
      ),
      meta: {
        label: "Created At",
        variant: "dateRange",
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
      size: 140, // Fixed width: 140px
      minSize: 120,
      maxSize: 180,
    },
  ];
}
