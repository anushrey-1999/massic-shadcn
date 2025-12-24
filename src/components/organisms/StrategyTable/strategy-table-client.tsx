"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { StrategyTable } from "./strategy-table";
import { StrategySplitView } from "./strategy-split-view";
import type { StrategyClusterRow } from "./strategy-clusters-table-columns";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useStrategy } from "@/hooks/use-strategy";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { StrategyCluster, StrategyRow, StrategyTopic } from "@/types/strategy-types";
import type { ExtendedColumnFilter } from "@/types/data-table-types";

interface StrategyTableClientProps {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
  toolbarRightPrefix?: React.ReactNode;
}

export function StrategyTableClient({
  businessId,
  onSplitViewChange,
  toolbarRightPrefix,
}: StrategyTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);
  // Read query parameters from URL
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [splitViewSearch, setSplitViewSearch] = React.useState("");
  const [sort] = useQueryState(
    "sort",
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) {
        return value as Array<{ field: string; desc: boolean }>;
      }
      return null;
    }).withDefault([])
  );
  const [filters] = useQueryState(
    "filters",
    parseAsJson<ExtendedColumnFilter<StrategyTopic>[]>((value) => {
      if (Array.isArray(value)) {
        return value as ExtendedColumnFilter<StrategyTopic>[];
      }
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState(
    "joinOperator",
    parseAsString.withDefault("and")
  );

  // Reset to page 1 only when the search term actually changes.
  // (Avoid forcing page back to 1 when user paginates while search is active.)
  const previousSearchRef = React.useRef(search);
  React.useEffect(() => {
    if (previousSearchRef.current === search) return;
    previousSearchRef.current = search;
    setPage(1);
  }, [search, setPage]);

  // Check if job exists - strategy API should only be called when job exists
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = !!jobDetails?.job_id;

  // Get the useStrategy hook
  const { fetchStrategy, fetchStrategyCounts } = useStrategy(businessId);
  const queryClient = useQueryClient();

  const hasActiveSearchOrFilters = React.useMemo(() => {
    const hasSearch = (search || "").trim().length > 0;
    const hasFilters = Array.isArray(filters) && filters.length > 0;
    return hasSearch || hasFilters;
  }, [search, filters]);

  React.useEffect(() => {
    if (!hasActiveSearchOrFilters) return;

    queryClient.cancelQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] !== "strategy") return false;
        if (key[1] !== businessId) return false;

        const keyPage = typeof key[2] === "number" ? key[2] : Number(key[2]);
        const keySearch = typeof key[4] === "string" ? key[4] : "";

        // Cancel forward-page prefetches that were started in the default (no-search) state.
        return keySearch === "" && Number.isFinite(keyPage) && keyPage > 1;
      },
    });
  }, [hasActiveSearchOrFilters, businessId, queryClient]);

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
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
    gcTime: 1000 * 60 * 15, // 15 minutes - keep in cache longer
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    refetchOnMount: false, // Don't refetch if data exists in cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading, // Only fetch if businessId is provided and job exists
  });

  // Prefetch pages 2 and 3 when page 1 is already cached (from Analytics prefetch)
  React.useEffect(() => {
    if (!jobExists || !businessId || page !== 1) return;

    const page1QueryKey = [
      "strategy",
      businessId,
      1,
      perPage,
      "",
      JSON.stringify([]),
      JSON.stringify([]),
      "and",
    ];

    const page1Data = queryClient.getQueryData(page1QueryKey) as
      | { pageCount?: number }
      | undefined;
    const pageCount = page1Data?.pageCount;
    if (typeof pageCount === "number" && pageCount > 1) {
      const prefetchNextPages = async () => {
        for (let nextPage = 2; nextPage <= Math.min(3, pageCount); nextPage++) {
          const nextPageQueryKey = [
            "strategy",
            businessId,
            nextPage,
            perPage,
            "",
            JSON.stringify([]),
            JSON.stringify([]),
            "and",
          ];

          const cached = queryClient.getQueryData(nextPageQueryKey);
          if (!cached) {
            queryClient.prefetchQuery({
              queryKey: nextPageQueryKey,
              queryFn: async () => {
                return fetchStrategy({
                  business_id: businessId,
                  page: nextPage,
                  perPage,
                  search: undefined,
                  sort: [],
                  filters: [],
                  joinOperator: "and",
                });
              },
              staleTime: 1000 * 60 * 5, // 5 minutes
              gcTime: 1000 * 60 * 15, // 15 minutes
            });
          }
        }
      };
      prefetchNextPages();
    }
  }, [businessId, jobExists, page, perPage, queryClient, fetchStrategy]);

  // Prefetch next 3 pages and previous page for instant navigation
  React.useEffect(() => {
    // Only prefetch if job exists and we have data (don't wait for loading to finish)
    if (!jobExists || !strategyData || !strategyData.pageCount) return;
    console.log(hasActiveSearchOrFilters, "hasActiveSearchOrFilters");

    // No prefetching at all when search/filters are active.
    if (hasActiveSearchOrFilters) return;

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
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 15, // 15 minutes
          });
        }
      }

      // Prefetch next 2 pages (or remaining pages if less than 2)
      const pagesToPrefetch = Math.min(2, pageCount - page);

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
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 15, // 15 minutes
        });
      }
    };

    // Run prefetch asynchronously
    prefetchPages();
  }, [strategyData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchStrategy, jobExists, hasActiveSearchOrFilters]);

  // Fetch counts and ranges (these don't depend on filters)
  // DISABLED: Backend doesn't have a separate counts endpoint yet
  // We'll use default values for now
  const { data: countsData } = useQuery({
    queryKey: ["strategy-counts", businessId],
    queryFn: async () => {
      return fetchStrategyCounts();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: false, // Disabled until backend provides a counts endpoint
  });

  // Get offerings from job details
  const offerings = React.useMemo(() => {
    if (!jobDetails?.offerings) return [];
    return (jobDetails.offerings as Array<{ name?: string; offering?: string }>).map((offering) => {
      return offering.name || offering.offering || "";
    }).filter((name: string) => name.length > 0);
  }, [jobDetails]);

  const handleRowClick = React.useCallback(
    (row: StrategyRow) => {
      setSelectedTopicId(row.id);
      setIsSplitView(true);
      onSplitViewChange?.(true);
    },
    [onSplitViewChange]
  );

  const handleBackToMain = React.useCallback(() => {
    setIsSplitView(false);
    setSelectedTopicId(null);
    onSplitViewChange?.(false);
  }, [onSplitViewChange]);

  const selectedTopic = React.useMemo(() => {
    if (!selectedTopicId || !strategyData?.data) return null;
    return strategyData.data.find((row) => row.id === selectedTopicId) || null;
  }, [selectedTopicId, strategyData?.data]);

  const clustersData = React.useMemo((): StrategyClusterRow[] => {
    if (!selectedTopic) return [];

    const clusters = selectedTopic.clusters || [];
    if (!Array.isArray(clusters) || clusters.length === 0) return [];

    return clusters.map((cluster: StrategyCluster, index: number) => {
      const clusterName = cluster?.cluster || "";
      const keywords = Array.isArray(cluster?.keywords)
        ? cluster.keywords.filter((k) => k && typeof k === "string")
        : [];

      return {
        id: `${selectedTopicId}_${clusterName}_${index}`,
        cluster: clusterName,
        keywords,
        topic: selectedTopic.topic,
      };
    });
  }, [selectedTopic, selectedTopicId]);

  // Create offering counts for filter options (all have count of 0 since we don't have real counts)
  const offeringCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    offerings.forEach((offering: string) => {
      counts[offering] = 0;
    });
    return counts;
  }, [offerings]);

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

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <StrategySplitView
          leftTableData={strategyData?.data || []}
          clustersData={clustersData}
          selectedTopicId={selectedTopicId}
          onTopicSelect={setSelectedTopicId}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
          pageCount={strategyData?.pageCount || 0}
          businessRelevanceRange={
            countsData?.businessRelevanceRange || { min: 0, max: 1 }
          }
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <StrategyTable
        data={strategyData?.data || []}
        pageCount={strategyData?.pageCount || 0}
        offeringCounts={offeringCounts}
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
        onRowClick={handleRowClick}
        toolbarRightPrefix={toolbarRightPrefix}
      />
    </div>
  );
}
