"use client";

import React, { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { JobResponse } from "@/types/profile-v2";
import { toast } from "sonner";

import ProfileTemplate from "@/components/templates/ProfileTemplate";
import {
  useBusinessProfileById,
  useUpdateBusinessProfile,
} from "@/hooks/use-business-profiles";
import {
  useCreateJob,
  useJobByBusinessId,
  useUpdateJob,
} from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues as mapBusinessProfileToFormValues,
} from "@/utils/profile-form-mappers";
import { mergeJobAndFormForNodeProfile } from "@/utils/profile-v2-mappers";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";

export default function BusinessProfilePage() {
  const params = useParams();
  const businessId = params?.id as string;
  const autoCreateAttempted = useRef(false);
  const { profileData, profileDataLoading, refetchProfile } =
    useBusinessProfileById(businessId || null);
  const jobQuery = useJobByBusinessId(businessId || null);
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const updateNodeProfile = useUpdateBusinessProfile(businessId || null);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const {
    setLocationOptions,
    setLocationsLoading,
    setCurrentBusinessId,
  } = useBusinessStore();

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
    setCurrentBusinessId(businessId || null);
  }, [
    businessId,
    locationOptions,
    locationsLoading,
    setCurrentBusinessId,
    setLocationOptions,
    setLocationsLoading,
  ]);

  const syncNodeProfile = async (
    canonicalJob: JobResponse | null | undefined,
    formValues: BusinessInfoFormData,
    nodePayload: Record<string, unknown> = {}
  ) => {
    const existingNodeValues = mapBusinessProfileToFormValues(
      profileData ?? null,
      null,
      locationOptions
    );
    const canonicalNodePayload = canonicalJob
      ? buildBusinessProfilePayload(
          mergeJobAndFormForNodeProfile(
            canonicalJob,
            formValues,
            existingNodeValues
          ),
          {
            existingProfile: profileData,
            locationOptions,
            preserveExistingProfile: true,
          }
        )
      : nodePayload;
    canonicalNodePayload.ProfileId =
      canonicalJob?.profile_id ?? (String(nodePayload.ProfileId ?? "") || null);
    await updateNodeProfile.mutateAsync(canonicalNodePayload);
    await Promise.all([refetchProfile(), jobQuery.refetch()]);
  };

  useEffect(() => {
    autoCreateAttempted.current = false;
  }, [businessId]);

  useEffect(() => {
    if (
      autoCreateAttempted.current ||
      !businessId ||
      !profileData ||
      profileDataLoading ||
      locationsLoading ||
      !jobQuery.isFetched ||
      jobQuery.data?.job_id ||
      createJob.isPending
    ) {
      return;
    }

    const values = mapBusinessProfileToFormValues(
      profileData,
      null,
      locationOptions
    );
    values.businessName =
      values.businessName.trim() ||
      deriveBusinessNameFromWebsite(values.website);
    if (
      !values.website.trim() ||
      !values.primaryLocation.trim() ||
      !values.serviceAreaType
    ) {
      return;
    }

    autoCreateAttempted.current = true;
    void createJob
      .mutateAsync({ businessId, values, locationOptions })
      .catch((error) => {
        toast.error("Couldn't create the Infer job automatically.", {
          description:
            error instanceof Error
              ? error.message
              : "Complete the required fields and save the profile.",
        });
      });
  }, [
    businessId,
    createJob,
    jobQuery.data?.job_id,
    jobQuery.isFetched,
    locationOptions,
    locationsLoading,
    profileData,
    profileDataLoading,
  ]);

  const handleAgentProfileRefresh = async (signal: AbortSignal) => {
    if (signal.aborted) return;
    await jobQuery.refetch();
  };

  const handleUpdateProfile = async (
    nodePayload: Record<string, unknown>,
    formValues?: BusinessInfoFormData
  ) => {
    if (!businessId || !formValues) {
      throw new Error("Business profile values are required.");
    }

    let jobExistsAfterSave = Boolean(jobQuery.data?.job_id);
    let canonicalJob = jobQuery.data;
    if (jobExistsAfterSave) {
      canonicalJob = await updateJob.mutateAsync({
        businessId,
        values: formValues,
        locationOptions,
      });
    } else {
      canonicalJob = await createJob.mutateAsync({
        businessId,
        values: formValues,
        locationOptions,
      });
      jobExistsAfterSave = true;
    }

    await syncNodeProfile(canonicalJob, formValues, nodePayload);
    return { jobExistsAfterSave };
  };

  const isLoading =
    profileDataLoading ||
    jobQuery.isLoading ||
    locationsLoading ||
    updateNodeProfile.isPending ||
    createJob.isPending ||
    updateJob.isPending;

  return (
    <ProfileTemplate
      key={businessId}
      businessId={businessId}
      profileData={profileData}
      jobDetails={jobQuery.data}
      isLoading={isLoading}
      onUpdateProfile={handleUpdateProfile}
      onAgentProfileRefresh={handleAgentProfileRefresh}
    />
  );
}
