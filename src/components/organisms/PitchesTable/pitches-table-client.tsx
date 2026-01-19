"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";

import { PitchesTable } from "./pitches-table";
import { usePitches } from "@/hooks/use-pitches";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import type { PitchRow } from "./pitches-table-columns";

export function PitchesTableClient() {
  const { pitchBusinesses, isLoading: loadingPitchBusinesses } = usePitchBusinesses();
  const { fetchPitches } = usePitches();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(10)
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) return value;
      return [];
    }).withDefault([])
  );

  const {
    data: pitchesData,
    isLoading: loadingPitches,
    error,
  } = useQuery({
    queryKey: ["pitches", pitchBusinesses.map(p => p.UniqueId).join(','), page, limit, search, sort],
    queryFn: async () => {
      if (pitchBusinesses.length === 0) {
        return { data: [], pageCount: 0 };
      }

      return fetchPitches(
        {
          page,
          perPage: limit,
          search: search || undefined,
          sort: sort.length > 0 ? sort : undefined,
        },
        pitchBusinesses
      );
    },
    enabled: pitchBusinesses.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: (query) => {
      const data = (query.state.data as any)?.data as Array<{ status?: string }> | undefined;
      if (!Array.isArray(data) || data.length === 0) return false;
      const shouldPoll = data.some((row) => {
        const status = String(row?.status || "").trim().toLowerCase();
        return status === "pending" || status === "processing" || status === "in_progress";
      });
      return shouldPoll ? 10_000 : false;
    },
  });

  const transformedData = React.useMemo<PitchRow[]>(() => {
    if (!pitchesData?.data) return [];

    return pitchesData.data.map((pitch: any) => ({
      id: `${pitch.business_id}-${pitch.pitch_type}-${pitch.created_at}`,
      business_id: pitch.business_id,
      business: pitch.business_name || "Unknown Business",
      type: pitch.pitch_type || "Unknown",
      status: pitch.status || "N/A",
      dateTime: pitch.created_at || "N/A",
    }));
  }, [pitchesData?.data]);

  const isLoading = loadingPitchBusinesses || loadingPitches;

  return (
    <PitchesTable
      data={transformedData}
      pageCount={pitchesData?.pageCount || 0}
      isLoading={isLoading}
    />
  );
}
