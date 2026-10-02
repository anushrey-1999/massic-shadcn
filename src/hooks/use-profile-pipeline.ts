"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";
import { useUpdateJob } from "@/hooks/use-jobs";
import { usePollProfile, useRunQuickProfile } from "@/hooks/use-profile-v2";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type { JobResponse, ProfileResponse } from "@/types/profile-v2";
import {
  formatPrimaryLocationApiValue,
  normalizeProfileCountry,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";

export type ProfilePipelineStage =
  "idle" | "quick" | "updating" | "complete" | "error";

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface PipelineFailure {
  stage: ProfilePipelineStage;
  message: string;
}

export function useProfilePipeline(locationOptions: LocationOption[] = []) {
  const queryClient = useQueryClient();
  const quickMutation = useRunQuickProfile();
  const pollMutation = usePollProfile();
  const updateJobMutation = useUpdateJob();
  const [stage, setStage] = useState<ProfilePipelineStage>("idle");
  const [failure, setFailure] = useState<PipelineFailure | null>(null);
  const [quickProfile, setQuickProfile] = useState<ProfileResponse | null>(
    null,
  );
  const [latestProfile, setLatestProfile] = useState<ProfileResponse | null>(
    null,
  );
  const operationInFlightRef = useRef(false);

  const runQuick = useCallback(
    async (values: BusinessInfoFormData): Promise<ProfileResponse> => {
      if (stage !== "idle" && stage !== "error" && stage !== "complete") {
        throw new Error("Profile setup is already in progress.");
      }
      if (operationInFlightRef.current) {
        throw new Error("Profile setup is already in progress.");
      }
      operationInFlightRef.current = true;
      setStage("quick");
      setFailure(null);
      const primaryLocation = parsePrimaryLocationForPayload(
        values.primaryLocation,
        locationOptions,
      );

      try {
        const profile = await quickMutation.mutateAsync({
          business_url: values.website,
          country: normalizeProfileCountry(primaryLocation.Country),
          location: formatPrimaryLocationApiValue(primaryLocation),
          service_area_type:
            (values.serviceAreaType as
              "international" | "national" | "state_regional" | "city_local") ||
            "city_local",
        });
        setQuickProfile(profile);
        setLatestProfile(profile);
        setStage(profile.status === "error" ? "error" : "idle");
        if (profile.status === "error") {
          setFailure({
            stage: "quick",
            message: "We couldn't build the quick profile. Please try again.",
          });
        }
        return profile;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Quick profiling failed.";
        setFailure({ stage: "quick", message });
        setStage("error");
        throw error;
      } finally {
        operationInFlightRef.current = false;
      }
    },
    [locationOptions, quickMutation, stage],
  );

  const updateJobAndPoll = useCallback(
    async (
      businessId: string,
      values: BusinessInfoFormData,
    ): Promise<{ job: JobResponse; profile: ProfileResponse | null }> => {
      if (operationInFlightRef.current) {
        throw new Error("Profile setup is already in progress.");
      }
      operationInFlightRef.current = true;
      setFailure(null);
      setStage("updating");
      try {
        const updateResponse = await updateJobMutation.mutateAsync({
          businessId,
          values,
          locationOptions,
        });
        let profile: ProfileResponse | null = null;
        if (
          updateResponse.profile_id &&
          updateResponse.profile_status === "processing"
        ) {
          profile = await pollMutation.mutateAsync({
            profileId: updateResponse.profile_id,
            phase: "update",
          });
          setLatestProfile(profile);
        }

        const job = await api.get<JobResponse>(
          `/jobs/${encodeURIComponent(businessId)}`,
          "python",
        );
        queryClient.setQueryData(["jobs", "detail", businessId], job);

        if (profile?.status === "error") {
          setFailure({
            stage: "updating",
            message:
              "The profile update could not be processed. Your previous profile is still available.",
          });
          setStage("error");
        } else {
          setStage("complete");
        }
        return { job, profile };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Profile update failed.";
        setFailure({ stage: "updating", message });
        setStage("error");
        throw error;
      } finally {
        operationInFlightRef.current = false;
      }
    },
    [locationOptions, pollMutation, queryClient, updateJobMutation],
  );

  const isProcessing = useMemo(
    () => stage === "quick" || stage === "updating",
    [stage],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setFailure(null);
    setQuickProfile(null);
    setLatestProfile(null);
  }, []);

  return {
    stage,
    failure,
    quickProfile,
    latestProfile,
    isProcessing,
    runQuick,
    updateJobAndPoll,
    reset,
  };
}
