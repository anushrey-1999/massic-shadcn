"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { StrategyTable } from "./strategy-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useStrategy } from "@/hooks/use-strategy";
import { useJobByBusinessId } from "@/hooks/use-jobs";

interface StrategyTableClientProps {
  businessId: string;
}

export function StrategyTableClient({ businessId }: StrategyTableClientProps) {
  // Read query parameters from URL
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [sort] = useQueryState(
    "sort",
    parseAsJson<Array<{ id: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) {
        return value as Array<{ id: string; desc: boolean }>;
      }
      return null;
    }).withDefault([])
  );
  const [filters] = useQueryState(
    "filters",
    parseAsJson<
      Array<{
        id: string;
        value: string | string[];
        variant: string;
        operator: string;
        filterId: string;
      }>
    >((value) => {
      if (Array.isArray(value)) {
        return value as Array<{
          id: string;
          value: string | string[];
          variant: string;
          operator: string;
          filterId: string;
        }>;
      }
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState(
    "joinOperator",
    parseAsString.withDefault("and")
  );

  // Reset to page 1 when search changes
  React.useEffect(() => {
    if (search && page !== 1) {
      setPage(1);
    }
  }, [search, page, setPage]);

  // Check if job exists - strategy API should only be called when job exists
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  // Get the useStrategy hook
  const { fetchStrategy, fetchStrategyCounts } = useStrategy(businessId);
  const queryClient = useQueryClient();

  // Optimize query key serialization for better caching
  const queryKey = React.useMemo(
    () => [
      "strategy",
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

  // Fetch strategy data with improved error handling
  const {
    data: strategyData,
    isLoading: strategyLoading,
    isFetching: strategyFetching,
    isError: strategyError,
    error: strategyErrorData,
    refetch: refetchStrategy,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchStrategy({
        business_id: businessId,
        page,
        perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
      });
    },
    staleTime: 1000 * 60, // 1 minute
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading, // Only fetch if businessId is provided and job exists
  });

  // Prefetch next 3 pages and previous page for instant navigation
  React.useEffect(() => {
    // Only prefetch if job exists and we have data (don't wait for loading to finish)
    if (!jobExists || !strategyData || !strategyData.pageCount) return;
    
    const pageCount = strategyData.pageCount;
    if (pageCount <= 1) return; // No pages to prefetch if only 1 page

    // Prefetch in background (don't block on this)
    const prefetchPages = async () => {
      // Prefetch previous page if not on page 1 (for back navigation)
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "strategy",
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
              return fetchStrategy({
                business_id: businessId,
                page: prevPage,
                perPage,
                search: search || undefined,
                sort: sort || [],
                filters: filters || [],
                joinOperator: (joinOperator || "and") as "and" | "or",
              });
            },
            staleTime: 1000 * 60,
          });
        }
      }

      // Prefetch next 3 pages (or remaining pages if less than 3)
      const pagesToPrefetch = Math.min(3, pageCount - page);
      
      for (let i = 1; i <= pagesToPrefetch; i++) {
        const nextPage = page + i;
        if (nextPage > pageCount) break;

        const prefetchQueryKey = [
          "strategy",
          businessId,
          nextPage,
          perPage,
          search || "",
          JSON.stringify(sort),
          JSON.stringify(filters),
          joinOperator,
        ];

        // Check if already cached to avoid unnecessary requests
        const cachedData = queryClient.getQueryData(prefetchQueryKey);
        if (cachedData) continue;

        // Prefetch in background
        queryClient.prefetchQuery({
          queryKey: prefetchQueryKey,
          queryFn: async () => {
            return fetchStrategy({
              business_id: businessId,
              page: nextPage,
              perPage,
              search: search || undefined,
              sort: sort || [],
              filters: filters || [],
              joinOperator: (joinOperator || "and") as "and" | "or",
            });
          },
          staleTime: 1000 * 60, // 1 minute
        });
      }
    };

    // Run prefetch asynchronously
    prefetchPages();
  }, [strategyData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchStrategy, jobExists]);

  // Fetch counts and ranges (these don't depend on filters)
  // DISABLED: Backend doesn't have a separate counts endpoint yet
  // We'll use default values for now
  const {
    data: countsData,
    isError: countsError,
    error: countsErrorData,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["strategy-counts", businessId],
    queryFn: async () => {
      return fetchStrategyCounts();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: false, // Disabled until backend provides a counts endpoint
  });

  // Show loading state while checking job
  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  // Show error state for strategy data
  if (strategyError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load strategy data</p>
        <p className="text-sm text-muted-foreground">
          {strategyErrorData instanceof Error
            ? strategyErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchStrategy()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <StrategyTable
        data={strategyData?.data || []}
        pageCount={strategyData?.pageCount || 0}
        offeringCounts={countsData?.offeringCounts || {}}
        businessRelevanceRange={
          countsData?.businessRelevanceRange || { min: 0, max: 1 }
        }
        topicCoverageRange={
          countsData?.topicCoverageRange || { min: 0, max: 1 }
        }
        searchVolumeRange={
          countsData?.searchVolumeRange || { min: 0, max: 10000 }
        }
        isLoading={strategyLoading && !strategyData}
        isFetching={strategyFetching}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
