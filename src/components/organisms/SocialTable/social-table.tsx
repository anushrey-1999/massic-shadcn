"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableAdvancedToolbar } from "../../filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import type { SocialRow } from "@/types/social-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getSocialTableColumns } from "./social-table-columns";

interface SocialTableProps {
  data: SocialRow[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  channelsSidebar?: React.ReactNode;
  onRowClick?: (row: SocialRow) => void;
}

export function SocialTable({
  data,
  pageCount,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  channelsSidebar,
  onRowClick,
}: SocialTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () => getSocialTableColumns({}),
    []
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      sorting: [{ id: "campaign_relevance", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    queryKeys,
    getRowId: (originalRow: SocialRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col h-full w-full gap-2.5">
        <div className="shrink-0">
          <DataTableAdvancedToolbar table={table}>
            {onSearchChange && (
              <DataTableSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Search channels, campaigns..."
              />
            )}
            <DataTableSortList table={table} align="start" />
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              align="start"
            />
          </DataTableAdvancedToolbar>
        </div>
        <div className="flex flex-1 min-h-0 gap-4">
          {channelsSidebar && (
            <div className="w-64 border border-border bg-background shrink-0 flex flex-col overflow-hidden h-[calc(100vh-14.6rem)] rounded-lg">
              {channelsSidebar}
            </div>
          )}
          <div className="flex-1 min-h-0 flex flex-col min-w-0">
            <DataTable 
              table={table} 
              isLoading={isLoading}
              isFetching={isFetching}
              pageSizeOptions={[10, 30, 50, 100, 200]}
              emptyMessage="No social campaigns found. Try adjusting your filters or check back later."
              className="h-full"
              onRowClick={onRowClick}
              disableHorizontalScroll={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
