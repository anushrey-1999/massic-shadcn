"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useUnifiedWebOptimization, type UnifiedPageRow, NO_SNAPSHOT_CODE } from "@/hooks/use-unified-web-optimization";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { EmptyState } from "@/components/molecules/EmptyState";
import { WebUnifiedPagesTable } from "./web-unified-pages-table";
import { WebUnifiedPagesSplitView } from "./web-unified-pages-split-view";

interface Props {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
}

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  const anyError = error as any;
  const responseMessage =
    anyError?.response?.data?.message ||
    anyError?.response?.data?.detail ||
    anyError?.response?.data?.error;
  if (typeof responseMessage === "string" && responseMessage.trim()) return responseMessage;
  if (error instanceof Error) return error.message;
  return anyError?.message || "";
}

function isGoogleNotConnected(error: unknown): boolean {
  const anyError = error as any;
  if (anyError?.code === "GOOGLE_NOT_CONNECTED") return true;
  return getErrorMessage(error).toLowerCase().includes("failed to fetch access token");
}

function isNoSnapshot(error: unknown): boolean {
  const anyError = error as any;
  return anyError?.code === NO_SNAPSHOT_CODE;
}

function applyLocalSearch(rows: UnifiedPageRow[], search: string): UnifiedPageRow[] {
  const term = (search || "").trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) => {
    if (row.page.toLowerCase().includes(term)) return true;
    if (row.page_type.toLowerCase().includes(term)) return true;
    if (row.label.toLowerCase().includes(term)) return true;
    if (row.url.toLowerCase().includes(term)) return true;
    return false;
  });
}

export function WebUnifiedPagesTableClient({ businessId, onSplitViewChange }: Props) {
  const [search, setSearch] = React.useState("");
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [splitViewSearch, setSplitViewSearch] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { connectGoogleAccount } = useGoogleAccounts();
  const { fetchUnifiedPages, triggerGenerate } = useUnifiedWebOptimization();

  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => ["unified-web-optimization", businessId], [businessId]);

  const queryState = queryClient.getQueryState(queryKey);
  const has400Error = React.useMemo(() => {
    if (!queryState?.error) return false;
    const error = queryState.error as any;
    const status = error?.response?.status || error?.status;
    return status === 400;
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
    queryFn: () => fetchUnifiedPages(businessId),
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!businessId && !has400Error,
  });

  const handleGenerate = React.useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await triggerGenerate(businessId);
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Unified list generated successfully.");
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Failed to generate unified list";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [businessId, triggerGenerate, queryClient, queryKey, isGenerating]);

  const filteredRows = React.useMemo(
    () => applyLocalSearch(allRows || [], search),
    [allRows, search]
  );

  const handleRowClick = React.useCallback(
    (row: UnifiedPageRow) => {
      setSelectedRowId(row.id);
      setIsSplitView(true);
      onSplitViewChange?.(true);
    },
    [onSplitViewChange]
  );

  const handleBackToMain = React.useCallback(() => {
    setIsSplitView(false);
    setSelectedRowId(null);
    setSplitViewSearch("");
    onSplitViewChange?.(false);
  }, [onSplitViewChange]);

  const handleLeftTableRowSelect = React.useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  if (isError && !isNoSnapshot(error)) {
    if (isGoogleNotConnected(error)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Connect Google account</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Google Analytics and Search Console to view the unified pages list.
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
        <p className="text-destructive font-medium">Failed to load unified pages</p>
        <p className="text-sm text-muted-foreground">
          {getErrorMessage(error) || "An error occurred"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (isError && isNoSnapshot(error)) {
    return (
      <EmptyState
        title="No unified list for this month yet"
        description="Generate a unified web optimization list to see all pages in one view. This runs the same analysis as the monthly job and stores the result here."
        className="h-[calc(100vh-16rem)]"
        buttons={[
          {
            label: isGenerating ? "Generating…" : "Generate unified list",
            onClick: handleGenerate,
            variant: "default",
            size: "lg",
          },
        ]}
      />
    );
  }

  if (!isLoading && !isError && (!allRows || allRows.length === 0)) {
    return (
      <EmptyState
        title="No pages available"
        description="Unified page analysis requires Google Search Console data."
        className="h-[calc(100vh-16rem)]"
      />
    );
  }

  if (isSplitView) {
    const splitFilteredRows = applyLocalSearch(allRows || [], splitViewSearch);

    return (
      <div className="relative h-full flex flex-col">
        <WebUnifiedPagesSplitView
          leftTableData={splitFilteredRows}
          selectedRowId={selectedRowId}
          onRowSelect={handleLeftTableRowSelect}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <WebUnifiedPagesTable
        data={filteredRows}
        businessId={businessId}
        isLoading={isLoading && !allRows}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
