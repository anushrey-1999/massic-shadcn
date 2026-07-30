"use client";

import React, { useCallback, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/hooks/use-api";
import { useLocations } from "@/hooks/use-locations";
import { useBusinessStore } from "@/store/business-store";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessProfileById, useUpdateBusinessProfile } from "@/hooks/use-business-profiles";
import { useCreateJob, useJobByBusinessId, useUpdateJob } from "@/hooks/use-jobs";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileAutofillReviewTemplate } from "@/components/templates/ProfileAutofillReviewTemplate";
import { LoaderOverlay } from "@/components/ui/loader";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type NormalizedProfileResult,
} from "@/utils/profile-result";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConvertPitchToBusiness } from "@/hooks/use-business-actions";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { primaryLocationFromProfile } from "@/utils/primary-location";
import { isValidWebsiteUrl } from "@/utils/utils";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import {
  buildBusinessProfilePayload,
  mapFormOfferingsToJobOfferings,
  mapProfileDataToFormValues,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";

export function PitchProfileTemplate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;
  const didInitialHydrateRef = React.useRef(false);

  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const resetProfileForm = useBusinessStore((state) => state.resetProfileForm);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId ?? null);
  const updateBusinessProfileMutation = useUpdateBusinessProfile(businessId ?? null);

  const jobQuery = useJobByBusinessId(businessId ?? null);
  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();
  const convertPitchMutation = useConvertPitchToBusiness();
  const guardConvertPitch = useFeatureActionGuard("business.convertPitch");

  const offeringsExtractor = useOfferingsExtractor(businessId ?? null);

  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [autofillProfileResult, setAutofillProfileResult] =
    useState<NormalizedProfileResult | null>(null);

  React.useEffect(() => {
    resetProfileForm();
    return () => resetProfileForm();
  }, [resetProfileForm]);

  // Reset initial hydration when business changes.
  React.useEffect(() => {
    didInitialHydrateRef.current = false;
  }, [businessId]);

  React.useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [locationOptions, locationsLoading, setLocationOptions, setLocationsLoading]);

  // Saving never goes through `form.handleSubmit()`. TanStack aborts submission
  // silently while any field still holds a validation error, which makes the
  // Save button look dead. The save path below runs its own explicit checks.
  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: {
      onChange: businessInfoSchema,
    },
  });

  const { autofillProfile: handleAutofillProfile, isAutofillLoading } =
    useProfileAutofillForm({
      form,
      locationOptions,
      onBeforeAutofill: (website) => {
        // Keep offerings extraction in lockstep with profile reruns so users
        // don't end up with a missing job + empty offerings after retrying autofill.
        void offeringsExtractor.startExtraction(website).catch(() => {});
        return true;
      },
      onAutofillSuccess: (profile) => {
        setAutofillProfileResult(profile);
      },
    });

  const formValues = useStore(form.store, (state: any) => state.values) as BusinessInfoFormData;

  const isAutofillDisabled =
    isAutofillLoading ||
    locationsLoading ||
    !String(formValues?.website ?? "").trim() ||
    !String(formValues?.primaryLocation ?? "").trim() ||
    !String(formValues?.serviceAreaType ?? "").trim();

  React.useEffect(() => {
    if (!businessId) return;
    if (profileDataLoading || locationsLoading) return;
    if (!jobQuery.isFetched) return;
    if (didInitialHydrateRef.current) return;

    const jobDetails = jobQuery.data;
    const mappedValues = mapProfileDataToFormValues(
      profileData || null,
      jobDetails || null,
      locationOptions
    );

    Object.entries(mappedValues).forEach(([fieldName, value]) => {
      const current = (form.state.values as any)?.[fieldName];
      const hasCurrentValue = Array.isArray(current)
        ? current.length > 0
        : String(current ?? "").trim().length > 0;
      const hasMappedValue = Array.isArray(value)
        ? value.length > 0
        : String(value ?? "").trim().length > 0;

      if (!hasCurrentValue && hasMappedValue) {
        form.setFieldValue(fieldName as any, value as any);
      }
    });

    didInitialHydrateRef.current = true;
  }, [businessId, form, jobQuery.data, jobQuery.isFetched, locationOptions, locationsLoading, profileData, profileDataLoading]);

  React.useEffect(() => {
    if (locationsLoading || !profileData) return;

    const hasSelectableOptions = locationOptions.some(
      (opt) => opt.disabled !== true && opt.value !== ""
    );
    if (!hasSelectableOptions) return;

    const resolved = primaryLocationFromProfile(
      (profileData as any).PrimaryLocation,
      locationOptions
    );
    if (!resolved) return;

    const current = String(form.state.values.primaryLocation || "");
    const currentIsValid = locationOptions.some(
      (opt) => opt.disabled !== true && opt.value !== "" && opt.value === current
    );

    if (!currentIsValid && resolved !== current) {
      form.setFieldValue("primaryLocation", resolved);
    }
  }, [form, locationOptions, locationsLoading, profileData]);

  const businessNameForBreadcrumb =
    profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Pitches", href: "/pitches" },
      { label: businessNameForBreadcrumb },
      { label: "Profile", href: businessId ? `/pitches/${businessId}/profile` : undefined },
    ],
    [businessId, businessNameForBreadcrumb]
  );

  const hasOfferingsValidationErrors = useStore(form.store, (state: any) => {
    const offeringsMeta = state.fieldMeta?.offeringsList;
    return offeringsMeta?.hasValidationErrors === true;
  });

  const isSavingBusiness = updateBusinessProfileMutation.isPending;
  const isSavingJob = createJobMutation.isPending || updateJobMutation.isPending;
  const isSaving = isSavingBusiness || isSavingJob;

  // Only the fields the profile/job APIs actually need. Anything else stays
  // editable and never blocks the save.
  const getSaveBlockReason = React.useCallback(
    (values: BusinessInfoFormData): string | null => {
      const website = String(values?.website ?? "").trim();
      if (!website) return "Add a website before saving.";
      if (!isValidWebsiteUrl(website)) return "Enter a valid website URL before saving.";
      if (!String(values?.businessName ?? "").trim()) {
        return "Add a business name before saving.";
      }
      if (!String(values?.primaryLocation ?? "").trim()) {
        return "Select a primary location before saving.";
      }
      if (hasOfferingsValidationErrors) {
        return "Fix the highlighted errors in Offerings before saving.";
      }
      const offerings = Array.isArray(values?.offeringsList) ? values.offeringsList : [];
      if (!offerings.some((row) => Boolean(String(row?.name ?? "").trim()))) {
        return "Add at least one offering with a name before saving.";
      }
      return null;
    },
    [hasOfferingsValidationErrors]
  );

  const saveBlockReason = React.useMemo(
    () => getSaveBlockReason(formValues),
    [formValues, getSaveBlockReason]
  );

  const canConfirmAndProceed = saveBlockReason === null;

  const isLoading =
    isSavingBusiness || isSavingJob || isAutofillLoading || isTriggeringWorkflow;
  const loadingMessage = React.useMemo(() => {
    if (isAutofillLoading) return "Autofilling profile...";
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (isSavingJob) return "Saving job...";
    if (isSavingBusiness) return "Saving business...";
    return undefined;
  }, [isAutofillLoading, isSavingBusiness, isSavingJob, isTriggeringWorkflow]);

  const performSave = React.useCallback(async (): Promise<boolean> => {
    if (!businessId) {
      toast.error("This pitch is missing its business id. Refresh and try again.");
      return false;
    }
    if (isSaving) return false;

    const values = form.state.values as BusinessInfoFormData;
    const blockReason = getSaveBlockReason(values);
    if (blockReason) {
      toast.error(blockReason);
      return false;
    }

    try {
      const offerings = mapFormOfferingsToJobOfferings(values);
      const businessProfilePayload = buildBusinessProfilePayload(values, {
        autofillResult: autofillProfileResult,
        existingProfile: profileData,
        locationOptions,
        preserveExistingProfile: true,
      });

      await updateBusinessProfileMutation.mutateAsync(businessProfilePayload as any);

      const jobExists = Boolean(jobQuery.data?.job_id);
      if (jobExists) {
        await updateJobMutation.mutateAsync({
          businessId,
          businessProfilePayload,
          offerings,
        });
      } else {
        await createJobMutation.mutateAsync({
          businessId,
          businessProfilePayload,
          offerings,
        });
      }

      const resolvedPrimaryLocation = primaryLocationFromProfile(
        businessProfilePayload.PrimaryLocation,
        locationOptions
      );
      if (resolvedPrimaryLocation) {
        form.setFieldValue("primaryLocation", resolvedPrimaryLocation);
      }

      await jobQuery.refetch();
      toast.success("Profile updated");
      return true;
    } catch (error: any) {
      toast.error("Couldn't save pitch profile", {
        description:
          error?.response?.data?.detail ||
          error?.message ||
          "Please try again.",
      });
      return false;
    }
  }, [
    autofillProfileResult,
    businessId,
    createJobMutation,
    form,
    getSaveBlockReason,
    isSaving,
    jobQuery,
    locationOptions,
    profileData,
    updateBusinessProfileMutation,
    updateJobMutation,
  ]);

  const handleSaveChanges = React.useCallback(async () => {
    await performSave();
  }, [performSave]);

  const handleSaveAndProceed = React.useCallback(async () => {
    if (!businessId) return;

    const saved = await performSave();
    if (!saved) return;

    try {
      setIsTriggeringWorkflow(true);

      await api.post("/jobs/run", "python", {
        business_id: businessId,
      });

      queryClient.invalidateQueries({
        queryKey: ["jobs", "detail", businessId],
      });

      toast.success("Workflow triggered successfully!");
      router.push(`/pitches/${businessId}/strategy`);
    } catch (error: any) {
      toast.error("Error triggering workflow", {
        description:
          error?.response?.data?.detail ||
          error?.message ||
          "Please try again.",
      });
    } finally {
      setIsTriggeringWorkflow(false);
    }
  }, [businessId, performSave, queryClient, router]);

  const handleConvertToBusiness = React.useCallback(async () => {
    if (!guardConvertPitch()) return;
    if (!businessId) return;

    await convertPitchMutation.mutateAsync({ businessId });
    setIsConvertConfirmOpen(false);
    router.push(`/business/${businessId}/profile`);
  }, [businessId, convertPitchMutation, guardConvertPitch, router]);

  return (
    <div className={cn("flex flex-col h-full min-h-0 relative overflow-hidden")}>
      <LoaderOverlay isLoading={isLoading} message={loadingMessage}>
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
              <div className="flex-1 flex flex-col gap-7 min-h-0 min-w-0 overflow-hidden">
                <form
                  id="pitch-profile-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveChanges();
                  }}
                  className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
                >
                  <ProfileAutofillReviewTemplate
                    form={form}
                    businessId={businessId ?? null}
                    leftTitle="Pitch Profile"
                    extractionController={offeringsExtractor}
                    onSaveChanges={() => {
                      void handleSaveChanges();
                    }}
                    onSaveAndUpdateStrategy={() => {
                      void handleSaveAndProceed();
                    }}
                    onAutofillProfile={() => {
                      void handleAutofillProfile();
                    }}
                    autofillDisabled={isAutofillDisabled}
                    autofillLoading={isAutofillLoading}
                    showUnlinkBusiness={false}
                    saveDisabled={isSaving}
                    proceedDisabled={
                      !canConfirmAndProceed ||
                      isLoading ||
                      convertPitchMutation.isPending
                    }
                    showDefaultActions={false}
                    customHeaderActions={
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                type="button"
                                className="bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                                onClick={() => {
                                  if (offeringsExtractor.isExtracting) {
                                    toast("Offerings extraction is still running.", {
                                      description:
                                        "Saving now will use the offerings currently in the form.",
                                    });
                                  }
                                  void handleSaveChanges();
                                }}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save Changes"
                                )}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {saveBlockReason ? (
                            <TooltipContent>
                              <p>{saveBlockReason}</p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-general-border-three text-general-foreground"
                          onClick={() => {
                            if (!guardConvertPitch()) return;
                            setIsConvertConfirmOpen(true);
                          }}
                          disabled={convertPitchMutation.isPending || isLoading}
                        >
                          {convertPitchMutation.isPending ? "Converting..." : "Convert to Business"}
                        </Button>
                      </>
                    }
                    className="flex-1"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </LoaderOverlay>
      <AlertDialog open={isConvertConfirmOpen} onOpenChange={setIsConvertConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Business?</AlertDialogTitle>
            <AlertDialogDescription>
              This pitch will be moved to Businesses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convertPitchMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConvertToBusiness();
              }}
              disabled={convertPitchMutation.isPending}
            >
              {convertPitchMutation.isPending ? "Converting..." : "Convert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
