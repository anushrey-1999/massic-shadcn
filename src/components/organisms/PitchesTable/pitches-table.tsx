"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { DataTable } from "@/components/filter-table";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import Link from "next/link";

import type { PitchRow } from "./pitches-table-columns";
import { getPitchesTableColumns } from "./pitches-table-columns";

interface PitchesTableProps {
  data: PitchRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
}

export function PitchesTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
}: PitchesTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(() => getPitchesTableColumns(), []);

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    queryKeys,
    getRowId: (originalRow: PitchRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
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
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              align="start"
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
