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
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { ProfileAutofillReviewTemplate } from "@/components/templates/ProfileAutofillReviewTemplate";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildBusinessProfilePayload,
  mapFormOfferingsToJobOfferings,
  profileFormDefaults,
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
      const offerings = offeringsFromForm;
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
      },
    });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: "Create Pitch", href: "/pitches/create-pitch" },
  ];

  const formValues = useStore(form.store, (state: any) => state.values) as BusinessInfoFormData;
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

  const isAutofillDisabled =
    isAutofillLoading ||
    locationsLoading ||
    !String(formValues?.website ?? "").trim() ||
    !String(formValues?.primaryLocation ?? "").trim() ||
    !String(formValues?.serviceAreaType ?? "").trim();

  const renderAutofillButton = ({
    className,
    variant,
  }: {
    className?: string;
    variant?: "outline";
  } = {}) => (
    <Button
      type="button"
      variant={variant}
      onClick={handleAutofillProfile}
      disabled={isAutofillDisabled}
      className={cn(
        "gap-2",
        variant
          ? "border-general-border-three text-general-foreground"
          : "bg-general-primary text-general-primary-foreground hover:bg-general-primary/90",
        className
      )}
    >
      {isAutofillLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Autofilling...
        </>
      ) : (
        <>
          Autofill Profile
          <ArrowRight className="size-4 shrink-0" />
        </>
      )}
    </Button>
  );

  return (
    <div className={cn("flex flex-col h-full min-h-0 relative overflow-hidden")}>
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

      <LoaderOverlay
        isLoading={isLoading}
        message={loadingMessage}
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div
              className={cn(
                "w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1",
                !hasAutofilledProfile && "justify-center items-center"
              )}
            >
              <form
                id="create-pitch-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                {!hasAutofilledProfile ? (
                  <ProfileGateCard
                    title="Add a business"
                    description="We build the profile from the website. Anything the site can't give us, you fill in after — nothing is guessed."
                    className="w-full max-w-[490px] self-center"
                  >
                    <div className="mx-auto w-full max-w-[442px]">
                      <BusinessInfoForm
                        form={form}
                        embedded
                        embeddedVariant="autofillGate"
                        disableWebsiteLock
                        primaryLocationAction={renderAutofillButton({ className: "w-full gap-2" })}
                      />
                    </div>
                  </ProfileGateCard>
                ) : null}
                {hasAutofilledProfile && (
                  <ProfileAutofillReviewTemplate
                    form={form}
                    businessId={null}
                    leftTitle="Create Pitch"
                    extractionController={offeringsExtractor}
                    hideFetchOfferingsFromWebsite
                    onSaveChanges={() => {}}
                    onSaveAndUpdateStrategy={() => {}}
                    onAutofillProfile={() => {
                      void handleAutofillProfile();
                    }}
                    autofillDisabled={isAutofillDisabled}
                    autofillLoading={isAutofillLoading}
                    showUnlinkBusiness={false}
                    showDefaultActions={false}
                    customHeaderActions={
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-general-border-three text-general-foreground"
                          onClick={() => router.push("/pitches")}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          form="create-pitch-form"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          disabled={
                            isSubmitting ||
                            isCreatingBusiness ||
                            isCreatingJob ||
                            isAutofillLoading ||
                            offeringsExtractor.isExtracting
                          }
                        >
                          {isSubmitting || isCreatingBusiness || isCreatingJob ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Creating...
                            </>
                          ) : offeringsExtractor.isExtracting ? (
                            "Extracting offerings..."
                          ) : (
                            "Create"
                          )}
                        </Button>
                      </>
                    }
                    className="flex-1"
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
