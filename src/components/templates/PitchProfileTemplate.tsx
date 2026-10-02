"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/molecules/PageHeader";
import { ProfileAutofillReviewTemplate } from "@/components/templates/ProfileAutofillReviewTemplate";
import { Button } from "@/components/ui/button";
import { LoaderOverlay } from "@/components/ui/loader";
import {
  useBusinessProfileById,
  useUpdateBusinessProfile,
} from "@/hooks/use-business-profiles";
import { useConvertPitchToBusiness } from "@/hooks/use-business-actions";
import { useCreateJob, useJobByBusinessId } from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { useProfilePipeline } from "@/hooks/use-profile-pipeline";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import {
  isJobIncomplete,
  mapJobToFormValues,
} from "@/utils/profile-v2-mappers";

export function PitchProfileTemplate() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const { profileData, profileDataLoading, refetchProfile } =
    useBusinessProfileById(businessId || null);
  const updateNodeProfile = useUpdateBusinessProfile(businessId || null);
  const jobQuery = useJobByBusinessId(businessId || null);
  const createJob = useCreateJob();
  const pipeline = useProfilePipeline(locationOptions);
  const convertPitch = useConvertPitchToBusiness();
  const guardConvertPitch = useFeatureActionGuard("business.convertPitch");
  const [hydrated, setHydrated] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const {
    setLocationOptions,
    setLocationsLoading,
  } = useBusinessStore();

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: { onChange: businessInfoSchema as never },
  });

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);

  useEffect(() => {
    if (
      hydrated ||
      profileDataLoading ||
      locationsLoading ||
      !jobQuery.isFetched ||
      !profileData
    ) {
      return;
    }
    const nodeValues = mapProfileDataToFormValues(profileData, null, locationOptions);
    const values = jobQuery.data?.job_id
      ? { ...mapJobToFormValues(jobQuery.data), calendarEvents: nodeValues.calendarEvents }
      : nodeValues;
    Object.entries(values).forEach(([key, value]) => {
      form.setFieldValue(key as never, value as never);
    });
    setHydrated(true);
  }, [
    form,
    hydrated,
    jobQuery.data,
    jobQuery.isFetched,
    locationOptions,
    locationsLoading,
    profileData,
    profileDataLoading,
  ]);

  const save = useCallback(async () => {
    if (!jobQuery.isFetched || jobQuery.isError) {
      toast.error("Wait for the pitch profile to load before saving.");
      return;
    }
    const values = form.state.values as BusinessInfoFormData;
    const hasOffering = values.offeringsList?.some((offering) =>
      Boolean(offering.name?.trim())
    );
    if (!values.businessName.trim() || !hasOffering) {
      toast.error("Add a business name and at least one offering.");
      return;
    }

    try {
      let canonicalJob = jobQuery.data;
      if (jobQuery.data?.job_id) {
        const result = await pipeline.updateJobAndPoll(businessId, values);
        canonicalJob = result.job;
      } else {
        const profileId = String((profileData as any)?.ProfileId ?? "").trim();
        if (!profileId) {
          toast.error("This pitch needs a quick profile before it can be saved.");
          return;
        }
        await createJob.mutateAsync({
          businessId,
          profileId,
          values,
          locationOptions,
        });
        const refreshedJob = await jobQuery.refetch();
        canonicalJob = refreshedJob.data;
      }

      const canonicalValues = canonicalJob
        ? {
            ...mapJobToFormValues(canonicalJob),
            website: values.website,
            primaryLocation: values.primaryLocation,
            serviceAreaType: values.serviceAreaType,
            calendarEvents: values.calendarEvents,
          }
        : values;
      const nodePayload = buildBusinessProfilePayload(canonicalValues, {
        existingProfile: profileData,
        locationOptions,
        preserveExistingProfile: true,
      });
      nodePayload.ProfileId =
        canonicalJob?.profile_id ??
        (String((profileData as any)?.ProfileId ?? "") || null);
      await updateNodeProfile.mutateAsync(nodePayload);
      await Promise.all([jobQuery.refetch(), refetchProfile()]);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Couldn't save pitch profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [
    businessId,
    createJob,
    form,
    jobQuery,
    locationOptions,
    pipeline,
    profileData,
    refetchProfile,
    updateNodeProfile,
  ]);

  const processing =
    pipeline.isProcessing ||
    createJob.isPending ||
    updateNodeProfile.isPending ||
    jobQuery.data?.profile_status === "processing";
  const incomplete =
    Boolean(jobQuery.data?.job_id) && isJobIncomplete(jobQuery.data);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <LoaderOverlay
        isLoading={profileDataLoading || jobQuery.isLoading || processing}
        message={
          pipeline.stage === "updating"
            ? "Updating profile..."
            : undefined
        }
      >
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Pitches", href: "/pitches" },
            { label: profileData?.Name || "Business" },
            { label: "Profile" },
          ]}
          showAskMassic={false}
        />
        <div className="flex min-h-0 flex-1 p-5">
          <ProfileAutofillReviewTemplate
            form={form}
            leftTitle="Pitch Profile"
            onSaveChanges={() => void save()}
            onSaveAndUpdateStrategy={() => undefined}
            showUnlinkBusiness={false}
            showDefaultActions={false}
            isWorkflowProcessing={processing}
            initialFieldsLocked={Boolean(jobQuery.data?.job_id)}
            profileStatus={jobQuery.data?.profile_status}
            customHeaderActions={
              <>
                <Button disabled={processing} onClick={() => void save()}>
                  {processing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  disabled={processing || incomplete}
                  onClick={() => {
                    if (guardConvertPitch()) setConvertOpen(true);
                  }}
                >
                  Convert to Business
                </Button>
              </>
            }
          />
        </div>
      </LoaderOverlay>

      {convertOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-medium">Convert to Business?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This pitch will be moved to Businesses.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={convertPitch.isPending}
                onClick={() =>
                  void convertPitch
                    .mutateAsync({ businessId })
                    .then(() => router.push(`/business/${businessId}/profile`))
                }
              >
                {convertPitch.isPending ? "Converting..." : "Convert"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
