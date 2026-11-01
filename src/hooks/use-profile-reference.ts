"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { ProfileResponse, ProfileStatus } from "@/types/profile-v2";

export const profileReferenceKeys = {
  business: (businessId: string) => ["profile-reference", businessId] as const,
  detail: (businessId: string, profileId?: string | null) =>
    [...profileReferenceKeys.business(businessId), profileId] as const,
};

export function useProfileReference(
  businessId: string,
  profileId?: string | null,
  profileStatus?: ProfileStatus | null,
) {
  return useQuery({
    queryKey: profileReferenceKeys.detail(businessId, profileId),
    enabled: Boolean(businessId && profileId),
    queryFn: async ({ signal }) => {
      const profile = await api.get<ProfileResponse>(
        `/jobs/profile/${encodeURIComponent(profileId!)}`,
        "python",
        { signal },
      );
      if (
        profile.profile_id !== profileId ||
        (profile.document != null && typeof profile.document !== "string")
      ) {
        throw new Error("The Profile API returned an invalid reference document.");
      }
      return profile;
    },
    retry: false,
    refetchOnMount: "always",
    refetchInterval: (query) =>
      profileStatus === "processing" || query.state.data?.status === "processing"
        ? 5_000
        : false,
  });
}
