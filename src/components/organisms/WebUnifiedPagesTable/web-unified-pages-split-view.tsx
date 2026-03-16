"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import type { UnifiedPageRow, UnifiedPageSuggestion } from "@/hooks/use-unified-web-optimization";
import { getWebUnifiedPagesSplitViewColumns } from "./web-unified-pages-split-view-columns";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getWebOptimizationSuggestionsColumns,
  type WebOptimizationSuggestionRow,
} from "@/components/organisms/WebOptimizationAnalysisTable/suggestions-table-columns";

interface WebUnifiedPagesSplitViewProps {
  leftTableData: UnifiedPageRow[];
  selectedRowId: string | null;
  onRowSelect: (rowId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
}

function toTitleCase(value: string): string {
  const v = (value || "").trim();
  if (!v) return "—";
  return v
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

function getKeywords(row: UnifiedPageRow | null): string[] {
  if (!row || row.label !== "New") return [];
  const base = row.page?.trim() ? [row.page.trim()] : [];
  const clusters = Array.isArray(row.keyword_clusters) ? row.keyword_clusters : [];
  return Array.from(
    new Set(
      [...base, ...clusters]
        .map((k) => (k || "").trim())
        .filter(Boolean)
    )
  );
}

function toExistingSuggestions(
  row: UnifiedPageRow | null
): WebOptimizationSuggestionRow[] {
  if (!row || row.label !== "Existing") return [];

  const list = Array.isArray(row.suggested_changes) ? row.suggested_changes : [];
  const fromApi = list
    .map((s: UnifiedPageSuggestion, index: number) => ({
      id: `${row.id}-s-${index}`,
      category: (s?.category || "").toString(),
      action: (s?.action || "").toString(),
    }))
    .filter((s) => s.category || s.action);

  if (fromApi.length > 0) return fromApi;

  return [
    {
      id: `${row.id}-details`,
      category: (row.page_type || "").toString(),
      action: (row.action || "").toString(),
    },
  ];
}

export const WebUnifiedPagesSplitView = React.memo(function WebUnifiedPagesSplitView({
  leftTableData,
  selectedRowId,
  onRowSelect,
  search,
  onSearchChange,
  onBack,
}: WebUnifiedPagesSplitViewProps) {
  const columns = React.useMemo(() => getWebUnifiedPagesSplitViewColumns(), []);
  const existingColumns = React.useMemo(() => getWebOptimizationSuggestionsColumns(), []);

  const { table } = useLocalDataTable({
    data: leftTableData,
    columns,
    initialState: {
      sorting: [{ id: "ups", desc: true }],
      pagination: { pageIndex: 0, pageSize: 100 },
    },
    getRowId: (row: UnifiedPageRow) => row.id,
  });

  const handleRowClick = React.useCallback(
    (row: UnifiedPageRow) => onRowSelect(row.id),
    [onRowSelect]
  );

  const selectedRow = React.useMemo(() => {
    if (!selectedRowId) return null;
    return leftTableData.find((r) => r.id === selectedRowId) || null;
  }, [leftTableData, selectedRowId]);

  const keywords = React.useMemo(() => getKeywords(selectedRow), [selectedRow]);

  const existingDetailsRows = React.useMemo<WebOptimizationSuggestionRow[]>(() => {
    return toExistingSuggestions(selectedRow);
  }, [selectedRow]);

  const { table: existingDetailsTable } = useLocalDataTable({
    data: existingDetailsRows,
    columns: existingColumns,
    initialState: {
      sorting: [{ id: "category", desc: false }],
      pagination: { pageIndex: 0, pageSize: 100 },
    },
    getRowId: (row: WebOptimizationSuggestionRow) => row.id,
  });

  const pageSizeOptions = React.useMemo(() => [10, 30, 50, 100, 200], []);

  const leftTableContainerRef = React.useRef<HTMLDivElement>(null);
  const hasScrolledRef = React.useRef(false);
  React.useEffect(() => {
    if (!selectedRowId || !leftTableContainerRef.current) {
      hasScrolledRef.current = false;
      return;
    }

    hasScrolledRef.current = false;
    const scrollToRow = () => {
      if (hasScrolledRef.current) return;
      const el = leftTableContainerRef.current?.querySelector(
        `[data-selected-row="${selectedRowId}"]`
      ) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      hasScrolledRef.current = true;
    };

    const t1 = window.setTimeout(scrollToRow, 100);
    const t2 = window.setTimeout(scrollToRow, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [selectedRowId, table]);

  return (
    <div className="bg-white rounded-lg p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <div role="toolbar" aria-orientation="horizontal" className="flex w-full items-start justify-between gap-2 p-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack} className="h-9 w-9 p-0" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DataTableSearch
              value={search}
              onChange={onSearchChange}
              placeholder="Search pages..."
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div ref={leftTableContainerRef} className="flex flex-col shrink-0 h-full overflow-hidden" style={{ width: "412px" }}>
          <DataTable
            table={table}
            isLoading={false}
            isFetching={false}
            emptyMessage="No pages found."
            onRowClick={handleRowClick}
            selectedRowId={selectedRowId}
            showPagination={true}
            pageSizeOptions={pageSizeOptions}
            hideRowsPerPage={true}
            paginationAlign="left"
            disableHorizontalScroll={true}
            className="h-full"
          />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {selectedRow ? (
            <div className="h-full min-h-0 flex flex-col rounded-lg border p-4">
              <ScrollArea className="flex-1 min-h-0 pr-2">
                {selectedRow.label === "Existing" ? (
                  <div className="h-full min-h-0">
                    <DataTable
                      table={existingDetailsTable}
                      isLoading={false}
                      isFetching={false}
                      emptyMessage="No details found."
                      showPagination={false}
                      disableHorizontalScroll={true}
                      className="h-full"
                    />
                  </div>
                ) : (
                  <div>
                    <Typography variant="p" className="text-sm text-muted-foreground">
                      Keywords
                    </Typography>
                    <div className="mt-2 rounded-md border bg-muted/20 p-3">
                      {keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {keywords.map((k) => (
                            <Badge key={k} variant="secondary" className="max-w-full truncate">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Typography variant="p" className="text-sm text-muted-foreground">
                          No keywords found.
                        </Typography>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
});
