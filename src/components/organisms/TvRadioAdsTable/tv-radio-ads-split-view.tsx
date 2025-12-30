"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useDataTable } from "@/hooks/use-data-table";
import type { TvRadioAdConceptRow } from "@/types/tv-radio-ads-types";
import { TvRadioAdExampleCard } from "./tv-radio-ad-example-card";
import { getTvRadioAdsTableColumns } from "./tv-radio-ads-table-columns";

interface TvRadioAdsSplitViewProps {
  businessId: string;
  leftTableData: TvRadioAdConceptRow[];
  selectedRowId: string | null;
  onRowSelect: (rowId: string) => void;
  onBack: () => void;
  pageCount?: number;
}

export const TvRadioAdsSplitView = React.memo(function TvRadioAdsSplitView({
  businessId,
  leftTableData,
  selectedRowId,
  onRowSelect,
  onBack,
  pageCount = 1,
}: TvRadioAdsSplitViewProps) {
  const columns = React.useMemo(() => {
    const all = getTvRadioAdsTableColumns();
    return all.filter((col) =>
      ["subtopic", "type", "opp_score"].includes(String(col.id))
    );
  }, []);

  const { table } = useDataTable({
    data: leftTableData,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 24,
      },
    },
    getRowId: (originalRow: TvRadioAdConceptRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const handleRowClick = React.useCallback(
    (row: TvRadioAdConceptRow) => onRowSelect(row.id),
    [onRowSelect]
  );

  const selectedRow = React.useMemo(() => {
    if (!selectedRowId) return null;
    return leftTableData.find((row) => row.id === selectedRowId) || null;
  }, [leftTableData, selectedRowId]);

  return (
    <div className="bg-white rounded-lg p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <div role="toolbar" aria-orientation="horizontal" className="flex w-full items-start justify-between gap-2 p-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack} className="h-9 w-9 p-0" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex flex-col shrink-0 h-full overflow-hidden" style={{ width: "412px" }}>
          <DataTable
            table={table}
            isLoading={false}
            isFetching={false}
            emptyMessage="No subtopics found."
            onRowClick={handleRowClick}
            selectedRowId={selectedRowId}
            showPagination={true}
            pageSizeOptions={[10, 24, 50, 100]}
            hideRowsPerPage={true}
            paginationAlign="left"
            disableHorizontalScroll={true}
            className="h-full"
          />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-auto">
          {selectedRow ? (
            <div className="max-w-[724px]">
              <TvRadioAdExampleCard businessId={businessId} row={selectedRow} />
            </div>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
});
