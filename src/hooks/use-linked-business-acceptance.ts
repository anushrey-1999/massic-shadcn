"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { fetchBusinessProfiles } from "@/hooks/use-business-profiles";
import {
  InsufficientGscAccessError,
  type FetchBusinessesResponse,
  type LinkedBusiness,
} from "@/hooks/use-linked-businesses";
import { useAuthStore } from "@/store/auth-store";
import {
  creationOwnerId,
  startLinkedCreationDraft,
} from "@/lib/business-creation-draft";
import { findBusinessDuplicate } from "@/lib/business-domain-match";
import { hasRequiredGscAccess } from "@/utils/gsc-permissions";
import { apiErrorMessage } from "@/lib/api-error";
import type { BusinessProfile } from "@/store/business-store";

/** Accept is a preflight/handoff. Only explicit merge or final Create may write to Main. */
export function useLinkedBusinessAcceptance() {
  const user = useAuthStore((state) => state.user);
  return useMutation({
    retry: false,
    mutationFn: async (row: LinkedBusiness) => {
      const userId = user?.uniqueId || user?.UniqueId || user?.id;
      const ownerId = creationOwnerId(user);
      if (!userId || !ownerId)
        throw new Error("Sign in again before connecting this business.");
      const [businesses, pitches, linked] = await Promise.all([
        fetchBusinessProfiles(userId, false, { strict: true }),
        fetchBusinessProfiles(userId, true, { strict: true }),
        api.get<{
          err?: boolean;
          data?: FetchBusinessesResponse;
          message?: string;
        }>(
          `/fetch-businesses?userUniqueId=${encodeURIComponent(userId)}`,
          "node",
        ),
      ]);
      if (linked.err || !Array.isArray(linked.data?.businesses)) {
        throw new Error(
          apiErrorMessage(
            { response: { data: linked } },
            "Couldn't check existing linked businesses.",
          ),
        );
      }
      const current = linked.data.businesses.find(
        (candidate) =>
          candidate.siteUrl === row.siteUrl && candidate.authId === row.authId,
      );
      if (!current || !hasRequiredGscAccess(current.permissionLevel)) {
        throw new InsufficientGscAccessError();
      }
      const linkedProfiles: BusinessProfile[] = linked.data.businesses.flatMap(
        (candidate) =>
          candidate.businessProfile?.UniqueId
            ? [
                {
                  ...candidate.businessProfile,
                  UniqueId: candidate.businessProfile.UniqueId,
                  Name: candidate.businessProfile.Name ?? candidate.displayName,
                  Website:
                    candidate.businessProfile.Website ?? candidate.siteUrl,
                },
              ]
            : [],
      );
      const existing = findBusinessDuplicate(row.siteUrl, [
        ...businesses.map((business) => ({ ...business, IsPitch: false })),
        ...pitches.map((business) => ({ ...business, IsPitch: true })),
        ...linkedProfiles,
      ]);
      if (existing) return { kind: "merge", business: existing } as const;
      return {
        kind: "create",
        draft: startLinkedCreationDraft(ownerId, row),
      } as const;
    },
  });
}
