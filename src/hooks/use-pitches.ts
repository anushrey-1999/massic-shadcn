"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type { BusinessProfile } from "@/store/business-store";

export interface PitchItem {
  business_id: string;
  pitch_type: string;
  url?: string;
  created_at: string;
  business_name?: string;
}

export interface GetPitchesSchema {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: Array<{ field: string; desc: boolean }>;
}

export function usePitches() {
  const platform: ApiPlatform = "python";
  const pitchesApi = useApi<{ pitches: PitchItem[] }>({ platform });

  const fetchPitches = useCallback(
    async (
      params: GetPitchesSchema,
      pitchBusinesses: BusinessProfile[]
    ): Promise<{
      data: PitchItem[];
      pageCount: number;
      pagination?: any;
    }> => {
      try {
        // Get business IDs from pitch businesses
        const pitchBusinessIds = pitchBusinesses.map((b) => b.UniqueId);

        if (pitchBusinessIds.length === 0) {
          return {
            data: [],
            pageCount: 0,
          };
        }

        const response = await pitchesApi.execute("/pitches", {
          method: "POST",
          data: {
            business_ids: pitchBusinessIds,
          },
        });

        // Extract pitches array from response
        const pitches = response?.pitches || [];

        // Transform pitches to include business names
        const transformedPitches = pitches.map((pitch: PitchItem) => {
          const business = pitchBusinesses.find(
            (b) => b.UniqueId === pitch.business_id
          );
          return {
            ...pitch,
            business_name: business?.Name || business?.DisplayName || "Unknown Business",
          };
        });

        // Apply client-side search if needed
        let filteredPitches = transformedPitches;
        if (params.search) {
          const searchLower = params.search.toLowerCase();
          filteredPitches = transformedPitches.filter(
            (pitch: any) =>
              pitch.business_name.toLowerCase().includes(searchLower) ||
              pitch.type.toLowerCase().includes(searchLower)
          );
        }

        // Apply client-side sorting
        if (params.sort && params.sort.length > 0) {
          filteredPitches.sort((a: any, b: any) => {
            for (const sortItem of params.sort!) {
              const field = sortItem.field;
              const aVal = (a as any)[field];
              const bVal = (b as any)[field];

              if (aVal === bVal) continue;

              const comparison = aVal > bVal ? 1 : -1;
              return sortItem.desc ? -comparison : comparison;
            }
            return 0;
          });
        }

        // Apply client-side pagination
        const page = params.page || 1;
        const perPage = params.perPage || 10;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedPitches = filteredPitches.slice(startIndex, endIndex);

        const pageCount = Math.ceil(filteredPitches.length / perPage);

        return {
          data: paginatedPitches,
          pageCount,
          pagination: {
            page,
            page_size: perPage,
            total_count: filteredPitches.length,
            fetched: paginatedPitches.length,
          },
        };
      } catch (error) {
        console.error("Error fetching pitches:", error);
        return {
          data: [],
          pageCount: 0,
        };
      }
    },
    [pitchesApi]
  );

  return {
    fetchPitches,
  };
}
