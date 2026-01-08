"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsJson } from "nuqs";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportsTable } from "./reports-table";
import { useReportRuns } from "@/hooks/use-report-runs";

export function ReportsTableClient({ businessId }: { businessId: string }) {
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(24));
  const [sort] = useQueryState(
    "sort",
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) {
        return value as Array<{ field: string; desc: boolean }>;
      }
      return null;
    }).withDefault([])
  );

  const { fetchReportRuns } = useReportRuns();
  const queryClient = useQueryClient();

  const queryKey = React.useMemo(
    () => ["report-runs", businessId, page, perPage, JSON.stringify(sort)],
    [businessId, page, perPage, sort]
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
      return fetchReportRuns({
        business_id: businessId,
        page,
        perPage,
        sort: sort || [],
      });
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
    refetchOnMount: false,
    retry: 1,
    enabled: !!businessId,
  });

  React.useEffect(() => {
    if (!data?.pageCount) return;
    if (data.pageCount <= 1) return;

    const nextPage = page + 1;
    if (nextPage > data.pageCount) return;

    const nextQueryKey = ["report-runs", businessId, nextPage, perPage, JSON.stringify(sort)];
    const cached = queryClient.getQueryData(nextQueryKey);
    if (cached) return;

    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: async () => {
        return fetchReportRuns({
          business_id: businessId,
          page: nextPage,
          perPage,
          sort: sort || [],
        });
      },
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
    });
  }, [data?.pageCount, page, perPage, sort, businessId, queryClient, fetchReportRuns]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Failed to load reports</span>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ReportsTable
      businessId={businessId}
      data={data?.data ?? []}
      pageCount={data?.pageCount ?? 0}
      isLoading={isLoading}
      isFetching={isFetching}
    />
  );
}
