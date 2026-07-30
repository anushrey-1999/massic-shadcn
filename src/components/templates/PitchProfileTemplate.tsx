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

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: {
      onChange: businessInfoSchema,
    },
    onSubmit: async ({ value }) => {
      if (!businessId) return;

      const offerings = mapFormOfferingsToJobOfferings(value);
      const businessProfilePayload = buildBusinessProfilePayload(value, {
        autofillResult: autofillProfileResult,
        existingProfile: profileData,
        locationOptions,
        preserveExistingProfile: true,
      });
      const payloadForUpdate = businessProfilePayload;

      await updateBusinessProfileMutation.mutateAsync(payloadForUpdate as any);

      const jobDetails = jobQuery.data;
      const jobExists = Boolean(jobDetails && jobDetails.job_id);

      if (jobExists) {
        await updateJobMutation.mutateAsync({
          businessId,
          businessProfilePayload: payloadForUpdate,
          offerings,
        });
      } else {
        await createJobMutation.mutateAsync({
          businessId,
          businessProfilePayload: payloadForUpdate,
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

      toast.success("Profile updated");
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

  const hasSchemaValidationErrors = React.useMemo(() => {
    return !businessInfoSchema.safeParse(formValues).success;
  }, [formValues]);

  const hasAtLeastOneOffering = React.useMemo(() => {
    const list = Array.isArray(formValues.offeringsList) ? formValues.offeringsList : [];
    return list.some((row) => Boolean(row?.name?.trim()));
  }, [formValues.offeringsList]);

  const canConfirmAndProceed =
    !hasSchemaValidationErrors &&
    !hasOfferingsValidationErrors &&
    hasAtLeastOneOffering;

  const isSavingBusiness = updateBusinessProfileMutation.isPending;
  const isSavingJob = createJobMutation.isPending || updateJobMutation.isPending;
  const isSubmitting = useStore(form.store, (state: any) => state.isSubmitting === true);

  const saveDisabledReason = React.useMemo(() => {
    if (hasSchemaValidationErrors) {
      return "Fix the required fields before saving.";
    }
    if (hasOfferingsValidationErrors) {
      return "Fix the errors in Offerings before saving.";
    }
    if (!hasAtLeastOneOffering) {
      return "Add at least one offering to save this pitch.";
    }
    return null;
  }, [
    hasAtLeastOneOffering,
    hasOfferingsValidationErrors,
    hasSchemaValidationErrors,
  ]);

  const isLoading =
    isSavingBusiness || isSavingJob || isAutofillLoading || isTriggeringWorkflow;
  const loadingMessage = React.useMemo(() => {
    if (isAutofillLoading) return "Autofilling profile...";
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (isSavingJob) return "Saving job...";
    if (isSavingBusiness) return "Saving business...";
    return undefined;
  }, [isAutofillLoading, isSavingBusiness, isSavingJob, isTriggeringWorkflow]);

  const handleSaveChanges = React.useCallback(async () => {
    if (!businessId) return;
    await form.handleSubmit();
  }, [businessId, form]);

  const handleSaveAndProceed = React.useCallback(async () => {
    if (!businessId) return;

    try {
      await form.handleSubmit();
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
  }, [businessId, form, queryClient, router]);

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
                    form.handleSubmit();
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
                    saveDisabled={
                      isSavingBusiness ||
                      isSavingJob ||
                      isSubmitting ||
                      !canConfirmAndProceed
                    }
                    proceedDisabled={
                      !canConfirmAndProceed ||
                      isSubmitting ||
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
                                  void handleSaveChanges();
                                }}
                                disabled={
                                  isSavingBusiness ||
                                  isSavingJob ||
                                  isSubmitting ||
                                  offeringsExtractor.isExtracting ||
                                  !canConfirmAndProceed
                                }
                              >
                                {offeringsExtractor.isExtracting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Extracting offerings...
                                  </>
                                ) : isSavingBusiness || isSavingJob || isSubmitting ? (
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
                          {saveDisabledReason ? (
                            <TooltipContent>
                              <p>{saveDisabledReason}</p>
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
