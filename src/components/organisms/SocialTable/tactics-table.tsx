"use client";

import * as React from "react";
import { DataTable } from "../../filter-table/index";
import { DataTableSortList } from "../../filter-table/data-table-sort-list";
import { DataTableSearch } from "../../filter-table/data-table-search";
import { DataTableViewOptions } from "../../filter-table/data-table-view-options";
import type { TacticRow } from "@/types/social-types";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { getTacticsTableColumns } from "./tactics-table-columns";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TacticsTableProps {
  data: TacticRow[];
  businessId: string;
  isLoading?: boolean;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onBack?: () => void;
  channelName?: string;
}

export function TacticsTable({
  data,
  businessId,
  isLoading = false,
  isFetching = false,
  search = "",
  onSearchChange,
  onBack,
  channelName,
}: TacticsTableProps) {
  const columns = React.useMemo(
    () => getTacticsTableColumns({ channelName, businessId }),
    [channelName, businessId]
  );

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 500,
      },
    },
    getRowId: (originalRow: TacticRow) => originalRow.id,
  });

  return (
    <div className="flex flex-col h-full w-full gap-2.5">
      <div className="shrink-0">
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
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
                debounceMs={300}
                placeholder="Search tactics, titles, descriptions..."
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <DataTableViewOptions table={table} align="end" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="h-full w-full [&>div]:overflow-x-hidden [&>div>div]:overflow-x-hidden [&_table]:min-w-0! [&_table]:w-full">
          <DataTable
            table={table}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyMessage="No tactics found. Try adjusting your search or check back later."
            showPagination={false}
            className="h-full [&>div]:overflow-x-hidden [&>div>div]:overflow-x-hidden"
          />
        </div>
      </div>
    </div>
  );
}
