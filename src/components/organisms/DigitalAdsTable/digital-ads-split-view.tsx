"use client";

import * as React from "react";
import { SplitTableView } from "@/components/split-view-table";
import type { DigitalAdsRow, DigitalAdsKeyword } from "@/types/digital-ads-types";
import { useDataTable } from "@/hooks/use-data-table";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { getSimplifiedTableColumns } from "./simplified-table-columns";
import { getKeywordsTableColumns } from "./keywords-table-columns";

interface DigitalAdsSplitViewProps {
  leftTableData: DigitalAdsRow[];
  keywordsData: DigitalAdsKeyword[];
  selectedRowId: string | null;
  onRowSelect: (rowId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
  pageCount?: number;
}

export const DigitalAdsSplitView = React.memo(function DigitalAdsSplitView({
  leftTableData,
  keywordsData,
  selectedRowId,
  onRowSelect,
  search,
  onSearchChange,
  onBack,
  pageCount = 1,
}: DigitalAdsSplitViewProps) {
  const enableAdvancedFilter = true;

  const leftColumns = React.useMemo(
    () => getSimplifiedTableColumns(),
    []
  );

  const keywordsColumns = React.useMemo(
    () => getKeywordsTableColumns(),
    []
  );

  const {
    table: leftTable,
    shallow: leftShallow,
    debounceMs: leftDebounceMs,
    throttleMs: leftThrottleMs,
  } = useDataTable({
    data: leftTableData,
    columns: leftColumns,
    pageCount: pageCount,
    enableAdvancedFilter,
    initialState: {
      sorting: [{ id: "intent_cluster_opportunity_score", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: DigitalAdsRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const { table: keywordsTable } = useLocalDataTable({
    data: keywordsData,
    columns: keywordsColumns,
    initialState: {
      sorting: [{ id: "opportunity_score", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: DigitalAdsKeyword) => originalRow.keyword,
  });

  const handleRowClick = React.useCallback(
    (row: DigitalAdsRow) => onRowSelect(row.id),
    [onRowSelect]
  );

  const pageSizeOptions = React.useMemo(() => [10, 30, 50, 100, 200], []);

  const leftTableProps = React.useMemo(
    () => ({
      onRowClick: handleRowClick,
      selectedRowId,
      showPagination: true,
      pageSizeOptions,
      hideRowsPerPage: true,
    }),
    [handleRowClick, selectedRowId, pageSizeOptions]
  );

  const rightTableProps = React.useMemo(
    () => ({
      showPagination: false,
      pageSizeOptions,
    }),
    [pageSizeOptions]
  );

  const searchColumnIds = React.useMemo(
    () => ({
      left: "cluster",
      right: "keyword",
    }),
    []
  );

  const leftTableHooks = React.useMemo(
    () => ({
      shallow: leftShallow,
      debounceMs: leftDebounceMs,
      throttleMs: leftThrottleMs,
    }),
    [leftShallow, leftDebounceMs, leftThrottleMs]
  );

  const columnMapping = React.useMemo(
    () => ({
      intent_cluster_opportunity_score: "opportunity_score",
    }),
    []
  );

  return (
    <SplitTableView
      leftTable={leftTable}
      leftEmptyMessage="No subtopics found."
      leftTableProps={leftTableProps}
      rightTable={keywordsTable}
      rightEmptyMessage="No keywords found for this subtopic."
      rightTableProps={rightTableProps}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search subtopics and keywords..."
      searchColumnIds={searchColumnIds}
      leftTableHooks={leftTableHooks}
      columnMapping={columnMapping}
      leftTableWidth="30%"
      rightTableWidth="70%"
      onBack={onBack}
    />
  );
});
