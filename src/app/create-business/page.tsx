"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DuplicateBusinessConflictDialog } from "@/components/create-business/DuplicateBusinessConflictDialog";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import {
  ProfileActionConfirmDialog,
  type ProfileConfirmAction,
} from "@/components/organisms/profile/ProfileActionConfirmDialog";
import {
  useConvertPitchToBusiness,
  useReactivateBusiness,
} from "@/hooks/use-business-actions";
import {
  updateCreatedBusinessProfileSafely,
  useBusinessProfiles,
  useCreateBusiness,
} from "@/hooks/use-business-profiles";
import { useLocations } from "@/hooks/use-locations";
import { useCreateJob } from "@/hooks/use-jobs";
import { useRoleGuard } from "@/hooks/use-permissions";
import { useProfilePipeline } from "@/hooks/use-profile-pipeline";
import {
  CreateBusinessConflictError,
  type ExistingBusinessSummary,
} from "@/lib/business-conflict";
import type { JobResponse } from "@/types/profile-v2";
import { ACCOUNT_ROLES } from "@/lib/permissions";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
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

export default function CreateBusinessPage() {
  const allowed = useRoleGuard({
    allowedRoles: [ACCOUNT_ROLES.OWNER, ACCOUNT_ROLES.ADMIN],
    fallbackPath: "/settings",
  });
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
  const convertPitch = useConvertPitchToBusiness();
  const reactivateBusiness = useReactivateBusiness();
  const [hasQuickProfile, setHasQuickProfile] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] =
    useState<ProfileConfirmAction | null>(null);
  const creationInFlight = useRef(false);
  const [createdBusiness, setCreatedBusiness] =
    useState<BusinessProfile | null>(null);
  const [conflictingBusiness, setConflictingBusiness] =
    useState<ExistingBusinessSummary | null>(null);
  const [submissionIssues, setSubmissionIssues] = useState<
    ProfileValidationIssue[]
  >([]);

  const createdForWebsiteRef = useRef<string | null>(null);
  const createdJobRef = useRef<JobResponse | null>(null);

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

  const handleQuickProfile = useCallback(async () => {
    const values = form.state.values as BusinessInfoFormData;
    if (
      !values.website.trim() ||
      !values.primaryLocation.trim() ||
      !values.serviceAreaType
    ) {
      toast.error("Add a website, primary location, and service-area type.");
      return;
    }

    try {
      const profile = await pipeline.runQuick(values);
      if (profile.status === "error") {
        toast.error("Quick profile failed", {
          description: pipeline.failure?.message,
        });
        return;
      }
      const nextValues = mapProfileToFormValues(profile, values);
      applyFormValues(form, nextValues);
      setSubmissionIssues([]);
      setHasQuickProfile(true);
      if (profile.status === "needs_verification") {
        toast.warning("Some profile details need verification.", {
          description: "Review the highlighted profile fields before creating.",
        });
      }
    } catch (error) {
      toast.error("Couldn't build the profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [form, pipeline]);

  const handleSubmitCreate = useCallback(async () => {
    if (creationInFlight.current) return;
    const values = form.state.values as BusinessInfoFormData;
    form.validate("submit");
    const issues = validateProfileForm(values);
    setSubmissionIssues(issues);
    if (issues.length > 0) {
      const labels = [...new Set(issues.map((issue) => issue.label))];
      toast.error("Complete the highlighted fields before creating.", {
        description: labels.join(", "),
      });
      return;
    }
    if (!pipeline.quickProfile || pipeline.quickProfile.status === "error") {
      toast.error("Run quick profile before creating the business.");
      return;
    }

    creationInFlight.current = true;
    setIsCreating(true);
    let business = createdBusiness;
    if (createdForWebsiteRef.current !== values.website.trim()) {
      business = null;
      setCreatedBusiness(null);
      createdJobRef.current = null;
    }
    try {
      if (!business?.UniqueId) {
        const result = await createBusiness.mutateAsync({
          website: values.website,
          businessName: values.businessName,
          primaryLocation: values.primaryLocation,
          serveCustomers:
            values.serviceType === "physical"
              ? "local"
              : values.serviceType === "both"
                ? "both"
                : values.serviceType === "online"
                  ? "online"
                  : "",
          offerType: values.offerings || "",
          suppressErrorToast: true,
        });
        business = result.createdBusiness;
        if (!business?.UniqueId) {
          throw new Error("The business API did not return a business id.");
        }
        setCreatedBusiness(business);
        createdForWebsiteRef.current = values.website.trim();
      }

      const nodePayload = buildBusinessProfilePayload(values, {
        locationOptions,
        normalizeWebsite: true,
        ctasMode: "wrapped-json",
      });
      nodePayload.ProfileId = pipeline.quickProfile.profile_id;
      await updateCreatedBusinessProfileSafely(
        business.UniqueId,
        { ...business, ...nodePayload },
        { expectedWebsite: values.website, expectedIsPitch: false }
      );

      const job = createdJobRef.current ?? await createJob.mutateAsync({
        businessId: business.UniqueId,
        profileId: pipeline.quickProfile.profile_id,
        values,
        locationOptions,
      });
      createdJobRef.current = job;
      const canonicalValues = {
        ...mapJobToFormValues(job),
        website: values.website,
        primaryLocation: values.primaryLocation,
        serviceAreaType: values.serviceAreaType,
        calendarEvents: values.calendarEvents,
      };
      const canonicalNodePayload = buildBusinessProfilePayload(
        canonicalValues,
        {
          existingProfile: business,
          locationOptions,
          normalizeWebsite: true,
          ctasMode: "wrapped-json",
          preserveExistingProfile: true,
        }
      );
      canonicalNodePayload.ProfileId = job.profile_id;
      await updateCreatedBusinessProfileSafely(
        business.UniqueId,
        canonicalNodePayload,
        { expectedWebsite: values.website, expectedIsPitch: false }
      );
      await refetchBusinessProfiles();
      router.push(`/business/${business.UniqueId}/profile`);
    } catch (error) {
      if (error instanceof CreateBusinessConflictError) {
        setConflictingBusiness(error.conflict.existingBusiness);
        return;
      }
      toast.error(
        business
          ? "Business created, but setup is incomplete."
          : "Failed to create business",
        {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }
      );
      if (business?.UniqueId) {
        router.push(`/business/${business.UniqueId}/profile`);
      }
    } finally {
      creationInFlight.current = false;
      setIsCreating(false);
    }
  }, [
    createBusiness,
    createJob,
    createdBusiness,
    form,
    locationOptions,
    pipeline,
    refetchBusinessProfiles,
    router,
  ]);

  const handleOpenExisting = useCallback(() => {
    if (!conflictingBusiness?.UniqueId) return;
    router.push(
      conflictingBusiness.IsPitch
        ? `/pitches/${conflictingBusiness.UniqueId}/profile`
        : `/business/${conflictingBusiness.UniqueId}/profile`
    );
  }, [conflictingBusiness, router]);

  const handleConvertPitch = useCallback(async () => {
    if (!conflictingBusiness?.UniqueId) return;
    await convertPitch.mutateAsync({
      businessId: conflictingBusiness.UniqueId,
      suppressConflictToast: true,
    });
    router.push(`/business/${conflictingBusiness.UniqueId}/profile`);
  }, [conflictingBusiness, convertPitch, router]);

  const handleReactivate = useCallback(async () => {
    if (!conflictingBusiness?.UniqueId) return;
    await reactivateBusiness.mutateAsync({
      businessId: conflictingBusiness.UniqueId,
    });
    router.push(`/business/${conflictingBusiness.UniqueId}/profile`);
  }, [conflictingBusiness, reactivateBusiness, router]);

  if (!allowed) return null;

  return (
    <>
      <CreateBusinessTemplate
        form={form}
        locationOptions={locationOptions}
        locationsLoading={locationsLoading}
        isSubmitting={isCreating}
        isPending={createBusiness.isPending || createJob.isPending || pipeline.isProcessing}
        isAutofillLoading={pipeline.stage === "quick"}
        hasAutofilledProfile={hasQuickProfile}
        submissionIssues={submissionIssues}
        onAutofillProfile={() => {
          if (hasQuickProfile) setPendingConfirmAction("autofill");
          else void handleQuickProfile();
        }}
        onSubmitCreate={() => setPendingConfirmAction("create")}
        onCancel={() => router.push("/")}
      />
      <ProfileActionConfirmDialog
        action={pendingConfirmAction}
        onCancel={() => setPendingConfirmAction(null)}
        onConfirm={(action) => {
          setPendingConfirmAction(null);
          if (action === "autofill") void handleQuickProfile();
          else void handleSubmitCreate();
        }}
      />
      <DuplicateBusinessConflictDialog
        open={Boolean(conflictingBusiness)}
        business={conflictingBusiness}
        isConverting={convertPitch.isPending}
        isReactivating={reactivateBusiness.isPending}
        onOpenChange={(open) => !open && setConflictingBusiness(null)}
        onOpenExisting={handleOpenExisting}
        onConvertPitch={() => void handleConvertPitch()}
        onReactivate={() => void handleReactivate()}
      />
    </>
  );
}
