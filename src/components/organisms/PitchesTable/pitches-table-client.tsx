"use client";

import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";

import { PitchesTable } from "./pitches-table";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import type { PitchRow } from "./pitches-table-columns";
import { parseUtcDate } from "@/lib/format";

function toTimestamp(value: unknown): number {
  return parseUtcDate(value)?.getTime() ?? 0;
}

export function PitchesTableClient() {
  const { pitchBusinesses, isLoading } = usePitchBusinesses();
  const [search] = useQueryState("search", parseAsString.withDefault(""));

  const filteredData = React.useMemo<PitchRow[]>(() => {
    const rows: PitchRow[] = pitchBusinesses.map((b) => {
      const createdAt = String(b.CreatedDateTime || "").trim() || null;
      const createdAtTs = toTimestamp(createdAt);

      return {
        id: b.UniqueId,
        business_id: b.UniqueId,
        business: b.Name || b.DisplayName || "Unknown Business",
        website: b.Website || "",
        createdAt,
        createdAtTs,
      };
    });

    if (!search) return rows;

    const lower = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.business.toLowerCase().includes(lower) ||
        r.website.toLowerCase().includes(lower),
    );
  }, [pitchBusinesses, search]);

  return (
    <PitchesTable data={filteredData} isLoading={isLoading} />
  );
}
