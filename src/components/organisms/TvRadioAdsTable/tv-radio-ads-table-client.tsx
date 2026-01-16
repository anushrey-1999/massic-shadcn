"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { TvRadioAdsTable } from "./tv-radio-ads-table";
import { TvRadioAdsSplitView } from "./tv-radio-ads-split-view";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTvRadioAds } from "@/hooks/use-tv-radio-ads";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { TvRadioAdConceptRow, TvRadioAdsMetrics } from "@/types/tv-radio-ads-types";
import type { TvRadioApiFilter } from "@/types/tv-radio-ads-types";

interface TvRadioAdsTableClientProps {
  businessId: string;
  onMetricsChange?: (metrics: TvRadioAdsMetrics | null) => void;
}

export function TvRadioAdsTableClient({ businessId, onMetricsChange }: TvRadioAdsTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(24));
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
    parseAsJson<TvRadioApiFilter[]>((value) => {
      if (Array.isArray(value)) return value as TvRadioApiFilter[];
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

  const previousPageRef = React.useRef(page);
  React.useEffect(() => {
    if (previousPageRef.current === page) return;
    previousPageRef.current = page;

    if (!isSplitView) return;
    setIsSplitView(false);
    setSelectedRowId(null);
  }, [page, isSplitView]);

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { fetchTvRadioAds } = useTvRadioAds(businessId);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!hasActiveSearchOrFilters) return;

    queryClient.cancelQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] !== "tv-radio-ads") return false;
        if (key[1] !== businessId) return false;

        const keyPage = typeof key[2] === "number" ? key[2] : Number(key[2]);
        const keySearch = typeof key[4] === "string" ? key[4] : "";

        return keySearch === "" && Number.isFinite(keyPage) && keyPage > 1;
      },
    });
  }, [hasActiveSearchOrFilters, businessId, queryClient]);

  const queryKey = React.useMemo(
    () => [
      "tv-radio-ads",
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
      const result = await fetchTvRadioAds({
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
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  React.useEffect(() => {
    onMetricsChange?.(data?.metrics ?? null);
  }, [onMetricsChange, data?.metrics]);

  React.useEffect(() => {
    if (!jobExists || !data || !data.pageCount) return;
    if (hasActiveSearchOrFilters) return;

    const pageCount = data.pageCount;
    if (pageCount <= 1) return;

    const prefetchPages = async () => {
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "tv-radio-ads",
          businessId,
          prevPage,
          perPage,
          search || "",
          JSON.stringify(sort),
          JSON.stringify(filters),
          joinOperator,
        ];

        const prevCached = queryClient.getQueryData(prevQueryKey);
        if (!prevCached) {
          queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: async () => {
              return fetchTvRadioAds({
                business_id: businessId,
                page: prevPage,
                perPage,
                search: search || undefined,
                sort: sort || [],
                filters: filters || [],
                joinOperator: (joinOperator || "and") as "and" | "or",
              });
            },
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 15,
          });
        }
      }

      const pagesToPrefetch = Math.min(2, pageCount - page);

      for (let i = 1; i <= pagesToPrefetch; i++) {
        const nextPage = page + i;
        if (nextPage > pageCount) break;

        const prefetchQueryKey = [
          "tv-radio-ads",
          businessId,
          nextPage,
          perPage,
          search || "",
          JSON.stringify(sort),
          JSON.stringify(filters),
          joinOperator,
        ];

        const cachedData = queryClient.getQueryData(prefetchQueryKey);
        if (cachedData) continue;

        queryClient.prefetchQuery({
          queryKey: prefetchQueryKey,
          queryFn: async () => {
            return fetchTvRadioAds({
              business_id: businessId,
              page: nextPage,
              perPage,
              search: search || undefined,
              sort: sort || [],
              filters: filters || [],
              joinOperator: (joinOperator || "and") as "and" | "or",
            });
          },
          staleTime: 1000 * 60 * 5,
          gcTime: 1000 * 60 * 15,
        });
      }
    };

    prefetchPages();
  }, [data, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchTvRadioAds, jobExists, hasActiveSearchOrFilters]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load TV & Radio ads data</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const handleRowClick = React.useCallback((row: TvRadioAdConceptRow) => {
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

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <TvRadioAdsSplitView
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
      <TvRadioAdsTable
        data={data?.data || []}
        pageCount={data?.pageCount || 0}
        isLoading={isLoading && !data}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
