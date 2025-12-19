"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LandscapeTable } from "./landscape-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLandscape } from "@/hooks/use-landscape";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { DataTableSearch } from "@/components/filter-table/data-table-search";

interface LandscapeTableClientProps {
  businessId: string;
}

export function LandscapeTableClient({ businessId }: LandscapeTableClientProps) {
  const [search, setSearch] = React.useState("");
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const { fetchLandscape } = useLandscape(businessId);

  const queryKey = React.useMemo(
    () => ["landscape", businessId],
    [businessId]
  );

  const {
    data: landscapeData,
    isLoading: landscapeLoading,
    isError: landscapeError,
    error: landscapeErrorData,
    refetch: refetchLandscape,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchLandscape();
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && !!jobExists && !jobLoading,
  });

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    );
  }

  if (landscapeError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load landscape data</p>
        <p className="text-sm text-muted-foreground">
          {landscapeErrorData instanceof Error
            ? landscapeErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchLandscape()}>Try Again</Button>
      </div>
    );
  }

  // Client-side filtering
  const filteredData = React.useMemo(() => {
    const allData = landscapeData?.data || [];
    if (!search.trim()) return allData;
    
    const searchLower = search.toLowerCase().trim();
    return allData.filter((row) => {
      const urlMatch = row.url?.toLowerCase().includes(searchLower);
      const frequencyMatch = row.frequency?.toString().includes(searchLower);
      return urlMatch || frequencyMatch;
    });
  }, [landscapeData?.data, search]);

  return (
    <div className="relative h-full flex flex-col">
      <div className="shrink-0 mb-4">
        <DataTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search URLs and frequencies..."
          debounceMs={300}
        />
      </div>
      <div className="flex-1 min-h-0">
        <LandscapeTable
          data={filteredData}
          isLoading={landscapeLoading && !landscapeData}
        />
      </div>
    </div>
  );
}
