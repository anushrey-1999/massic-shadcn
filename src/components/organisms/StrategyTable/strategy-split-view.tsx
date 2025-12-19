"use client";

import * as React from "react";
import { SplitTableView } from "@/components/split-view-table";
import type { StrategyRow } from "@/types/strategy-types";
import { useDataTable } from "@/hooks/use-data-table";
import { getStrategySplitTableColumns } from "./strategy-split-table-columns";
import { getStrategyClustersTableColumns, type StrategyClusterRow } from "./strategy-clusters-table-columns";

interface StrategySplitViewProps {
  leftTableData: StrategyRow[];
  clustersData: StrategyClusterRow[];
  selectedTopicId: string | null;
  onTopicSelect: (topicId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
  pageCount?: number;
  businessRelevanceRange?: { min: number; max: number };
}

export const StrategySplitView = React.memo(function StrategySplitView({
  leftTableData,
  clustersData,
  selectedTopicId,
  onTopicSelect,
  search,
  onSearchChange,
  onBack,
  pageCount = 1,
  businessRelevanceRange = { min: 0, max: 1 },
}: StrategySplitViewProps) {
  const enableAdvancedFilter = true;

  const leftColumns = React.useMemo(
    () => getStrategySplitTableColumns(),
    []
  );

  const clustersColumns = React.useMemo(
    () => getStrategyClustersTableColumns(),
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
      sorting: [{ id: "business_relevance_score", desc: true }],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: StrategyRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const filteredClustersData = React.useMemo(() => {
    if (!selectedTopicId) return [];
    return clustersData;
  }, [selectedTopicId, clustersData]);

  const {
    table: clustersTable,
    shallow: clustersShallow,
    debounceMs: clustersDebounceMs,
    throttleMs: clustersThrottleMs,
  } = useDataTable({
    data: filteredClustersData,
    columns: clustersColumns,
    pageCount: 1,
    enableAdvancedFilter,
    initialState: {
      sorting: [],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: StrategyClusterRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const handleTopicRowClick = React.useCallback(
    (row: StrategyRow) => onTopicSelect(row.id),
    [onTopicSelect]
  );

  const pageSizeOptions = React.useMemo(() => [10, 30, 50, 100, 200], []);

  const leftTableProps = React.useMemo(
    () => ({
      onRowClick: handleTopicRowClick,
      selectedRowId: selectedTopicId,
      showPagination: true,
      pageSizeOptions,
      hideRowsPerPage: true,
    }),
    [handleTopicRowClick, selectedTopicId, pageSizeOptions]
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
      left: "topic",
      right: "cluster",
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

  const rightTableHooks = React.useMemo(
    () => ({
      shallow: clustersShallow,
      debounceMs: clustersDebounceMs,
      throttleMs: clustersThrottleMs,
    }),
    [clustersShallow, clustersDebounceMs, clustersThrottleMs]
  );

  return (
    <SplitTableView
      leftTable={leftTable}
      leftEmptyMessage="No topics found."
      leftTableProps={leftTableProps}
      rightTable={clustersTable}
      rightEmptyMessage="Select a topic to view clusters and keywords."
      rightTableProps={rightTableProps}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search topics, clusters and keywords..."
      searchColumnIds={searchColumnIds}
      leftTableHooks={leftTableHooks}
      rightTableHooks={rightTableHooks}
      leftTableWidth="35%"
      rightTableWidth="65%"
      onBack={onBack}
    />
  );
});
