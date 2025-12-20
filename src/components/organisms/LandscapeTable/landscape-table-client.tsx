"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/filter-table/index";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLandscape } from "@/hooks/use-landscape";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { getLandscapeTableColumns } from "./landscape-table-columns";
import type { LandscapeRow } from "@/types/landscape-types";

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

  const columns = React.useMemo(
    () => getLandscapeTableColumns(),
    []
  );

  const allData = React.useMemo(() => landscapeData?.data || [], [landscapeData?.data]);

  const { table } = useLocalDataTable({
    data: allData,
    columns,
    initialState: {
      sorting: [],
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
    getRowId: (originalRow: LandscapeRow) => originalRow.url || String(Math.random()),
  });

  // Apply search to the URL column (for client-side filtering)
  const urlColumn = React.useMemo(() => table.getColumn("url"), [table]);
  React.useEffect(() => {
    if (search) {
      urlColumn?.setFilterValue(search);
    } else {
      urlColumn?.setFilterValue(undefined);
    }
  }, [search, urlColumn]);

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <DataTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search URLs and frequencies..."
        />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          table={table}
          isLoading={landscapeLoading && !landscapeData}
          isFetching={false}
          pageSizeOptions={[10, 30, 50, 100, 200]}
          emptyMessage="No landscape data found."
          showPagination={true}
          disableHorizontalScroll={true}
          className="h-full"
        />
      </div>
    </div>
  );
}
