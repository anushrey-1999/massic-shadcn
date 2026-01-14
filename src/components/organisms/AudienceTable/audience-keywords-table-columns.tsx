"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import type { AudienceUseCaseRow } from "@/types/audience-types";
import { Typography } from "@/components/ui/typography";

interface AudienceKeywordsColumnsOptions {
  expandedRowId?: string | null;
  onExpandedRowChange?: (rowId: string | null) => void;
}

export function getAudienceKeywordsTableColumns(
  options: AudienceKeywordsColumnsOptions = {}
): ColumnDef<AudienceUseCaseRow>[] {
  const { expandedRowId = null, onExpandedRowChange } = options;

  return [
    {
      id: "use_case_name",
      accessorKey: "use_case_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Use Case" disableHide={true} />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("use_case_name")}
        </Typography>
      ),
      meta: {
        label: "Use Case",
        placeholder: "Search use cases...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "keywords",
      accessorFn: (row) => row.supporting_keywords,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Keywords" disableHide={true} />
      ),
      cell: ({ row }) => {
        const keywords = row.original.supporting_keywords || [];
        const rowId = row.original.id;
        const isExpanded = !!expandedRowId && expandedRowId === rowId;
        return (
          <div className="max-w-full">
            <ExpandablePills
              items={keywords}
              pillVariant="outline"
              expanded={isExpanded}
              onExpandedChange={(next) => {
                if (!onExpandedRowChange) return;
                onExpandedRowChange(next ? rowId : null);
              }}
            />
          </div>
        );
      },
      meta: {
        label: "Keywords",
        placeholder: "Search keywords...",
        variant: "text",
      },
      enableColumnFilter: false,
      enableSorting: false,
      size: 400,
      minSize: 300,
      maxSize: 600,
    },
  ];
}
