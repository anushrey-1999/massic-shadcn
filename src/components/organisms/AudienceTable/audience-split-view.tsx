"use client";

import * as React from "react";
import { SplitTableView } from "@/components/split-view-table";
import type { AudienceRow, AudienceUseCaseRow } from "@/types/audience-types";
import { useDataTable } from "@/hooks/use-data-table";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { getPersonaSplitTableColumns } from "./persona-split-table-columns";
import { getAudienceKeywordsTableColumns } from "./audience-keywords-table-columns";

interface AudienceSplitViewProps {
  leftTableData: AudienceRow[];
  useCasesData: AudienceUseCaseRow[];
  selectedPersonaId: string | null;
  selectedUseCaseId: string | null;
  onPersonaSelect: (personaId: string) => void;
  onUseCaseSelect: (useCaseId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
  pageCount?: number;
  arsRange?: { min: number; max: number };
}

export const AudienceSplitView = React.memo(function AudienceSplitView({
  leftTableData,
  useCasesData,
  selectedPersonaId,
  selectedUseCaseId,
  onPersonaSelect,
  onUseCaseSelect,
  search,
  onSearchChange,
  onBack,
  pageCount = 1,
  arsRange = { min: 0, max: 1 },
}: AudienceSplitViewProps) {
  const enableAdvancedFilter = true;

  const leftColumns = React.useMemo(
    () => getPersonaSplitTableColumns(),
    []
  );

  const keywordsColumns = React.useMemo(
    () => getAudienceKeywordsTableColumns(),
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
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: AudienceRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const filteredUseCasesData = React.useMemo(() => {
    if (!selectedPersonaId) return [];
    return useCasesData;
  }, [selectedPersonaId, useCasesData]);

  const { table: keywordsTable } = useLocalDataTable({
    data: filteredUseCasesData,
    columns: keywordsColumns,
    initialState: {
      sorting: [],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: AudienceUseCaseRow) => originalRow.id,
  });

  const handlePersonaRowClick = React.useCallback(
    (row: AudienceRow) => onPersonaSelect(row.id),
    [onPersonaSelect]
  );

  const pageSizeOptions = React.useMemo(() => [10, 30, 50, 100, 200], []);

  const leftTableProps = React.useMemo(
    () => ({
      onRowClick: handlePersonaRowClick,
      selectedRowId: selectedPersonaId,
      showPagination: true,
      pageSizeOptions,
      hideRowsPerPage: true,
    }),
    [handlePersonaRowClick, selectedPersonaId, pageSizeOptions]
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
      left: "persona_name",
      right: "use_case_name",
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

  return (
    <SplitTableView
      leftTable={leftTable}
      leftEmptyMessage="No personas found."
      leftTableProps={leftTableProps}
      rightTable={keywordsTable}
      rightEmptyMessage="Select a persona to view use cases and keywords."
      rightTableProps={rightTableProps}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search personas, use cases and keywords..."
      searchColumnIds={searchColumnIds}
      leftTableHooks={leftTableHooks}
      leftTableWidth="35%"
      rightTableWidth="65%"
      onBack={onBack}
    />
  );
});
