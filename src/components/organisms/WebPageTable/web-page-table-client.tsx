"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { WebPageTable } from "./web-page-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useBlogPagePlan } from "@/hooks/use-blog-page-plan";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { WebPageMetrics } from "@/types/web-page-types";

interface WebPageTableClientProps {
  businessId: string;
  onMetricsChange?: (metrics: WebPageMetrics | null) => void;
}

export function WebPageTableClient({
  businessId,
  onMetricsChange,
}: WebPageTableClientProps) {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
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

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { fetchWebPages, fetchWebPageCounts } = useBlogPagePlan(businessId);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!hasActiveSearchOrFilters) return;

    queryClient.cancelQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] !== "web-page") return false;
        if (key[1] !== businessId) return false;

        const keyPage = typeof key[2] === "number" ? key[2] : Number(key[2]);
        const keySearch = typeof key[4] === "string" ? key[4] : "";

        return keySearch === "" && Number.isFinite(keyPage) && keyPage > 1;
      },
    });
  }, [hasActiveSearchOrFilters, businessId, queryClient]);

  const queryKey = React.useMemo(
    () => [
      "web-page",
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
    data: webPageData,
    isLoading: webPageLoading,
    isFetching: webPageFetching,
    isError: webPageError,
    error: webPageErrorData,
    refetch: refetchWebPage,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchWebPages({
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
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
    gcTime: 1000 * 60 * 15, // 15 minutes - keep in cache longer
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Don't refetch if data exists in cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  React.useEffect(() => {
    onMetricsChange?.(webPageData?.metrics ?? null);
  }, [onMetricsChange, webPageData?.metrics]);

  React.useEffect(() => {
    if (!jobExists || !webPageData || !webPageData.pageCount) return;

    if (hasActiveSearchOrFilters) return;

    const pageCount = webPageData.pageCount;
    if (pageCount <= 1) return;

    const prefetchPages = async () => {
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "web-page",
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
              return fetchWebPages({
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

      const pagesToPrefetch = Math.min(2, pageCount - page);

      for (let i = 1; i <= pagesToPrefetch; i++) {
        const nextPage = page + i;
        if (nextPage > pageCount) break;

        const prefetchQueryKey = [
          "web-page",
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
            return fetchWebPages({
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

    prefetchPages();
  }, [webPageData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchWebPages, jobExists, hasActiveSearchOrFilters]);

  const {
    data: countsData,
    isError: countsError,
    error: countsErrorData,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["web-page-counts", businessId],
    queryFn: async () => {
      return fetchWebPageCounts();
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: false,
  });

  const offerings = React.useMemo(() => {
    if (!jobDetails?.offerings) return [] as string[];

    return jobDetails.offerings
      .map((offering: any) => offering.name || offering.offering || "")
      .filter((name: string) => name.length > 0);
  }, [jobDetails]);

  const offeringCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    offerings.forEach((offering: string) => {
      counts[offering] = 0;
    });
    return counts;
  }, [offerings]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (webPageError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load web page data</p>
        <p className="text-sm text-muted-foreground">
          {webPageErrorData instanceof Error
            ? webPageErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchWebPage()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <WebPageTable
        businessId={businessId}
        data={webPageData?.data || []}
        pageCount={webPageData?.pageCount || 0}
        offeringCounts={offeringCounts}
        isLoading={webPageLoading && !webPageData}
        isFetching={webPageFetching}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
