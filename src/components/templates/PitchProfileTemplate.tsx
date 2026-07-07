"use client";

import React, { useCallback, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { ProfileFormTabs } from "@/components/templates/ProfileFormTabs";
import { LoaderOverlay } from "@/components/ui/loader";
import { Loader2 } from "lucide-react";
import { cleanWebsiteUrl } from "@/utils/utils";
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
import { primaryLocationFromProfile, resolvePrimaryLocationFormValue } from "@/utils/primary-location";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";
import {
  buildBusinessProfilePayload,
  mapFormOfferingsToJobOfferings,
  PROFILE_FORM_TABS,
  profileFormDefaults,
  type ProfileFormTabId,
} from "@/utils/profile-form-mappers";

function toPrimaryLocationString(input: any): string {
  const location = String(input?.Location || "").trim();
  const country = String(input?.Country || "").trim();
  if (!location && !country) return "";
  if (location && country && country.toLowerCase() !== location.toLowerCase()) {
    return `${location},${country}`;
  }
  return location || country;
}

function normalizeOfferingsList(jobOfferings: any): Array<{ name: string; description: string; link: string }> {
  if (!Array.isArray(jobOfferings)) return [];
  return jobOfferings
    .map((o) => ({
      name: String(o?.name || o?.offering || "").trim(),
      description: String(o?.description || "").trim(),
      link: String(o?.url || "").trim(),
    }))
    .filter((o) => Boolean(o.name));
}

export function PitchProfileTemplate() {
  const router = useRouter();
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;

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

  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const [autofillProfileResult, setAutofillProfileResult] =
    useState<NormalizedProfileResult | null>(null);
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
      onAutofillSuccess: (profile) => {
        setAutofillProfileResult(profile);
      },
    });

  const formValues = useStore(form.store, (state: any) => state.values) as BusinessInfoFormData;

  React.useEffect(() => {
    if (!businessId) return;
    if (profileDataLoading || locationsLoading) return;
    if (!jobQuery.isFetched) return;

    const jobDetails = jobQuery.data;

    const profileAny = profileData as any;

    const website =
      String(profileData?.Website || "").trim() ||
      String(jobDetails?.business_url || "").trim();
    const businessName =
      String(profileData?.Name || "").trim() ||
      String(profileData?.DisplayName || "").trim() ||
      String(jobDetails?.name || "").trim();
    const businessDescription =
      String((profileData as any)?.UserDefinedBusinessDescription || "").trim() ||
      String(profileData?.Description || "").trim() ||
      String(jobDetails?.user_defined_business_description || "").trim();
    const businessCategory =
      String(profileAny?.BusinessCategory || profileAny?.business_category || (jobDetails as any)?.business_category || "").trim();
    const legalName = String(profileAny?.LegalName || profileAny?.legalName || "").trim();
    const foundingDate = String(profileAny?.FoundingDate || profileAny?.foundingDate || "").trim();
    const logoUrl = String(profileAny?.LogoUrl || profileAny?.logoUrl || "").trim();
    const siteName = String(profileAny?.SiteName || profileAny?.siteName || profileAny?.site_name || "").trim();
    const alternateName = String(profileAny?.AlternateName || profileAny?.alternateName || "").trim();
    const siteSearchUrlPattern = String(profileAny?.SiteSearchUrlPattern || profileAny?.siteSearchUrlPattern || "").trim();
    const serviceAreaType =
      String(profileAny?.ServiceAreaType || profileAny?.service_area_type || (jobDetails as any)?.service_area_type || "").trim();
    const normalizeStringArray = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean);
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
        } catch {
          // ignore
        }
        return raw.split(",").map((item) => item.trim()).filter(Boolean);
      }
      return [];
    };
    const serviceAreas = normalizeStringArray(
      profileAny?.ServiceAreas ?? profileAny?.service_areas ?? (jobDetails as any)?.service_areas
    );
    const primaryLocationRaw =
      toPrimaryLocationString(profileAny?.PrimaryLocation) ||
      String(profileData?.Locations?.[0] ? (profileData.Locations[0] as any)?.Name || "" : "").trim() ||
      (() => {
        const loc = String((jobDetails as any)?.location || "").trim();
        const country = String((jobDetails as any)?.country || "").trim();
        if (!loc && !country) return "";
        if (loc && country && country.toLowerCase() !== loc.toLowerCase()) return `${loc},${country}`;
        return loc || country;
      })();
    const primaryLocation = profileAny?.PrimaryLocation
      ? primaryLocationFromProfile(profileAny.PrimaryLocation, locationOptions)
      : resolvePrimaryLocationFormValue(primaryLocationRaw, locationOptions);

    const businessObjective = String(
      profileData?.BusinessObjective || (jobDetails as any)?.serve || ""
    )
      .toLowerCase()
      .trim();
    const serviceType =
      businessObjective === "local"
        ? "physical"
        : businessObjective === "online"
          ? "online"
          : businessObjective === "both" || businessObjective === "hybrid"
            ? "both"
            : "";

    const locationType = String(
      profileData?.LocationType || (jobDetails as any)?.sell || ""
    )
      .toLowerCase()
      .trim();
    const offerings =
      locationType === "products"
        ? "products"
        : locationType === "both"
          ? "both"
          : "services";

    const offeringsList = normalizeOfferingsList(jobDetails?.offerings);

    const currentOfferingsList = Array.isArray(formValues.offeringsList) ? formValues.offeringsList : [];
    const hasAnyOfferingRow = currentOfferingsList.some((row) => Boolean(row?.name?.trim()));

    const brandTerms = (() => {
      const fromBusiness = profileAny?.BrandTerms ?? profileAny?.brand_terms;
      const fromJob = (jobDetails as any)?.brand_terms;
      const raw = fromBusiness ?? fromJob;

      if (Array.isArray(raw)) {
        return raw.map((t) => String(t).trim()).filter(Boolean);
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((t) => String(t).trim()).filter(Boolean);
          }
        } catch {
          // ignore
        }
        return raw
          .split(",")
          .map((t) => String(t).trim())
          .filter(Boolean);
      }
      return [];
    })();
    const normalizeArray = (raw: unknown): any[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return raw.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };
    const normalizeUsps = (raw: unknown): string[] =>
      normalizeArray(raw).map((item) => String(item).trim()).filter(Boolean);
    const usps = normalizeUsps((jobDetails as any)?.usps ?? profileAny?.USPs ?? profileAny?.SellingPoints).join(", ");
    const ctas = normalizeArray(profileAny?.CTAs ?? (jobDetails as any)?.ctas)
      .map((cta: any) => ({
        buttonText: String(cta?.buttonText ?? cta?.text ?? "").trim(),
        url: String(cta?.url ?? "").trim(),
      }))
      .filter((cta) => Boolean(cta.buttonText && cta.url));
    const rawStakeholders = normalizeArray(profileAny?.CustomerPersonas);
    const rawKeyPeople = normalizeArray(profileAny?.KeyPeople);
    const stakeholders = (rawStakeholders.length > 0 ? rawStakeholders : rawKeyPeople).map((person: any) => ({
      name: person?.personName || person?.name || "",
      title: person?.personDescription || person?.title || person?.role || "",
      bio: person?.bio || "",
    }));
    const businessLocations = normalizeArray(profileAny?.Locations).map((loc: any, index: number) => ({
      name: loc?.DisplayName || loc?.Name || `Location ${index + 1}`,
      address: loc?.Address1 || loc?.address || "",
      timezone: loc?.TimeZone || loc?.timezone || "",
    }));
    const competitors = normalizeArray(profileAny?.Competitors).map((comp: any) => ({
      url: cleanWebsiteUrl(comp?.website || comp?.Website || comp?.url || ""),
    })).filter((comp) => Boolean(comp.url));
    const validToneOptions = new Set([
      "professional",
      "bold",
      "friendly",
      "innovative",
      "playful",
      "trustworthy",
    ]);
    const normalizeTones = (raw: unknown): string[] =>
      normalizeArray(raw)
        .map((tone) => String(tone).toLowerCase().trim())
        .filter((tone) => validToneOptions.has(tone))
        .slice(0, 3);
    const brandToneSocial = normalizeTones(profileAny?.SocialBrandVoice ?? (jobDetails as any)?.social_brand_voice);
    const brandToneWeb = normalizeTones(profileAny?.WebBrandVoice ?? (jobDetails as any)?.web_brand_voice);

    if (!String(formValues.website || "").trim() && website) form.setFieldValue("website", website);
    if (!String((formValues as any).legalName || "").trim() && legalName) form.setFieldValue("legalName" as any, legalName as any);
    if (!String(formValues.businessName || "").trim() && businessName) form.setFieldValue("businessName", businessName);
    if (!String((formValues as any).foundingDate || "").trim() && foundingDate) form.setFieldValue("foundingDate" as any, foundingDate as any);
    if (!String((formValues as any).logoUrl || "").trim() && logoUrl) form.setFieldValue("logoUrl" as any, logoUrl as any);
    if (!String((formValues as any).siteName || "").trim() && siteName) form.setFieldValue("siteName" as any, siteName as any);
    if (!String((formValues as any).alternateName || "").trim() && alternateName) form.setFieldValue("alternateName" as any, alternateName as any);
    if (!String((formValues as any).siteSearchUrlPattern || "").trim() && siteSearchUrlPattern) form.setFieldValue("siteSearchUrlPattern" as any, siteSearchUrlPattern as any);
    if (!String(formValues.businessDescription || "").trim() && businessDescription) {
      form.setFieldValue("businessDescription", businessDescription);
    }
    if (!String((formValues as any).businessCategory || "").trim() && businessCategory) {
      form.setFieldValue("businessCategory" as any, businessCategory as any);
    }
    if (!String((formValues as any).serviceAreaType || "").trim() && serviceAreaType) {
      form.setFieldValue("serviceAreaType" as any, serviceAreaType as any);
    }
    if (
      (!Array.isArray((formValues as any).serviceAreas) || (formValues as any).serviceAreas.length === 0) &&
      serviceAreas.length > 0
    ) {
      form.setFieldValue("serviceAreas" as any, serviceAreas as any);
    }
    if (!String(formValues.primaryLocation || "").trim() && primaryLocation) {
      form.setFieldValue("primaryLocation", primaryLocation);
    } else if (primaryLocation) {
      const current = String(formValues.primaryLocation || "");
      const currentIsValid = locationOptions.some(
        (opt) => !opt.disabled && opt.value !== "" && opt.value === current
      );
      if (!currentIsValid && primaryLocation !== current) {
        form.setFieldValue("primaryLocation", primaryLocation);
      }
    }
    if (!String(formValues.serviceType || "").trim() && serviceType) form.setFieldValue("serviceType", serviceType as any);

    const ltvFromBusiness = profileAny?.LTV ?? profileAny?.ltv;
    const ltvFromJob = (jobDetails as any)?.ltv;
    const ltv = ltvFromBusiness ?? ltvFromJob;
    const ltvStr = ltv != null ? String(ltv).trim().toLowerCase() : "";
    const ltvValue = ltvStr === "high" || ltvStr === "low" ? ltvStr : "";
    if ((formValues.lifetimeValue == null || String(formValues.lifetimeValue).trim() === "") && ltvValue) {
      form.setFieldValue("lifetimeValue", ltvValue as any);
    }
    if (!String((formValues as any).b2bB2c || "").trim()) {
      const b2bB2c = String(profileAny?.B2bB2c || profileAny?.b2b_b2c || (jobDetails as any)?.b2b_b2c || "").trim();
      if (b2bB2c) form.setFieldValue("b2bB2c" as any, b2bB2c as any);
    }
    if (!String((formValues as any).segment || "").trim()) {
      const segment = String(profileAny?.Segment ?? profileAny?.segment ?? (jobDetails as any)?.segment ?? "").trim();
      if (segment) form.setFieldValue("segment" as any, segment as any);
    }

    if (!String(formValues.offerings || "").trim()) form.setFieldValue("offerings", offerings as any);
    if (!hasAnyOfferingRow && offeringsList.length > 0) form.setFieldValue("offeringsList", offeringsList as any);
    const currentBrandTerms = Array.isArray(formValues.brandTerms)
      ? formValues.brandTerms
      : [];
    if (currentBrandTerms.length === 0 && Array.isArray(brandTerms) && brandTerms.length > 0) {
      form.setFieldValue("brandTerms", brandTerms as any);
    }
    if (!String(formValues.usps || "").trim() && usps) form.setFieldValue("usps", usps as any);
    if ((!Array.isArray(formValues.ctas) || formValues.ctas.length === 0) && ctas.length > 0) {
      form.setFieldValue("ctas", ctas as any);
    }
    if ((!Array.isArray(formValues.stakeholders) || formValues.stakeholders.length === 0) && stakeholders.length > 0) {
      form.setFieldValue("stakeholders", stakeholders as any);
    }
    if ((!Array.isArray(formValues.locations) || formValues.locations.length === 0) && businessLocations.length > 0) {
      form.setFieldValue("locations", businessLocations as any);
    }
    const copyArrayIfEmpty = (fieldName: string, raw: unknown) => {
      const current = (formValues as any)[fieldName];
      const next = normalizeArray(raw);
      if ((!Array.isArray(current) || current.length === 0) && next.length > 0) {
        form.setFieldValue(fieldName as any, next as any);
      }
    };
    copyArrayIfEmpty("detailedLocations", profileAny?.DetailedLocations);
    copyArrayIfEmpty("keyPeople", profileAny?.KeyPeople);
    copyArrayIfEmpty("licensesCompliance", profileAny?.LicensesCompliance);
    copyArrayIfEmpty("awardsCertifications", profileAny?.AwardsCertifications);
    copyArrayIfEmpty("testimonials", profileAny?.Testimonials);
    copyArrayIfEmpty("imagePhotoLibrary", profileAny?.ImagePhotoLibrary);
    copyArrayIfEmpty("socialProfiles", profileAny?.SocialProfiles);
    copyArrayIfEmpty("directoryProfiles", profileAny?.DirectoryProfiles);
    if (!String((formValues as any).reviewRating || "").trim() && profileAny?.ReviewRating) form.setFieldValue("reviewRating" as any, String(profileAny.ReviewRating) as any);
    if (!String((formValues as any).reviewCount || "").trim() && profileAny?.ReviewCount) form.setFieldValue("reviewCount" as any, String(profileAny.ReviewCount) as any);
    if (!String((formValues as any).colorsFontsCss || "").trim() && profileAny?.ColorsFontsCss) form.setFieldValue("colorsFontsCss" as any, String(profileAny.ColorsFontsCss) as any);
    if (!String((formValues as any).supportEmail || "").trim() && profileAny?.SupportEmail) form.setFieldValue("supportEmail" as any, String(profileAny.SupportEmail) as any);
    if (!String((formValues as any).commsEmail || "").trim() && profileAny?.CommsEmail) form.setFieldValue("commsEmail" as any, String(profileAny.CommsEmail) as any);
    if ((!Array.isArray(formValues.competitors) || formValues.competitors.length === 0) && competitors.length > 0) {
      form.setFieldValue("competitors", competitors as any);
    }
    if ((!Array.isArray(formValues.brandToneSocial) || formValues.brandToneSocial.length === 0) && brandToneSocial.length > 0) {
      form.setFieldValue("brandToneSocial", brandToneSocial as any);
    }
    if ((!Array.isArray(formValues.brandToneWeb) || formValues.brandToneWeb.length === 0) && brandToneWeb.length > 0) {
      form.setFieldValue("brandToneWeb", brandToneWeb as any);
    }
  }, [businessId, form, formValues, jobQuery.data, jobQuery.isFetched, locationOptions, locationsLoading, profileData, profileDataLoading]);

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

  const isLoading = isSavingBusiness || isSavingJob || isAutofillLoading;
  const loadingMessage = React.useMemo(() => {
    if (isAutofillLoading) return "Autofilling profile...";
    if (isSavingJob) return "Saving job...";
    if (isSavingBusiness) return "Saving business...";
    return undefined;
  }, [isAutofillLoading, isSavingBusiness, isSavingJob]);

  const handleConfirmAndProceed = React.useCallback(async () => {
    await form.handleSubmit();
    if (businessId) {
      router.push(`/pitches/${businessId}/strategy`);
    }
  }, [businessId, form, router]);

  const handleConvertToBusiness = React.useCallback(async () => {
    if (!guardConvertPitch()) return;
    if (!businessId) return;

    await convertPitchMutation.mutateAsync({ businessId });
    setIsConvertConfirmOpen(false);
    router.push(`/business/${businessId}/profile`);
  }, [businessId, convertPitchMutation, guardConvertPitch, router]);

  return (
    <div className="flex flex-col h-dvh max-h-dvh min-h-0 relative overflow-hidden">
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
                <ProfileFormTabs
                  form={form}
                  businessId={businessId ?? null}
                  value={profileTab}
                  onValueChange={setProfileTab}
                  disableWebsiteLock
                  primaryLocationAction={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={handleAutofillProfile}
                            disabled={
                              isAutofillLoading ||
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
                        </span>
                      </TooltipTrigger>
                      {!(formValues?.website ?? "").toString().trim() ? (
                        <TooltipContent>Enter Website URL to proceed</TooltipContent>
                      ) : null}
                    </Tooltip>
                  }
                  rightAction={
                    <div className="flex items-center gap-2">
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
                      <Button
                        type="button"
                        className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                        onClick={handleConfirmAndProceed}
                        disabled={!canConfirmAndProceed || isSubmitting || isLoading || convertPitchMutation.isPending}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Confirm and proceed to Strategy"
                        )}
                      </Button>
                    </div>
                  }
                />
              </form>
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
