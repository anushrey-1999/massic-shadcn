"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { AudienceTable } from "./audience-table";
import { AudienceSplitView } from "./audience-split-view";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAudience } from "@/hooks/use-audience";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import type { AudienceMetrics, AudienceRow, AudienceUseCaseRow } from "@/types/audience-types";
import type { ExtendedColumnFilter } from "@/types/data-table-types";

interface AudienceTableClientProps {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
  onMetricsChange?: (metrics: AudienceMetrics | null) => void;
}

export function AudienceTableClient({
  businessId,
  onSplitViewChange,
  onMetricsChange,
}: AudienceTableClientProps) {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = React.useState<string | null>(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = React.useState<string | null>(null);
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
    parseAsJson<ExtendedColumnFilter<AudienceRow>[]>((value) => {
      if (Array.isArray(value)) {
        return value as ExtendedColumnFilter<AudienceRow>[];
      }
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState("joinOperator", parseAsString.withDefault("and"));

  React.useEffect(() => {
    if (search && page !== 1) {
      setPage(1);
    }
  }, [search, page, setPage]);

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const offerings = React.useMemo(() => {
    if (!jobDetails || !jobDetails.offerings) return [];
    return jobDetails.offerings
      .map((o) => o.name || o.offering)
      .filter(Boolean) as string[];
  }, [jobDetails]);

  const offeringCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    offerings.forEach((offering) => {
      counts[offering] = 0;
    });
    return counts;
  }, [offerings]);

  const { fetchAudience, fetchAudienceCounts } = useAudience(businessId);
  const queryClient = useQueryClient();

  const queryKey = React.useMemo(
    () => [
      "audience",
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
    data: audienceData,
    isLoading: audienceLoading,
    isFetching: audienceFetching,
    isError: audienceError,
    error: audienceErrorData,
    refetch: refetchAudience,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchAudience({
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
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  React.useEffect(() => {
    onMetricsChange?.(audienceData?.metrics ?? null);
  }, [onMetricsChange, audienceData?.metrics]);

  React.useEffect(() => {
    if (!jobExists || !audienceData || !audienceData.pageCount) return;

    const pageCount = audienceData.pageCount;
    if (pageCount <= 1) return;

    const prefetchPages = async () => {
      if (page > 1) {
        const prevPage = page - 1;
        const prevQueryKey = [
          "audience",
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
              return fetchAudience({
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
          "audience",
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
            return fetchAudience({
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
  }, [audienceData, page, perPage, search, sort, filters, joinOperator, businessId, queryClient, fetchAudience, jobExists]);

  const {
    data: countsData,
    isError: countsError,
    error: countsErrorData,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["audience-counts", businessId],
    queryFn: async () => {
      return fetchAudienceCounts();
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

  if (audienceError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load audience data</p>
        <p className="text-sm text-muted-foreground">
          {audienceErrorData instanceof Error
            ? audienceErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchAudience()}>Try Again</Button>
      </div>
    );
  }

  const handleRowClick = React.useCallback((row: AudienceRow) => {
    setSelectedPersonaId(row.id);
    setIsSplitView(true);
    onSplitViewChange?.(true);
  }, [onSplitViewChange]);

  const handleBackToMain = React.useCallback(() => {
    setIsSplitView(false);
    setSelectedPersonaId(null);
    setSelectedUseCaseId(null);
    onSplitViewChange?.(false);
  }, [onSplitViewChange]);

  const handleUseCaseSelect = React.useCallback((useCaseId: string | null) => {
    setSelectedUseCaseId(useCaseId);
  }, []);

  const selectedPersona = React.useMemo(() => {
    if (!selectedPersonaId || !audienceData?.data) return null;
    return audienceData.data.find(row => row.id === selectedPersonaId) || null;
  }, [selectedPersonaId, audienceData?.data]);

  const useCasesData = React.useMemo((): AudienceUseCaseRow[] => {
    if (!selectedPersona) return [];

    const useCases = selectedPersona.use_cases || [];
    if (!Array.isArray(useCases) || useCases.length === 0) return [];

    return useCases.map((uc: any, index: number) => {
      const useCaseName = uc?.use_case_name || "";
      const keywords = Array.isArray(uc?.supporting_keywords)
        ? uc.supporting_keywords.filter((k: any) => k && typeof k === 'string')
        : [];

      return {
        id: `${selectedPersonaId}_${useCaseName}_${index}`,
        use_case_name: useCaseName,
        persona_name: selectedPersona.persona_name,
        supporting_keywords: keywords,
      };
    });
  }, [selectedPersona, selectedPersonaId]);

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <AudienceSplitView
          leftTableData={audienceData?.data || []}
          useCasesData={useCasesData}
          selectedPersonaId={selectedPersonaId}
          selectedUseCaseId={selectedUseCaseId}
          onPersonaSelect={setSelectedPersonaId}
          onUseCaseSelect={handleUseCaseSelect}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
          pageCount={audienceData?.pageCount || 0}
          arsRange={countsData?.arsRange || { min: 0, max: 1 }}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <AudienceTable
        data={audienceData?.data || []}
        pageCount={audienceData?.pageCount || 0}
        personaCounts={countsData?.personaCounts || {}}
        arsRange={countsData?.arsRange || { min: 0, max: 1 }}
        useCaseCounts={countsData?.useCaseCounts || {}}
        offeringCounts={offeringCounts}
        isLoading={audienceLoading && !audienceData}
        isFetching={audienceFetching}
        search={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
