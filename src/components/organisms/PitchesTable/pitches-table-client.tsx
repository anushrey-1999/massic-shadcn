"use client";

import * as React from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { PitchesTable } from "./pitches-table";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import type { PitchRow } from "./pitches-table-columns";

export function PitchesTableClient() {
  const { pitchBusinesses, isLoading } = usePitchBusinesses();

  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search] = useQueryState("search", parseAsString.withDefault(""));

  const filteredData = React.useMemo<PitchRow[]>(() => {
    let rows: PitchRow[] = pitchBusinesses.map((b) => ({
      id: b.UniqueId,
      business_id: b.UniqueId,
      business: b.Name || b.DisplayName || "Unknown Business",
      website: b.Website || "",
    }));

    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.business.toLowerCase().includes(lower) ||
          r.website.toLowerCase().includes(lower)
      );
    }

    return rows;
  }, [pitchBusinesses, search]);

  const pageCount = Math.ceil(filteredData.length / limit) || 1;

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredData.slice(start, start + limit);
  }, [filteredData, page, limit]);

  return (
    <PitchesTable
      data={paginatedData}
      pageCount={pageCount}
      isLoading={isLoading}
    />
  );
}
