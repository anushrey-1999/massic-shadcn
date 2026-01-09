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
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (!tableContainerRef.current) return;

      const isOutsideContainer = !tableContainerRef.current.contains(target);

      // If click is outside container, collapse
      if (isOutsideContainer) {
        setExpandedRowId(null);
        return;
      }

      // If click is inside container, check if it's on a table element or interactive element
      const isOnTableElement = target?.closest?.(
        'table, [role="table"], [role="row"], [role="cell"], [role="columnheader"], [role="rowheader"]'
      );
      const isOnInteractiveElement = target?.closest?.(
        'button, input, select, textarea, a, [role="button"], [role="textbox"], [role="combobox"]'
      );

      // Collapse if click is inside container but not on table or interactive elements
      // This handles clicks on empty space within the container
      if (!isOnTableElement && !isOnInteractiveElement) {
        setExpandedRowId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const columns = React.useMemo(
    () => getTacticsTableColumns({ channelName, businessId, expandedRowId }),
    [channelName, businessId, expandedRowId]
  );

  const { table } = useLocalDataTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 500,
      },
      columnVisibility: {
        status: false,
      },
    },
    getRowId: (originalRow: TacticRow) => originalRow.id,
  });

  return (
    <div ref={tableContainerRef} className="flex flex-col h-full w-full gap-2.5">
      <div className="shrink-0">
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onBack && (
              <Button
                variant="outline"
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
            onRowClick={(row) => {
              const rowId = (row as any).id;
              setExpandedRowId((prev) => (prev === rowId ? null : rowId));
            }}
            selectedRowId={expandedRowId}
            highlightSelectedRow={false}
          />
        </div>
      </div>
    </div>
  );
}
