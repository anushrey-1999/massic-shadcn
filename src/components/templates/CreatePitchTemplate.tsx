"use client";

import React, { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";

import { useLocations } from "@/hooks/use-locations";
import { useBusinessStore } from "@/store/business-store";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { useCreateBusiness, useBusinessProfiles, usePitchBusinesses, fetchPitchBusinessProfiles } from "@/hooks/use-business-profiles";
import { useCreateJob } from "@/hooks/use-jobs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/molecules/PageHeader";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { LoaderOverlay } from "@/components/ui/loader";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { ProfileFormTabs } from "@/components/templates/ProfileFormTabs";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import {
  buildBusinessProfilePayload,
  mapFormOfferingsToJobOfferings,
  PROFILE_FORM_TABS,
  profileFormDefaults,
  type ProfileFormTabId,
} from "@/utils/profile-form-mappers";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const { user } = useAuthStore();

  const createBusiness = useCreateBusiness();
  const createJobMutation = useCreateJob();
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const { pitchBusinesses } = usePitchBusinesses();

  const offeringsExtractor = useOfferingsExtractor("create-pitch");

  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const resetProfileForm = useBusinessStore((state) => state.resetProfileForm);

  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  const [existingBusinessId, setExistingBusinessId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileFormTabId>(
    PROFILE_FORM_TABS[0].id
  );
  React.useEffect(() => {
    resetProfileForm();
    return () => resetProfileForm();
  }, [resetProfileForm]);

  React.useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [locationOptions, locationsLoading, setLocationOptions, setLocationsLoading]);

  const form = useForm({
    defaultValues: profileFormDefaults,
    onSubmit: async ({ value }) => {
      console.log("[CreatePitch] onSubmit called with values:", value);
      const normalizedOfferType: "products" | "services" | "both" =
        value.offerings === "products"
          ? "products"
          : value.offerings === "both"
            ? "both"
            : "services";

      const normalizedServeCustomers: "local" | "online" | "both" =
        value.serviceType === "physical"
          ? "local"
          : value.serviceType === "both"
            ? "both"
            : "online";

      const result = await createBusiness.mutateAsync({
        website: value.website,
        businessName: value.businessName,
        primaryLocation: value.primaryLocation,
        serveCustomers: normalizedServeCustomers,
        offerType: normalizedOfferType,
        isPitch: true, // Mark this business as created from pitch flow
        locationOptions,
      });

      await refetchBusinessProfiles();

      // Refetch pitch businesses (with isPitch=true) to get the newly created business
      const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;
      let createdBusinessId: string | null = null;

      if (userUniqueId) {
        const pitchBusinesses = await fetchPitchBusinessProfiles(userUniqueId);
        // Find the business matching the website we just created
        const websiteLower = value.website.toLowerCase();
        const createdBiz = pitchBusinesses.find(
          (b) =>
            b.Website?.toLowerCase().includes(websiteLower) ||
            websiteLower.includes(b.Website?.toLowerCase() || "")
        );
        createdBusinessId = createdBiz?.UniqueId || null;
      }

      if (!createdBusinessId) {
        router.push("/pitches");
        return;
      }

      const offeringsFromForm = mapFormOfferingsToJobOfferings(value);
      const offerings =
        offeringsFromForm.length > 0
          ? offeringsFromForm
          : ((autofillProfileResult?.offerings ?? []) as typeof offeringsFromForm);
      const businessProfilePayload = buildBusinessProfilePayload(value, {
        autofillResult: autofillProfileResult,
        locationOptions,
      });

      await api.post(
        "/profile/update-business-profile",
        "node",
        { ...businessProfilePayload, UniqueId: createdBusinessId }
      );

      await createJobMutation.mutateAsync({
        businessId: createdBusinessId,
        businessProfilePayload,
        offerings,
      });

      router.push(`/pitches/${createdBusinessId}/reports`);
    },
  });

  const normalizeUrl = (url: string) =>
    url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").trim();

  const { autofillProfile: handleAutofillProfile, autofillProfileResult, isAutofillLoading } =
    useProfileAutofillForm({
      form,
      locationOptions,
      onBeforeAutofill: (website) => {
        const normalizedInput = normalizeUrl(website);
        const match = pitchBusinesses.find((business) => {
          const businessWebsite = normalizeUrl(business.Website || "");
          return (
            businessWebsite &&
            (businessWebsite === normalizedInput ||
              businessWebsite.includes(normalizedInput) ||
              normalizedInput.includes(businessWebsite))
          );
        });
        if (match) {
          setExistingBusinessId(match.UniqueId);
          return false;
        }
        void offeringsExtractor.startExtraction(website).catch(() => {});
        return true;
      },
      onAutofillSuccess: () => {
        setHasAutofilledProfile(true);
        setProfileTab("basic-details");
      },
    });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: "Create Pitch", href: "/pitches/create-pitch" },
  ];

  const formValues = useStore(form.store, (state: any) => state.values) as BusinessInfoFormData;

  const hasOfferingsValidationErrors = useStore(form.store, (state: any) => {
    const offeringsMeta = state.fieldMeta?.offeringsList;
    return offeringsMeta?.hasValidationErrors === true;
  });

  const hasRequiredFieldErrors = React.useMemo(() => {
    const { website, businessName, primaryLocation, serviceType, offerings } = formValues;
    return (
      !website?.trim() ||
      !businessName?.trim() ||
      !primaryLocation?.trim() ||
      !["physical", "online", "both"].includes(serviceType) ||
      !["products", "services", "both"].includes(offerings)
    );
  }, [formValues]);

  const hasAtLeastOneOffering = React.useMemo(() => {
    const list = Array.isArray(formValues.offeringsList) ? formValues.offeringsList : [];
    return list.some((row) => Boolean(row?.name?.trim()));
  }, [formValues.offeringsList]);

  const canConfirmAndProceed =
    hasAutofilledProfile &&
    !offeringsExtractor.isExtracting &&
    !hasRequiredFieldErrors &&
    !hasOfferingsValidationErrors &&
    hasAtLeastOneOffering;

  const isCreatingBusiness = createBusiness.isPending;
  const isCreatingJob = createJobMutation.isPending;
  const isSubmitting = useStore(form.store, (state: any) => state.isSubmitting === true);

  const isLoading = isCreatingBusiness || isCreatingJob || isAutofillLoading;
  const loadingMessage = React.useMemo(() => {
    if (isAutofillLoading) return "Autofilling profile...";
    if (isCreatingJob) return "Setting things up...";
    if (isCreatingBusiness) return "Creating business...";
    return undefined;
  }, [isAutofillLoading, isCreatingBusiness, isCreatingJob]);

  React.useEffect(() => {
    console.log("[CreatePitch] Button state:", {
      isButtonDisabled: !canConfirmAndProceed || isSubmitting || isLoading,
      canConfirmAndProceed,
      hasAutofilledProfile,
      hasRequiredFieldErrors,
      hasOfferingsValidationErrors,
      hasAtLeastOneOffering,
      isSubmitting,
      isLoading,
      isCreatingBusiness,
      isCreatingJob,
      isAutofillLoading,
      isOfferingsExtracting: offeringsExtractor.isExtracting,
    });
    if (hasRequiredFieldErrors) {
      const { website, businessName, primaryLocation, serviceType, offerings } = formValues;
      console.log("[CreatePitch] Required field values:", {
        website,
        businessName,
        primaryLocation,
        serviceType,
        offerings,
      });
    }
    if (!hasAtLeastOneOffering) {
      console.log("[CreatePitch] offeringsList:", formValues.offeringsList);
    }
  });

  const handleConfirmAndProceed = React.useCallback(async () => {
    console.log("[CreatePitch] handleConfirmAndProceed fired");
    console.log("[CreatePitch] form state before submit:", {
      values: form.state.values,
      errors: form.state.errors,
      isSubmitting: form.state.isSubmitting,
    });
    await form.handleSubmit();
    console.log("[CreatePitch] handleSubmit completed");
  }, [form]);

  return (
    <div className="flex flex-col h-dvh max-h-dvh min-h-0 relative overflow-hidden">
      <Dialog open={!!existingBusinessId} onOpenChange={(open) => { if (!open) setExistingBusinessId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business Already Exists</DialogTitle>
            <DialogDescription>
              A pitch business with this website already exists. You can view and manage it from its profile page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExistingBusinessId(null)}>
              Cancel
            </Button>
            <Button onClick={() => router.push(`/pitches/${existingBusinessId}/profile`)}>
              Go to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoaderOverlay isLoading={isLoading} message={loadingMessage}>
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                {!hasAutofilledProfile ? (
                  <ProfileStepCard
                    title="Let's set up your pitch"
                    description="Enter your website URL and primary location, then click Autofill Profile — we'll automatically populate your business details."
                    className="flex-1"
                    scrollableContent
                    contentClassName="pb-6"
                  >
                    <BusinessInfoForm
                      form={form}
                      embedded
                      embeddedVariant="autofillGate"
                      disableWebsiteLock
                      primaryLocationAction={
                        <Button
                          type="button"
                          onClick={handleAutofillProfile}
                          disabled={
                            isAutofillLoading ||
                            offeringsExtractor.isExtracting ||
                            !(formValues?.website ?? "").toString().trim() ||
                            !(formValues?.primaryLocation ?? "").toString().trim() ||
                            !(formValues?.serviceAreaType ?? "").toString().trim()
                          }
                          className="w-full gap-2"
                        >
                          {isAutofillLoading ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Autofilling...
                            </>
                          ) : (
                            "Autofill Profile"
                          )}
                        </Button>
                      }
                    />
                  </ProfileStepCard>
                ) : (
                  <ProfileFormTabs
                    form={form}
                    businessId="create-pitch"
                    value={profileTab}
                    onValueChange={setProfileTab}
                    disableWebsiteLock
                    hideFetchOfferingsFromWebsite
                    extractionController={offeringsExtractor}
                    basicDetailsDescription="Add basic details so we can generate a pitch and tailored recommendations."
                    primaryLocationAction={
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={handleAutofillProfile}
                        disabled={
                          isAutofillLoading ||
                          offeringsExtractor.isExtracting ||
                          !(formValues?.website ?? "").toString().trim() ||
                          !(formValues?.primaryLocation ?? "").toString().trim() ||
                          !(formValues?.serviceAreaType ?? "").toString().trim()
                        }
                        className="gap-2 border-general-border-three text-general-foreground"
                      >
                        {isAutofillLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Autofilling...
                          </>
                        ) : (
                          "Autofill Profile"
                        )}
                      </Button>
                    }
                    rightAction={
                      <Button
                        type="button"
                        className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                        onClick={handleConfirmAndProceed}
                        disabled={!canConfirmAndProceed || isSubmitting || isLoading}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Proceeding...
                          </>
                        ) : offeringsExtractor.isExtracting ? (
                          "Extracting offerings..."
                        ) : (
                          "Confirm and Proceed"
                        )}
                      </Button>
                    }
                  />
                )}
              </form>
            </div>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}
