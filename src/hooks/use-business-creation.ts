"use client";

import { useCallback, useRef, useState } from "react";

import {
  updateCreatedBusinessProfileSafely,
  useCreateBusiness,
  fetchBusinessProfiles,
  assertSafeCreatedBusinessTarget,
} from "@/hooks/use-business-profiles";
import { useCreateJob } from "@/hooks/use-jobs";
import { useAuthStore } from "@/store/auth-store";
import type { BusinessConnection } from "@/lib/business-connections";
import {
  emptyCreationProgress,
  resumableBusiness,
  type CreationProgress,
} from "@/lib/business-creation-draft";
import { businessDomain } from "@/lib/business-domain-match";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type { BusinessProfile } from "@/store/business-store";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import {
  buildBusinessProfilePayload,
  selectCombinedBusinessPayload,
} from "@/utils/profile-form-mappers";

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export class IncompleteBusinessCreationError extends Error {
  readonly business: BusinessProfile;

  constructor(business: BusinessProfile, cause: unknown) {
    super(
      cause instanceof Error
        ? cause.message
        : "The business was created, but setup is incomplete.",
      { cause },
    );
    this.name = "IncompleteBusinessCreationError";
    this.business = business;
  }
}

export function useBusinessCreation({
  isPitch,
  locationOptions,
  connection,
  initialProgress,
  onProgress,
}: {
  isPitch: boolean;
  locationOptions: LocationOption[];
  connection?: BusinessConnection;
  initialProgress?: CreationProgress;
  onProgress?: (progress: CreationProgress) => void;
}) {
  const progress = useRef(initialProgress ?? emptyCreationProgress());
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const user = useAuthStore((state) => state.user);
  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();

  const create = useCallback(
    async (input: BusinessInfoFormData) => {
      if (inFlight.current)
        throw new Error("Business setup is already in progress.");
      inFlight.current = true;
      setPending(true);
      const checkpoint = (patch: Partial<CreationProgress>) => {
        progress.current = { ...progress.current, ...patch };
        onProgress?.(progress.current);
      };
      const values: BusinessInfoFormData = {
        ...input,
        businessName:
          input.businessName.trim() ||
          deriveBusinessNameFromWebsite(input.website),
      };
      let business: BusinessProfile | null = progress.current.business;

      try {
        if (business) {
          await assertSafeCreatedBusinessTarget(business.UniqueId, {
            expectedWebsite: values.website,
            expectedIsPitch: isPitch,
            expectedLinkedAuthId: connection?.authId,
            preExistingIds: new Set(progress.current.preExistingIds),
          });
        }
        if (!business && progress.current.createAttempted) {
          // A request with an uncertain outcome must never be blindly replayed.
          const userId = user?.uniqueId || user?.UniqueId || user?.id;
          const candidates = await fetchBusinessProfiles(userId, isPitch, {
            strict: true,
          });
          const matches = candidates.filter(
            (candidate) =>
              !progress.current.preExistingIds.includes(candidate.UniqueId) &&
              businessDomain(candidate.Website) ===
                businessDomain(connection?.siteUrl ?? values.website) &&
              (connection
                ? candidate.LinkedAuthId === connection.authId
                : !candidate.LinkedAuthId),
          );
          if (matches.length !== 1) {
            throw new Error(
              "The previous creation request could not be confirmed. Check your businesses in Settings before trying again; no new business was created by this retry.",
            );
          }
          await assertSafeCreatedBusinessTarget(matches[0].UniqueId, {
            expectedWebsite: values.website,
            expectedIsPitch: isPitch,
            expectedLinkedAuthId: connection?.authId,
            preExistingIds: new Set(progress.current.preExistingIds),
          });
          business = matches[0];
          checkpoint({ business: resumableBusiness(business) });
        }
        if (!business) {
          const result = await createBusiness.mutateAsync({
            website: values.website,
            businessName: values.businessName,
            primaryLocation: values.primaryLocation,
            serveCustomers: "",
            offerType: "",
            isPitch,
            locationOptions,
            suppressErrorToast: true,
            suppressSuccessToast: true,
            connection,
            onBeforeCreate: (preExistingIds) => {
              const previous = progress.current;
              try {
                checkpoint({ createAttempted: true, preExistingIds });
              } catch (error) {
                // No POST has started if persisting its checkpoint failed.
                progress.current = previous;
                throw error;
              }
            },
            onCreateRejected: () => checkpoint({ createAttempted: false }),
            onCreated: (created) => {
              business = created;
              checkpoint({ business: resumableBusiness(created) });
            },
          });
          business = result.createdBusiness;
        }
        if (!business?.UniqueId) {
          throw new Error("The create API did not return a business id.");
        }

        const nodePayload = buildBusinessProfilePayload(values, {
          existingProfile: business,
          locationOptions,
          normalizeWebsite: true,
          ctasMode: "wrapped-json",
          preserveExistingProfile: true,
        });
        const identity = JSON.stringify([
          values.businessName,
          values.website,
          values.primaryLocation,
          values.serviceAreaType,
        ]);
        if (
          !progress.current.profileSaved ||
          progress.current.savedIdentity !== identity
        ) {
          const payload = selectCombinedBusinessPayload(nodePayload);
          // Main's GSC identity is the raw selected property, not the normalized Infer URL.
          if (connection) delete payload.Website;
          await updateCreatedBusinessProfileSafely(business.UniqueId, payload, {
            expectedWebsite: values.website,
            expectedIsPitch: isPitch,
            expectedLinkedAuthId: connection?.authId,
          });
          checkpoint({ profileSaved: true, savedIdentity: identity });
        }

        // Reuse a job that survived a failed response/refresh. In particular,
        // never PUT empty form offerings over an extractor's canonical values.
        const job = await createJob.mutateAsync({
          businessId: business.UniqueId,
          values,
          locationOptions,
          preserveExistingFields: true,
        });
        checkpoint({ jobCreated: true });

        return { business, job, values };
      } catch (error) {
        if (business?.UniqueId) {
          throw new IncompleteBusinessCreationError(business, error);
        }
        throw error;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [
      createBusiness,
      createJob,
      isPitch,
      locationOptions,
      connection,
      onProgress,
      user,
    ],
  );

  return {
    create,
    isPending: pending,
    hasCreatedBusiness: Boolean(progress.current.business),
    createdBusinessId: progress.current.business?.UniqueId,
  };
}
