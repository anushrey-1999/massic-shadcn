"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { PitchesTable } from "./pitches-table";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import { api } from "@/hooks/use-api";
import type { PitchRow } from "./pitches-table-columns";

function parsePitchTimestamp(value: unknown): number {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) return native.getTime();

  const match = raw.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (!match) return 0;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const ampm = String(match[6]).toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function PitchesTableClient() {
  const { pitchBusinesses, isLoading } = usePitchBusinesses();

  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search] = useQueryState("search", parseAsString.withDefault(""));

  const businessIds = React.useMemo(
    () => pitchBusinesses.map((business) => business.UniqueId),
    [pitchBusinesses],
  );

  const pitchesQuery = useQuery({
    queryKey: ["pitches", "bulk", businessIds],
    queryFn: async () => {
      if (businessIds.length === 0) return [];

      const response = await api.post<{ pitches?: Array<Record<string, unknown>> }>(
        "/actions/pitches/bulk",
        "python",
        { business_ids: businessIds },
      );

      return Array.isArray(response?.pitches) ? response.pitches : [];
    },
    enabled: businessIds.length > 0,
    staleTime: 0,
    retry: false,
  });

  const latestActivityByBusiness = React.useMemo(() => {
    const activity = new Map<string, number>();

    for (const pitch of pitchesQuery.data ?? []) {
      const businessId = String(pitch?.business_id || "").trim();
      if (!businessId) continue;

      const timestamp = parsePitchTimestamp(
        pitch?.updated_at ?? pitch?.created_at,
      );
      if (!timestamp) continue;

      activity.set(
        businessId,
        Math.max(activity.get(businessId) ?? 0, timestamp),
      );
    }

    return activity;
  }, [pitchesQuery.data]);

  const businessOrder = React.useMemo(() => {
    const order = new Map<string, number>();
    pitchBusinesses.forEach((business, index) => {
      order.set(business.UniqueId, index);
    });
    return order;
  }, [pitchBusinesses]);

  const filteredData = React.useMemo<PitchRow[]>(() => {
    let rows: PitchRow[] = pitchBusinesses.map((b) => ({
      id: b.UniqueId,
      business_id: b.UniqueId,
      business: b.Name || b.DisplayName || "Unknown Business",
      website: b.Website || "",
    }));

    rows.sort((a, b) => {
      const aTimestamp = latestActivityByBusiness.get(a.business_id) ?? 0;
      const bTimestamp = latestActivityByBusiness.get(b.business_id) ?? 0;
      if (bTimestamp !== aTimestamp) return bTimestamp - aTimestamp;

      const aOrder = businessOrder.get(a.business_id) ?? 0;
      const bOrder = businessOrder.get(b.business_id) ?? 0;
      return aOrder - bOrder;
    });

    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.business.toLowerCase().includes(lower) ||
          r.website.toLowerCase().includes(lower)
      );
    }

    return rows;
  }, [pitchBusinesses, search, latestActivityByBusiness, businessOrder]);

  const pageCount = Math.ceil(filteredData.length / limit) || 1;

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredData.slice(start, start + limit);
  }, [filteredData, page, limit]);

  return (
    <PitchesTable
      data={paginatedData}
      pageCount={pageCount}
      isLoading={isLoading || pitchesQuery.isLoading}
    />
  );
}
