"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import Link from "next/link";

import type { PitchRow } from "./pitches-table-columns";
import { getPitchesTableColumns } from "./pitches-table-columns";

interface PitchesTableProps {
  data: PitchRow[];
  isLoading?: boolean;
}

export function PitchesTable({
  data,
  isLoading = false,
}: PitchesTableProps) {
  const columns = React.useMemo(() => getPitchesTableColumns(), []);

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    getRowId: (originalRow: PitchRow) => originalRow.id,
  });

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={isLoading}
        pageSizeOptions={[10, 30, 50, 100]}
        emptyMessage="No pitches found."
        disableHorizontalScroll={true}
      >
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <DataTableSearch
              value={search}
              onChange={(value) => {
                table.setPageIndex(0);
                setSearch(value);
              }}
              placeholder="Search pitches..."
            />
          </div>
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <DataTableViewOptions table={table} align="end" />
            <Button asChild>
              <Link href="/pitches/create-pitch">Create New +</Link>
            </Button>
          </div>
        </div>
      </DataTable>
    </div>
  );
}
