"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { SocialTable } from "./social-table";
import { TacticsTable } from "./tactics-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ChannelsSidebar } from "./channels-sidebar";
import { useSocial } from "@/hooks/use-social";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { SocialRow } from "@/types/social-types";

interface SocialTableClientProps {
  businessId: string;
  channelsSidebar?: React.ReactNode;
}

export function SocialTableClient({ businessId, channelsSidebar }: SocialTableClientProps) {
  const [tacticsPage, setTacticsPage] = useQueryState("tacticsPage", parseAsInteger.withDefault(1));
  const [tacticsSearch, setTacticsSearch] = useQueryState("tacticsSearch", parseAsString.withDefault(""));
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
  const [channelName, setChannelName] = useQueryState(
    "channel_name",
    parseAsString
  );
  const [campaignName, setCampaignName] = useQueryState(
    "campaign_name",
    parseAsString
  );

  // Store the channel from the clicked row (for tactics view) without changing URL state
  const [selectedRowChannel, setSelectedRowChannel] = React.useState<string | null>(null);

  const isDetailView = React.useMemo(() => {
    // Use selectedRowChannel if available (from clicked row), otherwise use channelName from URL
    const effectiveChannel = selectedRowChannel || channelName;
    return !!(effectiveChannel && campaignName);
  }, [selectedRowChannel, channelName, campaignName]);

  const hasActiveSearchOrFilters = React.useMemo(() => {
    const hasSearch = (search || "").trim().length > 0;
    const hasFilters = Array.isArray(filters) && filters.length > 0;
    const hasChannel = (channelName || "").trim().length > 0;
    return hasSearch || hasFilters || hasChannel;
  }, [search, filters, channelName]);

  const previousSearchRef = React.useRef(search);
  React.useEffect(() => {
    if (previousSearchRef.current === search) return;
    previousSearchRef.current = search;
    setPage(1);
  }, [search, setPage]);

  const previousChannelNameRef = React.useRef(channelName);
  React.useEffect(() => {
    if (previousChannelNameRef.current === channelName) return;
    previousChannelNameRef.current = channelName;
    setPage(1);
  }, [channelName, setPage]);

  const previousTacticsSearchRef = React.useRef(tacticsSearch);
  React.useEffect(() => {
    if (previousTacticsSearchRef.current === tacticsSearch) return;
    previousTacticsSearchRef.current = tacticsSearch;
    setTacticsPage(1);
  }, [tacticsSearch, setTacticsPage]);

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { fetchSocial, fetchSocialCounts, fetchTactics } = useSocial(businessId);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!hasActiveSearchOrFilters) return;

    queryClient.cancelQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] !== "social") return false;
        if (key[1] !== businessId) return false;

        const keyPage = typeof key[2] === "number" ? key[2] : Number(key[2]);
        const keySearch = typeof key[4] === "string" ? key[4] : "";
        const keyChannel = key[8] ?? null;

        return keySearch === "" && keyChannel === null && Number.isFinite(keyPage) && keyPage > 1;
      },
    });
  }, [hasActiveSearchOrFilters, businessId, queryClient]);

  const effectiveChannelName = channelName || "all";

  const queryKey = React.useMemo(
    () => [
      "social",
      businessId,
      page,
      perPage,
      search || "",
      JSON.stringify(sort),
      JSON.stringify(filters),
      joinOperator,
      effectiveChannelName,
    ],
    [businessId, page, perPage, search, sort, filters, joinOperator, effectiveChannelName]
  );

  const {
    data: socialData,
    isLoading: socialLoading,
    isFetching: socialFetching,
    isError: socialError,
    error: socialErrorData,
    refetch: refetchSocial,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchSocial({
        business_id: businessId,
        page,
        perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
        channel_name: effectiveChannelName,
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

  const { data: channelsData } = useQuery({
    queryKey: ["social-channels-list", businessId],
    queryFn: async () => {
      return fetchSocial({
        business_id: businessId,
        page: 1,
        perPage: 100,
        search: undefined,
        sort: [],
        filters: [],
        joinOperator: "and",
        channel_name: undefined,
      });
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  const channelRows = React.useMemo(() => {
    const items = channelsData?.data || [];
    const seen = new Set<string>();
    const rows: Array<{ name: string; relevance: number; icon?: string | null }> = [];
    for (const item of items) {
      const name = item.channel_name || "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const relevance = item.channel_relevance ?? item.campaign_relevance ?? 0;
      rows.push({ name, relevance, icon: null });
    }
    return rows;
  }, [channelsData]);

  // Prefetch pages 2 and 3 when page 1 is already cached (from Analytics prefetch)
  React.useEffect(() => {
    if (!jobExists || !businessId || page !== 1) return;

    if (hasActiveSearchOrFilters) return;

    const page1QueryKey = [
      "social",
      businessId,
      1,
      perPage,
      "",
      JSON.stringify([]),
      JSON.stringify([]),
      "and",
      "all",
    ];

    const page1Data = queryClient.getQueryData(page1QueryKey) as any;
    if (page1Data?.pageCount && page1Data.pageCount > 1) {
      const prefetchNextPages = async () => {
        for (let nextPage = 2; nextPage <= Math.min(3, page1Data.pageCount); nextPage++) {
          const nextPageQueryKey = [
            "social",
            businessId,
            nextPage,
            perPage,
            "",
            JSON.stringify([]),
            JSON.stringify([]),
            "and",
            "all",
          ];

          const cached = queryClient.getQueryData(nextPageQueryKey);
          if (!cached) {
            queryClient.prefetchQuery({
              queryKey: nextPageQueryKey,
              queryFn: async () => {
                return fetchSocial({
                  business_id: businessId,
                  page: nextPage,
                  perPage,
                  search: undefined,
                  sort: [],
                  filters: [],
                  joinOperator: "and",
                  channel_name: "all",
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
  }, [businessId, jobExists, page, perPage, queryClient, fetchSocial, hasActiveSearchOrFilters]);

  React.useEffect(() => {
    if (!jobExists || !socialData || !socialData.pageCount) return;

    if (hasActiveSearchOrFilters) return;

    const pageCount = socialData.pageCount;
    if (pageCount <= 1) return;

    const prefetchPages = async () => {
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "social",
          businessId,
          prevPage,
          perPage,
          search || "",
          JSON.stringify(sort),
          JSON.stringify(filters),
          joinOperator,
          effectiveChannelName,
        ];

        const prevCached = queryClient.getQueryData(prevQueryKey);
        if (!prevCached) {
          queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: async () => {
              return fetchSocial({
                business_id: businessId,
                page: prevPage,
                perPage,
                search: search || undefined,
                sort: sort || [],
                filters: filters || [],
                joinOperator: (joinOperator || "and") as "and" | "or",
                channel_name: effectiveChannelName,
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
          "social",
          businessId,
          nextPage,
          perPage,
          search || "",
          JSON.stringify(sort),
          JSON.stringify(filters),
          joinOperator,
          effectiveChannelName,
        ];

        const cachedData = queryClient.getQueryData(prefetchQueryKey);
        if (cachedData) continue;

        queryClient.prefetchQuery({
          queryKey: prefetchQueryKey,
          queryFn: async () => {
            return fetchSocial({
              business_id: businessId,
              page: nextPage,
              perPage,
              search: search || undefined,
              sort: sort || [],
              filters: filters || [],
              joinOperator: (joinOperator || "and") as "and" | "or",
              channel_name: effectiveChannelName,
            });
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 15, // 15 minutes
        });
      }
    };

    prefetchPages();
  }, [socialData, page, perPage, search, sort, filters, joinOperator, effectiveChannelName, channelName, businessId, queryClient, fetchSocial, jobExists, hasActiveSearchOrFilters]);

  const {
    data: countsData,
    isError: countsError,
    error: countsErrorData,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["social-counts", businessId],
    queryFn: async () => {
      return fetchSocialCounts();
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

  // Use selectedRowChannel for tactics if available, otherwise use channelName from URL
  const tacticsChannel = selectedRowChannel || channelName;

  const tacticsQueryKey = React.useMemo(
    () => [
      "tactics",
      businessId,
      tacticsPage,
      perPage,
      tacticsSearch || "",
      JSON.stringify(filters),
      joinOperator,
      tacticsChannel || null,
      campaignName || null,
    ],
    [businessId, tacticsPage, perPage, tacticsSearch, filters, joinOperator, tacticsChannel, campaignName]
  );

  const {
    data: tacticsData,
    isLoading: tacticsLoading,
    isFetching: tacticsFetching,
    isError: tacticsError,
    error: tacticsErrorData,
    refetch: refetchTactics,
  } = useQuery({
    queryKey: tacticsQueryKey,
    queryFn: async () => {
      if (!tacticsChannel || !campaignName) {
        return { data: [], pageCount: 0 };
      }
      return fetchTactics({
        business_id: businessId,
        page: tacticsPage,
        perPage,
        search: tacticsSearch || undefined,
        sort: [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
        channel_name: tacticsChannel || undefined,
        campaign_name: campaignName || undefined,
      });
    },
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading && isDetailView && !!tacticsChannel && !!campaignName,
  });

  const handleRowClick = React.useCallback((row: SocialRow) => {
    // Store the row's channel for tactics view (without changing URL state)
    // This preserves the user's selected channel in the sidebar
    if (row.channel_name) {
      setSelectedRowChannel(row.channel_name);
    }
    if (row.campaign_name) {
      setCampaignName(row.campaign_name);
    }
    setTacticsPage(1);
    setTacticsSearch("");
  }, [setCampaignName, setTacticsPage, setTacticsSearch]);

  const onChannelSelect = React.useCallback((channel: string | null) => {
    setChannelName(channel);
    setCampaignName(null);
    setPage(1);
  }, [setChannelName, setCampaignName, setPage]);

  const handleBackToMain = React.useCallback(() => {
    // Clear campaignName and selectedRowChannel to return to main view
    // channelName from URL state is preserved, so user returns to the same channel they were viewing
    setCampaignName(null);
    setSelectedRowChannel(null);
    setTacticsPage(1);
    setTacticsSearch("");
  }, [setCampaignName, setTacticsPage, setTacticsSearch]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (socialError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load social data</p>
        <p className="text-sm text-muted-foreground">
          {socialErrorData instanceof Error
            ? socialErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchSocial()}>Try Again</Button>
      </div>
    );
  }

  if (tacticsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load tactics data</p>
        <p className="text-sm text-muted-foreground">
          {tacticsErrorData instanceof Error
            ? tacticsErrorData.message
            : "An error occurred"}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => refetchTactics()}>Try Again</Button>
          <Button variant="outline" onClick={handleBackToMain}>Back to Main</Button>
        </div>
      </div>
    );
  }

  if (isDetailView) {
    return (
      <div className="relative h-full flex flex-col">
        <TacticsTable
          businessId={businessId}
          data={tacticsData?.data || []}
          pageCount={tacticsData?.pageCount || 0}
          isLoading={tacticsLoading && !tacticsData}
          isFetching={tacticsFetching}
          search={tacticsSearch}
          onSearchChange={setTacticsSearch}
          onBack={handleBackToMain}
          channelName={tacticsChannel || undefined}
        />
      </div>
    );
  }

  const sidebarNode =
    channelsSidebar ||
    (
      <ChannelsSidebar
        selectedChannel={channelName || null}
        onChannelSelect={onChannelSelect}
        channels={channelRows}
      />
    );

  return (
    <div className="relative h-full flex flex-col">
      <SocialTable
        data={socialData?.data || []}
        pageCount={socialData?.pageCount || 0}
        offeringCounts={offeringCounts}
        isLoading={socialLoading && !socialData}
        isFetching={socialFetching}
        search={search}
        onSearchChange={setSearch}
        channelsSidebar={sidebarNode}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
