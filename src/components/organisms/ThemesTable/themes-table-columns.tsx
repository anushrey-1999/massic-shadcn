"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";
import { ExpandablePills } from "@/components/ui/expandable-pills";

const textFilterOperators = [
  { label: "Contains", value: "iLike" as const },
  { label: "Is", value: "eq" as const },
  { label: "Does not contain", value: "notILike" as const },
];

interface GetThemesTableColumnsProps {
  expandedRowId?: string | null;
  onExpandedRowChange?: (rowId: string | null) => void;
  offeringOptions?: string[];
}

export function getThemesTableColumns({ expandedRowId = null, onExpandedRowChange, offeringOptions = [] }: GetThemesTableColumnsProps = {}): ColumnDef<ThemeRow>[] {
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
          <Typography variant="p" className="font-medium truncate" title={name}>
            {name || "-"}
          </Typography>
        );
      },
      meta: {
        label: "Theme",
        placeholder: "Search themes...",
        variant: "text",
        operators: textFilterOperators,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 300,
      minSize: 200,
      filterFn: (row, id, value) => {
        const name = row.getValue(id) as string;
        if (!value) return true;
        return name?.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue("offerings") as string[];
        const isExpanded = expandedRowId === row.id;
        return (
          <div className="max-w-full">
            <ExpandablePills
              items={offerings || []}
              pillVariant="outline"
              expanded={isExpanded}
              onExpandedChange={(next) => {
                onExpandedRowChange?.(next ? row.id : null);
              }}
            />
          </div>
        );
      },
      meta: offeringOptions.length > 0
        ? {
            label: "Offerings",
            variant: "multiSelect" as const,
            options: offeringOptions.map((o) => ({ label: o, value: o })),
            operators: [{ label: "Has any of", value: "inArray" as const }],
            closeOnSelect: true,
          }
        : {
            label: "Offerings",
            placeholder: "Search offerings...",
            variant: "text" as const,
            operators: textFilterOperators,
          },
      enableColumnFilter: true,
      enableSorting: false,
      size: 150,
      minSize: 120,
      maxSize: 250,
    },
    {
      id: "topics",
      accessorKey: "topics",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Topics" />
      ),
      cell: ({ row }) => {
        const topicNames = (row.original.topics || []).map((t) => t.topic_name);
        const isExpanded = expandedRowId === row.id;
        return (
          <div className="max-w-full">
            <ExpandablePills
              items={topicNames}
              pillVariant="secondary"
              expanded={isExpanded}
              onExpandedChange={(next) => {
                onExpandedRowChange?.(next ? row.id : null);
              }}
            />
          </div>
        );
      },
      meta: {
        label: "Topics",
        placeholder: "Search topics...",
        variant: "text",
        operators: textFilterOperators,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 200,
      minSize: 150,
      maxSize: 300,
    },
  ];
}
