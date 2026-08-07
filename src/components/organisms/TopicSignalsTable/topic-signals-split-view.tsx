"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TopicSignalRow } from "@/types/topic-signals-types";
import { TopicSignalDetailPanel } from "./topic-signal-detail-panel";
import { TopicSignalsTable } from "./topic-signals-table";

interface TopicSignalsSplitViewProps {
  rows: TopicSignalRow[];
  selectedRowId: string | null;
  onRowSelect: (rowId: string) => void;
  onBack: () => void;
  pageCount?: number;
}

export function TopicSignalsSplitView({
  rows,
  selectedRowId,
  onRowSelect,
  onBack,
  pageCount = 1,
}: TopicSignalsSplitViewProps) {
  const selectedRow = React.useMemo(() => {
    if (!selectedRowId) return rows[0] || null;
    return rows.find((row) => String(row.id) === selectedRowId) || rows[0] || null;
  }, [rows, selectedRowId]);

  const handleRowClick = React.useCallback(
    (row: TopicSignalRow) => onRowSelect(String(row.id)),
    [onRowSelect]
  );

  return (
    <div className="bg-white rounded-lg p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <Button variant="outline" size="sm" onClick={onBack} className="h-9">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to signals
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex h-full w-[412px] shrink-0 flex-col overflow-hidden">
          <TopicSignalsTable
            data={rows}
            pageCount={pageCount}
            onRowClick={handleRowClick}
            selectedRowId={selectedRow ? String(selectedRow.id) : null}
            compact
          />
        </div>

        <div className="h-full flex-1 min-w-0 overflow-auto">
          {selectedRow ? (
            <div className="max-w-[724px]">
              <TopicSignalDetailPanel row={selectedRow} />
            </div>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
