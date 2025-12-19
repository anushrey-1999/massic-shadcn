"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableAdvancedToolbar } from "../../filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "../../filter-table/data-table-filter-list";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import type { TacticRow } from "@/types/social-types";
import { useDataTable } from "@/hooks/use-data-table";
import type { QueryKeys } from "@/types/data-table-types";
import { getTacticsTableColumns } from "./tactics-table-columns";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TacticsTableProps {
  data: TacticRow[];
  pageCount: number;
  businessId: string;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onBack?: () => void;
  channelName?: string;
}

export function TacticsTable({
  data,
  pageCount,
  businessId,
  queryKeys,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onBack,
  channelName,
}: TacticsTableProps) {
  const enableAdvancedFilter = true;

  const columns = React.useMemo(
    () => getTacticsTableColumns({ channelName, businessId }),
    [channelName, businessId]
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
    getRowId: (originalRow: TacticRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="flex flex-col h-full w-full gap-2.5">
      <div className="shrink-0">
        <DataTableAdvancedToolbar table={table}>
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {onSearchChange && (
            <DataTableSearch
              value={search}
              onChange={onSearchChange}
              placeholder="Search tactics, titles, descriptions..."
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="h-full w-full [&>div]:overflow-x-hidden [&>div>div]:overflow-x-hidden [&_table]:min-w-0! [&_table]:w-full">
          <DataTable
            table={table}
            isLoading={isLoading}
            isFetching={isFetching}
            pageSizeOptions={[10, 30, 50, 100, 200]}
            emptyMessage="No tactics found. Try adjusting your filters or check back later."
            className="h-full [&>div]:overflow-x-hidden [&>div>div]:overflow-x-hidden"
          />
        </div>
      </div>
    </div>
  );
}
