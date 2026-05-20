"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsJson, parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  isNoContentSeriesError,
  useContentSeries,
} from "@/hooks/use-content-series";
import type {
  ContentSeriesMetrics,
  ContentSeriesRow,
} from "@/types/content-series-types";
import type { ExtendedColumnFilter } from "@/types/data-table-types";
import { ContentSeriesSplitView } from "./content-series-split-view";
import { ContentSeriesTable } from "./content-series-table";

interface ContentSeriesTableClientProps {
  businessId: string;
  onMetricsChange?: (metrics: ContentSeriesMetrics | null) => void;
}

function getErrorMessage(error: unknown): string {
  const anyError = error as any;
  const responseMessage =
    anyError?.response?.data?.message ||
    anyError?.response?.data?.detail ||
    anyError?.response?.data?.error;
  if (typeof responseMessage === "string" && responseMessage.trim()) return responseMessage;
  if (error instanceof Error) return error.message;
  return anyError?.message || "An error occurred";
}

export function ContentSeriesTableClient({
  businessId,
  onMetricsChange,
}: ContentSeriesTableClientProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [sort] = useQueryState(
    "sort",
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) return value as Array<{ field: string; desc: boolean }>;
      return null;
    }).withDefault([])
  );
  const [filters] = useQueryState(
    "filters",
    parseAsJson<ExtendedColumnFilter<ContentSeriesRow>[]>((value) => {
      if (Array.isArray(value)) return value as ExtendedColumnFilter<ContentSeriesRow>[];
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState("joinOperator", parseAsString.withDefault("and"));

  const hasActiveSearchOrFilters = React.useMemo(() => {
    const hasSearch = (search || "").trim().length > 0;
    const hasFilters = Array.isArray(filters) && filters.length > 0;
    return hasSearch || hasFilters;
  }, [search, filters]);

  const previousSearchRef = React.useRef(search);
  React.useEffect(() => {
    if (previousSearchRef.current === search) return;
    previousSearchRef.current = search;
    setPage(1);
  }, [search, setPage]);

  const { fetchContentSeries, generateContentSeries } = useContentSeries(businessId);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!hasActiveSearchOrFilters) return;

    queryClient.cancelQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] !== "content-series") return false;
        if (key[1] !== businessId) return false;

        const keyPage = typeof key[2] === "number" ? key[2] : Number(key[2]);
        const keySearch = typeof key[4] === "string" ? key[4] : "";

        return keySearch === "" && Number.isFinite(keyPage) && keyPage > 1;
      },
    });
  }, [hasActiveSearchOrFilters, businessId, queryClient]);

  const queryKey = React.useMemo(
    () => [
      "content-series",
      businessId,
      page,
      perPage,
      search || "",
      JSON.stringify(sort),
      JSON.stringify(filters),
      joinOperator,
    ],
    [businessId, page, perPage, search, sort, filters, joinOperator]
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchContentSeries({
        business_id: businessId,
        page,
        perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
      });
      onMetricsChange?.(result?.metrics ?? null);
      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
    refetchOnMount: false,
    retry: false,
    retryOnMount: false,
    enabled: !!businessId,
  });

  React.useEffect(() => {
    onMetricsChange?.(data?.metrics ?? null);
  }, [onMetricsChange, data?.metrics]);

  React.useEffect(() => {
    if (isError && isNoContentSeriesError(error)) {
      onMetricsChange?.(null);
    }
  }, [isError, error, onMetricsChange]);

  const handleGenerate = React.useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await generateContentSeries(businessId);
      await queryClient.invalidateQueries({ queryKey: ["content-series", businessId] });
      await refetch();
      toast.success("Content series generated successfully.");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to generate content series.");
    } finally {
      setIsGenerating(false);
    }
  }, [businessId, generateContentSeries, isGenerating, queryClient, refetch]);

  const handleOpenRow = React.useCallback((row: ContentSeriesRow) => {
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

  if (isError && isNoContentSeriesError(error)) {
    return (
      <EmptyState
        title="No content series yet"
        description="Generate content series to see content ideas in a table view."
        className="h-[calc(100vh-16rem)]"
        isProcessing={isGenerating}
        buttons={[
          {
            label: isGenerating ? "Generating..." : "Generate content",
            onClick: handleGenerate,
            variant: "default",
            size: "lg",
          },
        ]}
      />
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load content series</p>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <ContentSeriesSplitView
          businessId={businessId}
          leftTableData={data?.data || []}
          selectedRowId={selectedRowId}
          onRowSelect={handleLeftTableRowSelect}
          onBack={handleBackToMain}
          pageCount={data?.pageCount || 0}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <ContentSeriesTable
        data={data?.data || []}
        pageCount={data?.pageCount || 0}
        isLoading={isLoading && !data}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onRowClick={handleOpenRow}
      />
    </div>
  );
}
