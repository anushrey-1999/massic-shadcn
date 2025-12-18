"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { WebPageTable } from "./web-page-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useBlogPagePlan } from "@/hooks/use-blog-page-plan";
import { useJobByBusinessId } from "@/hooks/use-jobs";

interface WebPageTableClientProps {
  businessId: string;
}

export function WebPageTableClient({ businessId }: WebPageTableClientProps) {
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

  React.useEffect(() => {
    if (search && page !== 1) {
      setPage(1);
    }
  }, [search, page, setPage]);

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { fetchWebPages, fetchWebPageCounts } = useBlogPagePlan(businessId);
  const queryClient = useQueryClient();

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
      return fetchWebPages({
        business_id: businessId,
        page,
        perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
      });
    },
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  React.useEffect(() => {
    if (!jobExists || !webPageData || !webPageData.pageCount) return;

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
            staleTime: 1000 * 60,
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
          staleTime: 1000 * 60,
        });
      }
    };

    prefetchPages();
  }, [webPageData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchWebPages, jobExists]);

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
        isLoading={webPageLoading && !webPageData}
        isFetching={webPageFetching}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
