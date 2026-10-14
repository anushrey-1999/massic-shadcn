"use client";

import { useCallback } from "react";

import {
  updateCreatedBusinessProfileSafely,
  useCreateBusiness,
} from "@/hooks/use-business-profiles";
import { useCreateJob } from "@/hooks/use-jobs";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type { BusinessProfile } from "@/store/business-store";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import {
  buildBusinessProfilePayload,
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
      { cause }
    );
    this.name = "IncompleteBusinessCreationError";
    this.business = business;
  }
}

export function useManualBusinessCreation({
  isPitch,
  locationOptions,
}: {
  isPitch: boolean;
  locationOptions: LocationOption[];
}) {
  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();

  const create = useCallback(
    async (input: BusinessInfoFormData) => {
      const values: BusinessInfoFormData = {
        ...input,
        businessName:
          input.businessName.trim() ||
          deriveBusinessNameFromWebsite(input.website),
      };
      let business: BusinessProfile | null = null;

      try {
        const result = await createBusiness.mutateAsync({
          website: values.website,
          businessName: values.businessName,
          primaryLocation: values.primaryLocation,
          serveCustomers: "",
          offerType: "",
          isPitch,
          locationOptions,
          suppressErrorToast: true,
        });
        business = result.createdBusiness;
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
        await updateCreatedBusinessProfileSafely(
          business.UniqueId,
          nodePayload,
          { expectedWebsite: values.website, expectedIsPitch: isPitch }
        );

        const job = await createJob.mutateAsync({
          businessId: business.UniqueId,
          values,
          locationOptions,
        });

        return { business, job, values };
      } catch (error) {
        if (business?.UniqueId) {
          throw new IncompleteBusinessCreationError(business, error);
        }
        throw error;
      }
    },
    [
      createBusiness,
      createJob,
      isPitch,
      locationOptions,
    ]
  );

  return {
    create,
    isPending: createBusiness.isPending || createJob.isPending,
  };
}
