"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";
import type {
  IndustriesResponse,
  ProfileResponse,
  SpecialtiesResponse,
  TriggerQuickProfileRequest,
} from "@/types/profile-v2";
import {
  pollProfileUntilTerminal,
  runDeepProfile,
  runQuickProfile,
} from "@/utils/profile-v2-api";

const PROFILE_V2_KEY = "profile-v2";
const PROFILE_CATALOG_KEY = "profile-catalog";

export function useIndustries() {
  return useQuery<string[]>({
    queryKey: [PROFILE_CATALOG_KEY, "industries"],
    queryFn: async () => {
      const response = await api.get<IndustriesResponse>(
        "/tools/industries",
        "python"
      );
      return response.industries;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useSpecialties(industry?: string | null) {
  const normalizedIndustry = String(industry ?? "").trim();
  const query = normalizedIndustry
    ? `?industry=${encodeURIComponent(normalizedIndustry)}`
    : "";

  return useQuery<string[]>({
    queryKey: [
      PROFILE_CATALOG_KEY,
      "specialties",
      normalizedIndustry || "all",
    ],
    queryFn: async () => {
      const response = await api.get<SpecialtiesResponse>(
        `/tools/specialties${query}`,
        "python"
      );
      return response.specialties;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useRunQuickProfile() {
  return useMutation<
    ProfileResponse,
    Error,
    Omit<TriggerQuickProfileRequest, "mode">
  >({
    mutationKey: [PROFILE_V2_KEY, "quick"],
    mutationFn: (request) => runQuickProfile(request),
    retry: false,
  });
}

export function useRunDeepProfile() {
  return useMutation<ProfileResponse, Error, string>({
    mutationKey: [PROFILE_V2_KEY, "deep"],
    mutationFn: (businessId) => runDeepProfile(businessId),
    retry: false,
  });
}

export function usePollProfile() {
  return useMutation<
    ProfileResponse,
    Error,
    { profileId: string; phase: "update" | "deep" | "quick" }
  >({
    mutationKey: [PROFILE_V2_KEY, "poll"],
    mutationFn: ({ profileId, phase }) =>
      pollProfileUntilTerminal(profileId, phase),
    retry: false,
  });
}

