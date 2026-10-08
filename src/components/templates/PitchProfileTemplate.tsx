"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/molecules/PageHeader";
import { ProfileEditorTemplate } from "@/components/templates/ProfileEditorTemplate";
import { Button } from "@/components/ui/button";
import { LoaderOverlay } from "@/components/ui/loader";
import {
  useBusinessProfileById,
  useUpdateBusinessProfile,
} from "@/hooks/use-business-profiles";
import { useConvertPitchToBusiness } from "@/hooks/use-business-actions";
import {
  useCreateJob,
  useJobByBusinessId,
  useUpdateJob,
} from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import {
  applyFormValues,
  buildBusinessProfilePayload,
  mapProfileDataToFormValues,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import {
  mergeJobAndNodeFormValues,
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
  const updateJob = useUpdateJob();
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
  const {
    isDirty: hasChanges,
    resetBaseline,
  } = useFormDirtyState({ form });

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
    const nodeValues = mapProfileDataToFormValues(
      profileData,
      null,
      locationOptions
    );
    const values = jobQuery.data?.job_id
      ? mergeJobAndNodeFormValues(jobQuery.data, nodeValues)
      : nodeValues;
    applyFormValues(form, values);
    resetBaseline();
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
    resetBaseline,
  ]);

  const save = useCallback(async () => {
    if (!hydrated || !hasChanges) return;
    const values = form.state.values as BusinessInfoFormData;
    if (
      !values.businessName.trim() ||
      !values.website.trim() ||
      !values.primaryLocation.trim() ||
      !values.serviceAreaType
    ) {
      toast.error(
        "Add the business name, website, primary location, and service-area type."
      );
      return;
    }

    try {
      let canonicalJob = jobQuery.data;
      if (jobQuery.data?.job_id) {
        canonicalJob = await updateJob.mutateAsync({
          businessId,
          values,
          locationOptions,
        });
      } else {
        canonicalJob = await createJob.mutateAsync({
          businessId,
          values,
          locationOptions,
        });
      }

      const canonicalValues = canonicalJob
        ? {
            ...mapJobToFormValues(canonicalJob),
            website: values.website,
            primaryLocation: values.primaryLocation,
            serviceAreaType: values.serviceAreaType,
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
      resetBaseline(form.state.values);
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
    hasChanges,
    hydrated,
    jobQuery,
    locationOptions,
    profileData,
    refetchProfile,
    resetBaseline,
    updateJob,
    updateNodeProfile,
  ]);

  const processing =
    createJob.isPending ||
    updateJob.isPending ||
    updateNodeProfile.isPending ||
    jobQuery.data?.profile_status === "processing";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <LoaderOverlay
        isLoading={
          profileDataLoading ||
          jobQuery.isLoading ||
          locationsLoading ||
          !hydrated ||
          processing
        }
        message={
          updateJob.isPending
            ? "Updating profile..."
            : !hydrated
              ? "Loading profile..."
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
          <ProfileEditorTemplate
            form={form}
            mode="minimal"
            leftTitle="Pitch Profile"
            onSaveChanges={() => void save()}
            onSaveAndUpdateStrategy={() => undefined}
            showUnlinkBusiness={false}
            showDefaultActions={false}
            isWorkflowProcessing={processing}
            initialFieldsLocked={Boolean(jobQuery.data?.job_id)}
            customHeaderActions={
              <>
                <Button
                  disabled={processing || !hydrated || !hasChanges}
                  onClick={() => void save()}
                >
                  {processing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  disabled={processing}
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
