"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

export interface ThemeDetailRow {
  id: string;
  topics: string[];
  theme_name: string;
  offerings: string[];
}

function PillList({
  items,
  variant,
}: {
  items: string[];
  variant: "secondary" | "outline";
}) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 items-start">
      {items.map((item) => (
        <Badge key={item} variant={variant} className=" ">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function getThemesSplitTableColumns(): ColumnDef<ThemeRow>[] {
  return [
    {
      id: "theme_name",
      accessorKey: "theme_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Theme" disableHide={true} />
      ),
      cell: ({ row }) => {
        const name = row.getValue("theme_name") as string;
        return (
          <Typography variant="p" className="truncate font-medium" title={name}>
            {name || "-"}
          </Typography>
        );
      },
      meta: {
        label: "Theme",
        placeholder: "Search themes...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 220,
      minSize: 140,
      maxSize: undefined,
    },
  ];
}

export function getThemeTopicsTableColumns(): ColumnDef<ThemeDetailRow>[] {
  return [
    {
      id: "topics",
      accessorKey: "topics",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Topics" disableHide={true} />
      ),
      cell: ({ row }) => {
        const topics = row.getValue("topics") as string[];
        return (
          <div className="max-w-full">
            <PillList items={topics || []} variant="secondary" />
          </div>
        );
      },
      meta: {
        label: "Topics",
        placeholder: "Search topics...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 300,
      minSize: 160,
      maxSize: undefined,
      filterFn: (row, id, value) => {
        const topics = row.getValue(id) as string[];
        if (!value) return true;
        return topics?.some((topic) =>
          topic.toLowerCase().includes(String(value).toLowerCase())
        );
      },
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" disableHide={true} />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue("offerings") as string[];
        return (
          <div className="max-w-full">
            <PillList items={offerings || []} variant="outline" />
          </div>
        );
      },
      meta: {
        label: "Offerings",
        placeholder: "Search offerings...",
        variant: "text",
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 220,
      minSize: 140,
      maxSize: undefined,
    },
  ];
}
