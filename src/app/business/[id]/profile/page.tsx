"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { JobResponse } from "@/types/profile-v2";
import { pollProfileUntilTerminal } from "@/utils/profile-v2-api";

import ProfileTemplate from "@/components/templates/ProfileTemplate";
import {
  useBusinessProfileById,
  useUpdateBusinessProfile,
} from "@/hooks/use-business-profiles";
import { useCreateJob, useJobByBusinessId } from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import { useProfilePipeline } from "@/hooks/use-profile-pipeline";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues as mapBusinessProfileToFormValues,
} from "@/utils/profile-form-mappers";
import { mergeJobAndFormForNodeProfile } from "@/utils/profile-v2-mappers";

export default function BusinessProfilePage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const businessId = params?.id as string;
  const { profileData, profileDataLoading, refetchProfile } =
    useBusinessProfileById(businessId || null);
  const jobQuery = useJobByBusinessId(businessId || null);
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const updateNodeProfile = useUpdateBusinessProfile(businessId || null);
  const createJob = useCreateJob();
  const pipeline = useProfilePipeline(locationOptions);
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

  const handleAgentProfileRefresh = async (signal: AbortSignal) => {
    let job = await api.get<JobResponse>(`/jobs/${encodeURIComponent(businessId)}`, "python", { signal });
    if (job.profile_status === "processing") {
      if (!job.profile_id) throw new Error("The updated profile is still being created. Please retry the refresh.");
      await pollProfileUntilTerminal(job.profile_id, "update", { signal });
      job = await api.get<JobResponse>(`/jobs/${encodeURIComponent(businessId)}`, "python", { signal });
    }
    if (signal.aborted) return;
    queryClient.setQueryData(["jobs", "detail", businessId], job);
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
      const result = await pipeline.updateJobAndPoll(businessId, formValues);
      canonicalJob = result.job;
    } else {
      const profileId = String(nodePayload.ProfileId ?? "").trim();
      if (!profileId) {
        throw new Error("Run quick profile before saving this business.");
      }
      canonicalJob = await createJob.mutateAsync({
        businessId,
        profileId,
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
    pipeline.isProcessing;

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
