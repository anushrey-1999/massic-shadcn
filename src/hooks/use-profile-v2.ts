"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";
import type {
  IndustriesResponse,
  SpecialtiesResponse,
} from "@/types/profile-v2";

const PROFILE_CATALOG_KEY = "profile-catalog";

export function industryCatalogQueryOptions() {
  return queryOptions({
    queryKey: [PROFILE_CATALOG_KEY, "industries"],
    queryFn: async () => {
      const response = await api.get<IndustriesResponse>(
        "/tools/industries",
        "python",
      );
      if (
        !Array.isArray(response.industries) ||
        !response.industries.every((value) => typeof value === "string")
      ) {
        throw new Error(
          "Primary categories could not be loaded. Please try again.",
        );
      }
      return response.industries;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
export function useIndustries(enabled = true) {
  return useQuery({ ...industryCatalogQueryOptions(), enabled });
}
export function useSpecialties(industry?: string | null, enabled = true) {
  const normalizedIndustry = String(industry ?? "").trim();
  const query = normalizedIndustry
    ? `?industry=${encodeURIComponent(normalizedIndustry)}`
    : "";

  return useQuery<string[]>({
    enabled,
    queryKey: [PROFILE_CATALOG_KEY, "specialties", normalizedIndustry || "all"],
    queryFn: async () => {
      const response = await api.get<SpecialtiesResponse>(
        `/tools/specialties${query}`,
        "python",
      );
      return response.specialties;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
