"use client";

import * as React from "react";
import { SplitTableView } from "@/components/split-view-table";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";
import {
  getWebOptimizationAnalysisSimplifiedColumns,
} from "./simplified-table-columns";
import {
  getWebOptimizationSuggestionsColumns,
  type WebOptimizationSuggestionRow,
} from "./suggestions-table-columns";

interface WebOptimizationAnalysisSplitViewProps {
  leftTableData: WebOptimizationAnalysisRow[];
  suggestionsData: WebOptimizationSuggestionRow[];
  selectedRowId: string | null;
  onRowSelect: (rowId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
  pageCount?: number;
}

export const WebOptimizationAnalysisSplitView = React.memo(function WebOptimizationAnalysisSplitView({
  leftTableData,
  suggestionsData,
  selectedRowId,
  onRowSelect,
  search,
  onSearchChange,
  onBack,
  pageCount = 1,
}: WebOptimizationAnalysisSplitViewProps) {
  const leftColumns = React.useMemo(() => getWebOptimizationAnalysisSimplifiedColumns(), []);
  const rightColumns = React.useMemo(() => getWebOptimizationSuggestionsColumns(), []);

  const { table: leftTable } = useLocalDataTable({
    data: leftTableData,
    columns: leftColumns,
    initialState: {
      sorting: [{ id: "ops", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (row: WebOptimizationAnalysisRow) => row.id,
  });

  const { table: rightTable } = useLocalDataTable({
    data: suggestionsData,
    columns: rightColumns,
    initialState: {
      sorting: [{ id: "category", desc: false }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (row: WebOptimizationSuggestionRow) => row.id,
  });

  const handleRowClick = React.useCallback(
    (row: WebOptimizationAnalysisRow) => onRowSelect(row.id),
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
      left: "page_url",
      right: "action",
    }),
    []
  );

  return (
    <SplitTableView
      leftTable={leftTable}
      leftEmptyMessage="No optimization opportunities found."
      leftTableProps={leftTableProps}
      rightTable={rightTable}
      rightEmptyMessage="No suggestions found for this page."
      rightTableProps={rightTableProps}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search pages and suggestions..."
      searchColumnIds={searchColumnIds}
      leftTableWidth="30%"
      rightTableWidth="70%"
      onBack={onBack}
      showFilters={false}
    />
  );
});
