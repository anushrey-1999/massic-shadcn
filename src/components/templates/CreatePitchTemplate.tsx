"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileAutofillReviewTemplate } from "@/components/templates/ProfileAutofillReviewTemplate";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { Button } from "@/components/ui/button";
import { LoaderOverlay } from "@/components/ui/loader";
import {
  updateCreatedBusinessProfileSafely,
  useBusinessProfiles,
  useCreateBusiness,
  usePitchBusinesses,
} from "@/hooks/use-business-profiles";
import { useLocations } from "@/hooks/use-locations";
import { useCreateJob } from "@/hooks/use-jobs";
import { useProfilePipeline } from "@/hooks/use-profile-pipeline";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import {
  applyFormValues,
  buildBusinessProfilePayload,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import {
  mapJobToFormValues,
  mapProfileToFormValues,
} from "@/utils/profile-v2-mappers";
import {
  validateProfileForm,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";
import { cleanWebsiteUrl, normalizeDomainForFavicon } from "@/utils/utils";

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading
  );
  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();
  const pipeline = useProfilePipeline(locationOptions);
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const { pitchBusinesses } = usePitchBusinesses();
  const [hasQuickProfile, setHasQuickProfile] = useState(false);
  const [createdPitch, setCreatedPitch] = useState<BusinessProfile | null>(null);
  const [submissionIssues, setSubmissionIssues] = useState<
    ProfileValidationIssue[]
  >([]);

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: { onChange: businessInfoSchema as never },
  });
  const values = useStore(
    form.store,
    (state: { values: BusinessInfoFormData }) => state.values
  );

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);

  const runQuick = useCallback(async () => {
    const domain = normalizeDomainForFavicon(
      cleanWebsiteUrl(values.website)
    ).toLowerCase();
    const duplicate = pitchBusinesses.find(
      (pitch) =>
        normalizeDomainForFavicon(
          cleanWebsiteUrl(pitch.Website ?? "")
        ).toLowerCase() === domain
    );
    if (duplicate?.UniqueId) {
      toast.error("A pitch already exists for this website.", {
        action: {
          label: "Open",
          onClick: () => router.push(`/pitches/${duplicate.UniqueId}/profile`),
        },
      });
      return;
    }

    try {
      const profile = await pipeline.runQuick(values);
      if (profile.status === "error") {
        toast.error("Quick profile failed. Please try again.");
        return;
      }
      applyFormValues(form, mapProfileToFormValues(profile, values));
      setSubmissionIssues([]);
      setHasQuickProfile(true);
    } catch (error) {
      toast.error("Couldn't build the pitch profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [form, pipeline, pitchBusinesses, router, values]);

  const createPitch = useCallback(async () => {
    const current = form.state.values as BusinessInfoFormData;
    form.validate("submit");
    const issues = validateProfileForm(current);
    setSubmissionIssues(issues);
    if (issues.length > 0) {
      const labels = [...new Set(issues.map((issue) => issue.label))];
      toast.error("Complete the highlighted fields before creating.", {
        description: labels.join(", "),
      });
      return;
    }
    if (!pipeline.quickProfile || pipeline.quickProfile.status === "error") {
      toast.error("Build the quick profile before creating the pitch.");
      return;
    }

    let pitch = createdPitch;
    try {
      if (!pitch?.UniqueId) {
        const result = await createBusiness.mutateAsync({
          website: current.website,
          businessName: current.businessName,
          primaryLocation: current.primaryLocation,
          serveCustomers:
            current.serviceType === "physical"
              ? "local"
              : current.serviceType === "both"
                ? "both"
                : current.serviceType === "online"
                  ? "online"
                  : "",
          offerType: current.offerings || "",
          isPitch: true,
          locationOptions,
        });
        pitch = result.createdBusiness;
        if (!pitch?.UniqueId) {
          throw new Error("The pitch API did not return a business id.");
        }
        setCreatedPitch(pitch);
      }

      const nodePayload = buildBusinessProfilePayload(current, {
        locationOptions,
      });
      nodePayload.ProfileId = pipeline.quickProfile.profile_id;
      await updateCreatedBusinessProfileSafely(
        pitch.UniqueId,
        nodePayload,
        { expectedWebsite: current.website, expectedIsPitch: true }
      );
      const job = await createJob.mutateAsync({
        businessId: pitch.UniqueId,
        profileId: pipeline.quickProfile.profile_id,
        values: current,
        locationOptions,
      });
      const canonicalValues = {
        ...mapJobToFormValues(job),
        website: current.website,
        primaryLocation: current.primaryLocation,
        serviceAreaType: current.serviceAreaType,
      };
      const canonicalNodePayload = buildBusinessProfilePayload(
        canonicalValues,
        {
          existingProfile: pitch,
          locationOptions,
          preserveExistingProfile: true,
        }
      );
      canonicalNodePayload.ProfileId = job.profile_id;
      await updateCreatedBusinessProfileSafely(
        pitch.UniqueId,
        canonicalNodePayload,
        { expectedWebsite: current.website, expectedIsPitch: true }
      );
      await refetchBusinessProfiles();
      router.push(`/pitches/${pitch.UniqueId}/reports`);
    } catch (error) {
      toast.error("Pitch created, but setup is incomplete.", {
        description:
          error instanceof Error ? error.message : "Open Profile to retry.",
      });
      if (pitch?.UniqueId) {
        router.push(`/pitches/${pitch.UniqueId}/profile`);
      }
    }
  }, [
    createBusiness,
    createJob,
    createdPitch,
    form,
    locationOptions,
    pipeline,
    refetchBusinessProfiles,
    router,
  ]);

  const isAutofillDisabled =
    pipeline.isProcessing ||
    locationsLoading ||
    !values.website.trim() ||
    !values.primaryLocation.trim() ||
    !values.serviceAreaType;
  const isProcessing =
    pipeline.isProcessing || createBusiness.isPending || createJob.isPending;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <LoaderOverlay
        isLoading={isProcessing}
        message={
          pipeline.stage === "quick"
            ? "Building quick profile..."
            : createJob.isPending || createBusiness.isPending
              ? "Creating pitch..."
              : undefined
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <PageHeader
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Pitches", href: "/pitches" },
              { label: "Create Pitch" },
            ]}
            showAskMassic={false}
          />
          <div className="flex min-h-0 flex-1 justify-center p-5">
            {!hasQuickProfile ? (
              <ProfileGateCard
                title="Add a business"
                description="We build the profile from the website. Anything the site can't give us, you fill in after."
                className="w-full max-w-[490px] self-center"
              >
                <BusinessInfoForm
                  form={form}
                  embedded
                  embeddedVariant="autofillGate"
                  disableWebsiteLock
                  primaryLocationAction={
                    <Button
                      type="button"
                      className="w-full gap-2"
                      disabled={isAutofillDisabled}
                      onClick={() => void runQuick()}
                    >
                      {pipeline.stage === "quick" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                      Build Profile
                    </Button>
                  }
                />
              </ProfileGateCard>
            ) : (
              <ProfileAutofillReviewTemplate
                form={form}
                leftTitle="Create Pitch"
                onSaveChanges={() => undefined}
                onSaveAndUpdateStrategy={() => undefined}
                showUnlinkBusiness={false}
                showDefaultActions={false}
                profileStatus={pipeline.quickProfile?.status}
                submissionIssues={submissionIssues}
                customHeaderActions={
                  <>
                    <Button variant="outline" onClick={() => router.push("/pitches")}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void createPitch()}
                      disabled={isProcessing}
                    >
                      Create
                    </Button>
                  </>
                }
              />
            )}
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}
