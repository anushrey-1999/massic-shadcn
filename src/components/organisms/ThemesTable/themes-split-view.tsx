"use client";

import * as React from "react";
import { SplitTableView } from "@/components/split-view-table";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import type { ThemeRow } from "@/types/themes-types";
import {
  getThemeTopicsTableColumns,
  getThemesSplitTableColumns,
  type ThemeDetailRow,
} from "./themes-split-table-columns";

interface ThemesSplitViewProps {
  themesData: ThemeRow[];
  selectedThemeId: string | null;
  onThemeSelect: (themeId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
}

export const ThemesSplitView = React.memo(function ThemesSplitView({
  themesData,
  selectedThemeId,
  onThemeSelect,
  search,
  onSearchChange,
  onBack,
}: ThemesSplitViewProps) {
  const leftColumns = React.useMemo(() => getThemesSplitTableColumns(), []);
  const topicsColumns = React.useMemo(() => getThemeTopicsTableColumns(), []);

  const selectedTheme = React.useMemo(() => {
    if (!selectedThemeId) return null;
    return themesData.find((row) => row.id === selectedThemeId) || null;
  }, [selectedThemeId, themesData]);

  const topicsData = React.useMemo<ThemeDetailRow[]>(() => {
    if (!selectedTheme) return [];

    return [
      {
        id: selectedTheme.id,
        topics: (selectedTheme.topics || []).map((topic) => topic.topic_name),
        theme_name: selectedTheme.theme_name,
        offerings: selectedTheme.offerings || [],
      },
    ];
  }, [selectedTheme]);

  const { table: leftTable } = useLocalDataTable({
    data: themesData,
    columns: leftColumns,
    initialState: {
      sorting: [{ id: "theme_name", desc: false }],
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
    getRowId: (row: ThemeRow) => row.id,
  });

  const { table: topicsTable } = useLocalDataTable({
    data: topicsData,
    columns: topicsColumns,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (row: ThemeDetailRow) => row.id,
  });

  const handleThemeRowClick = React.useCallback(
    (row: ThemeRow) => onThemeSelect(row.id),
    [onThemeSelect]
  );

  const pageSizeOptions = React.useMemo(() => [25, 50, 100], []);

  const leftTableProps = React.useMemo(
    () => ({
      onRowClick: handleThemeRowClick,
      selectedRowId: selectedThemeId,
      showPagination: true,
      pageSizeOptions,
      hideRowsPerPage: true,
    }),
    [handleThemeRowClick, selectedThemeId, pageSizeOptions]
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
      left: "theme_name",
      right: "topics",
    }),
    []
  );

  return (
    <div className="h-full flex flex-col">
      <SplitTableView
        leftTable={leftTable}
        leftEmptyMessage="No themes found."
        leftTableProps={leftTableProps}
        rightTable={topicsTable}
        rightEmptyMessage="Select a theme to view topics and offerings."
        rightTableProps={rightTableProps}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search themes and topics..."
        searchColumnIds={searchColumnIds}
        leftTableWidth="35%"
        rightTableWidth="65%"
        onBack={onBack}
      />
    </div>
  );
});
