"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useWebOptimizationAnalysis } from "@/hooks/use-web-optimization-analysis";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";
import { WebOptimizationAnalysisTable } from "./web-optimization-analysis-table";
import { WebOptimizationAnalysisSplitView } from "./web-optimization-analysis-split-view";
import type { WebOptimizationSuggestionRow } from "./suggestions-table-columns";

interface WebOptimizationAnalysisTableClientProps {
  businessId: string;
}

function toSuggestionRows(row: WebOptimizationAnalysisRow | null): WebOptimizationSuggestionRow[] {
  if (!row) return [];
  const suggestions = Array.isArray(row.suggested_changes) ? row.suggested_changes : [];
  return suggestions
    .filter((s) => s && (s.category || s.action))
    .map((s, index) => ({
      id: `${row.id}-s-${index}`,
      category: (s.category || "").toString(),
      action: (s.action || "").toString(),
    }));
}

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  const anyError = error as any;
  const responseMessage =
    anyError?.response?.data?.message ||
    anyError?.response?.data?.detail ||
    anyError?.response?.data?.error ||
    anyError?.response?.data?.data?.message;

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  if (error instanceof Error) return error.message;
  return (
    anyError?.message ||
    anyError?.response?.data?.message ||
    anyError?.response?.data?.detail ||
    ""
  );
}

function isGoogleNotConnected(error: unknown): boolean {
  const anyError = error as any;
  if (anyError?.code === "GOOGLE_NOT_CONNECTED") return true;
  const message = getErrorMessage(error);
  return message.toLowerCase().includes("failed to fetch access token");
}

function applyLocalSearch(rows: WebOptimizationAnalysisRow[], search: string): WebOptimizationAnalysisRow[] {
  const term = (search || "").trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    if ((row.page_url || "").toLowerCase().includes(term)) return true;
    if ((row.opportunity || "").toLowerCase().includes(term)) return true;

    const suggestionHit = (row.suggested_changes || []).some((s) => {
      const action = (s.action || "").toLowerCase();
      const category = (s.category || "").toLowerCase();
      return action.includes(term) || category.includes(term);
    });
    if (suggestionHit) return true;

    const numericHaystack = `${row.impressions} ${row.clicks} ${row.sessions} ${row.goals}`;
    return numericHaystack.includes(term);
  });
}

export function WebOptimizationAnalysisTableClient({ businessId }: WebOptimizationAnalysisTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [splitViewSearch, setSplitViewSearch] = React.useState("");

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { connectGoogleAccount } = useGoogleAccounts();

  const { fetchWebOptimizationAnalysisAll } = useWebOptimizationAnalysis();

  const {
    data: allRows,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["web-optimization-analysis-all", businessId],
    queryFn: async () => fetchWebOptimizationAnalysisAll(businessId),
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  const filteredRows = React.useMemo(
    () => applyLocalSearch(allRows || [], search),
    [allRows, search]
  );

  const handleRowClick = React.useCallback((row: WebOptimizationAnalysisRow) => {
    setSelectedRowId(row.id);
    setIsSplitView(true);
  }, []);

  const handleBackToMain = React.useCallback(() => {
    setIsSplitView(false);
    setSelectedRowId(null);
  }, []);

  const handleLeftTableRowSelect = React.useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const selectedRow = React.useMemo(() => {
    if (!selectedRowId) return null;
    return (filteredRows || []).find((r) => r.id === selectedRowId) || null;
  }, [selectedRowId, filteredRows]);

  const suggestions = React.useMemo(() => toSuggestionRows(selectedRow), [selectedRow]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (isError) {
    if (isGoogleNotConnected(error)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Connect Google account</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Google Analytics and Search Console to view optimization analysis.
            </p>
          </div>
          <Button onClick={connectGoogleAccount} variant="outline">
            Connect Google Account
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load optimization analysis</p>
        <p className="text-sm text-muted-foreground">
          {getErrorMessage(error) || "An error occurred"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <WebOptimizationAnalysisSplitView
          leftTableData={filteredRows || []}
          suggestionsData={suggestions}
          selectedRowId={selectedRowId}
          onRowSelect={handleLeftTableRowSelect}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
          pageCount={1}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <WebOptimizationAnalysisTable
        data={filteredRows || []}
        isLoading={isLoading && !allRows}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
