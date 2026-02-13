"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { parseAsStringEnum } from "nuqs";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useWebOptimizationAnalysis } from "@/hooks/use-web-optimization-analysis";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import type { WebOptimizationAnalysisRow } from "@/types/web-optimization-analysis-types";
import { WebOptimizationAnalysisTable } from "./web-optimization-analysis-table";
import { WebOptimizationAnalysisSplitView } from "./web-optimization-analysis-split-view";
import type { WebOptimizationSuggestionRow } from "./suggestions-table-columns";
import { EmptyState } from "@/components/molecules/EmptyState";
import { getFiltersStateParser } from "@/components/filter-table/parsers";
import { getValidFilters, tableApplyAdvancedFilters } from "@/utils/data-table-utils";
import { getWebOptimizationAnalysisTableColumns } from "./web-optimization-analysis-table-columns";
import type { ExtendedColumnFilter } from "@/types/data-table-types";

interface WebOptimizationAnalysisTableClientProps {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
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

function isNoAuthenticationError(error: unknown): boolean {
  const anyError = error as any;
  const status = anyError?.response?.status || anyError?.status;
  if (status !== 400) return false;
  
  const message = getErrorMessage(error);
  return message === "No authentication linked to this business profile";
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

function normalizePercentFilters(
  filters: ExtendedColumnFilter<WebOptimizationAnalysisRow>[]
): ExtendedColumnFilter<WebOptimizationAnalysisRow>[] {
  const opsToDecimal = (v: number) => (v > 1 ? v / 100 : v);
  const ctrToDecimal = (v: number) => v / 100;
  return filters.map((filter) => {
    if (filter.field === "ops") {
      if (Array.isArray(filter.value)) {
        const [min, max] = filter.value;
        const minNum = min ? Number(min) : NaN;
        const maxNum = max ? Number(max) : NaN;
        return {
          ...filter,
          value: [
            String(!Number.isNaN(minNum) ? opsToDecimal(minNum) : min),
            String(!Number.isNaN(maxNum) ? opsToDecimal(maxNum) : max),
          ],
        };
      }
      const num = Number(filter.value);
      return !Number.isNaN(num) ? { ...filter, value: String(opsToDecimal(num)) } : filter;
    }
    if (filter.field === "ctr") {
      if (Array.isArray(filter.value)) {
        const [min, max] = filter.value;
        const minNum = min ? Number(min) : NaN;
        const maxNum = max ? Number(max) : NaN;
        return {
          ...filter,
          value: [
            String(!Number.isNaN(minNum) ? ctrToDecimal(minNum) : min),
            String(!Number.isNaN(maxNum) ? ctrToDecimal(maxNum) : max),
          ],
        };
      }
      const num = Number(filter.value);
      return !Number.isNaN(num) ? { ...filter, value: String(ctrToDecimal(num)) } : filter;
    }
    return filter;
  });
}

export function WebOptimizationAnalysisTableClient({ businessId, onSplitViewChange }: WebOptimizationAnalysisTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [splitViewSearch, setSplitViewSearch] = React.useState("");

  const { connectGoogleAccount } = useGoogleAccounts();

  const { fetchWebOptimizationAnalysisAll } = useWebOptimizationAnalysis();

  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => ["web-optimization-analysis-all", businessId], [businessId]);
  
  // Check if query has a 400/404 error state
  const queryState = queryClient.getQueryState(queryKey);
  const has400Or404Error = React.useMemo(() => {
    if (!queryState?.error) return false;
    const error = queryState.error as any;
    const status = error?.response?.status || error?.status;
    return status === 400 || status === 404;
  }, [queryState?.error]);

  const {
    data: allRows,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchWebOptimizationAnalysisAll(businessId);
    },
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
    retry: false, // Disable retries completely - stop on 400/404 errors
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    enabled: !!businessId && !has400Or404Error, // Disable query if we have a 400/404 error
  });

  const filterFieldMapper = React.useMemo(() => {
    const columns = getWebOptimizationAnalysisTableColumns();
    const validQueryFields = columns
      .map((c) => (c as { id?: string }).id)
      .filter(Boolean) as string[];
    return {
      validQueryFields,
      toQueryField: (f: string) => f,
      fromQueryField: (f: string) => f,
    };
  }, []);

  const [urlFilters] = useQueryState(
    "webOptimizeFilters",
    getFiltersStateParser<WebOptimizationAnalysisRow>(
      filterFieldMapper.validQueryFields,
      {
        toQueryField: filterFieldMapper.toQueryField,
        fromQueryField: filterFieldMapper.fromQueryField,
      }
    )
      .withDefault([])
      .withOptions({ shallow: true })
  );

  const [joinOperator] = useQueryState(
    "webOptimizeJoin",
    parseAsStringEnum(["and", "or"]).withDefault("and").withOptions({ shallow: true })
  );

  const filteredRows = React.useMemo(() => {
    const searchFiltered = applyLocalSearch(allRows || [], search);
    const valid = getValidFilters(urlFilters ?? []);
    if (valid.length === 0) return searchFiltered;
    const normalized = normalizePercentFilters(valid);
    return tableApplyAdvancedFilters(searchFiltered, normalized, joinOperator ?? "and");
  }, [allRows, search, urlFilters, joinOperator]);

  const handleRowClick = React.useCallback((row: WebOptimizationAnalysisRow) => {
    setSelectedRowId(row.id);
    setIsSplitView(true);
    onSplitViewChange?.(true);
  }, [onSplitViewChange]);

  const handleBackToMain = React.useCallback(() => {
    setIsSplitView(false);
    setSelectedRowId(null);
    onSplitViewChange?.(false);
  }, [onSplitViewChange]);

  const handleLeftTableRowSelect = React.useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const selectedRow = React.useMemo(() => {
    if (!selectedRowId) return null;
    return (filteredRows || []).find((r) => r.id === selectedRowId) || null;
  }, [selectedRowId, filteredRows]);

  const suggestions = React.useMemo(() => toSuggestionRows(selectedRow), [selectedRow]);

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

    if (isNoAuthenticationError(error)) {
      return (
        <EmptyState
          title="Data not available"
          description="Need to connect your google account"
          className="h-[calc(100vh-16rem)]"
          buttons={[
            {
              label: "Go to Settings",
              href: "/settings",
              variant: "outline",
              size: "lg"
            }
          ]}
        />
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

  if (!isLoading && !isError && (!allRows || allRows.length === 0)) {
    return (
      <EmptyState
        title="Data not available"
        description="Need to connect your google account"
        className="h-[calc(100vh-16rem)]"
        buttons={[
          {
            label: "Go to Settings",
            href: "/settings",
            variant: "outline",
            size: "lg"
          }
        ]}
      />
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
