"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { DigitalAdsTable } from "./digital-ads-table";
import { DigitalAdsSplitView } from "./digital-ads-split-view";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useDigitalAds } from "@/hooks/use-digital-ads";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { DigitalAdsRow } from "@/types/digital-ads-types";

interface DigitalAdsTableClientProps {
  businessId: string;
}

export function DigitalAdsTableClient({ businessId }: DigitalAdsTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [splitViewSearch, setSplitViewSearch] = React.useState("");
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

  const { fetchDigitalAds } = useDigitalAds(businessId);
  const queryClient = useQueryClient();

  const queryKey = React.useMemo(
    () => [
      "digital-ads",
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
    data: digitalAdsData,
    isLoading: digitalAdsLoading,
    isFetching: digitalAdsFetching,
    isError: digitalAdsError,
    error: digitalAdsErrorData,
    refetch: refetchDigitalAds,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchDigitalAds({
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
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Don't refetch if data exists in cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  React.useEffect(() => {
    if (!jobExists || !digitalAdsData || !digitalAdsData.pageCount) return;
    
    const pageCount = digitalAdsData.pageCount;
    if (pageCount <= 1) return;

    const prefetchPages = async () => {
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "digital-ads",
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
              return fetchDigitalAds({
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
          "digital-ads",
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
            return fetchDigitalAds({
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
  }, [digitalAdsData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchDigitalAds, jobExists]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (digitalAdsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load digital ads data</p>
        <p className="text-sm text-muted-foreground">
          {digitalAdsErrorData instanceof Error
            ? digitalAdsErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchDigitalAds()}>Try Again</Button>
      </div>
    );
  }

  const handleRowClick = React.useCallback((row: DigitalAdsRow) => {
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
    if (!selectedRowId || !digitalAdsData?.data) return null;
    return digitalAdsData.data.find(row => row.id === selectedRowId) || null;
  }, [selectedRowId, digitalAdsData?.data]);

  const keywords = React.useMemo(() => {
    return selectedRow?.keywords || [];
  }, [selectedRow]);

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <DigitalAdsSplitView
          leftTableData={digitalAdsData?.data || []}
          keywordsData={keywords}
          selectedRowId={selectedRowId}
          onRowSelect={handleLeftTableRowSelect}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
          pageCount={digitalAdsData?.pageCount || 0}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <DigitalAdsTable
        data={digitalAdsData?.data || []}
        pageCount={digitalAdsData?.pageCount || 0}
        isLoading={digitalAdsLoading && !digitalAdsData}
        isFetching={digitalAdsFetching}
        search={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
