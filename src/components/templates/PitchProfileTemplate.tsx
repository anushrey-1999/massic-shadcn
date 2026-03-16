"use client";

import React, { useCallback, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
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
import { useCreateJob, useJobByBusinessId, useUpdateJob, type Offering, type BusinessProfilePayload } from "@/hooks/use-jobs";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { LoaderOverlay } from "@/components/ui/loader";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { Loader2 } from "lucide-react";
import { cleanWebsiteUrl } from "@/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TagsInput } from "@/components/ui/tags-input";
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

interface ProfileAutofillResponse {
  business_url?: string;
  profile_autofill?: {
    url?: string;
    market?: string;
    ltv?: string;
    sell?: string;
    b2b_b2c?: string;
    competitors?: string[];
    segment?: number;
  };
  errors?: string | string[] | null;
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

  const [isAutofillLoading, setIsAutofillLoading] = useState(false);
  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);

  React.useEffect(() => {
    resetProfileForm();
    return () => resetProfileForm();
  }, [resetProfileForm]);

  React.useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [locationOptions, locationsLoading, setLocationOptions, setLocationsLoading]);

  const defaultValues = React.useMemo(() => {
    return {
      website: "",
      businessName: "",
      businessDescription: "",
      primaryLocation: "",
      lifetimeValue: "",
      serviceType: "" as any,
      offerings: "" as any,
      offeringsList: [],
      brandTerms: [],
    } as unknown as BusinessInfoFormData;
  }, []);

  const form = useForm({
    defaultValues,
    validators: {
      onChange: businessInfoSchema,
    },
    onSubmit: async ({ value }) => {
      if (!businessId) return;

      const normalizedOfferType: "products" | "services" =
        value.offerings === "products" ? "products" : "services";

      const normalizedServeCustomers: "local" | "online" =
        value.serviceType === "physical" ? "local" : "online";

      const locationParts = String(value.primaryLocation || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const country =
        locationParts.length >= 2
          ? locationParts[locationParts.length - 1]
          : "united states";

      const location =
        locationParts.length >= 2
          ? locationParts.slice(0, -1).join(", ")
          : locationParts[0] || "";

      const offerings: Offering[] = Array.isArray(value.offeringsList)
        ? value.offeringsList
            .filter((row) => Boolean(row?.name?.trim()))
            .map((row) => ({
              name: String(row.name || ""),
              description: String(row.description || ""),
              link: String(row.link || ""),
            }))
        : [];

      const brandTermsArray = Array.isArray(value.brandTerms)
        ? value.brandTerms.map((t) => String(t).trim()).filter(Boolean)
        : [];

      const businessProfilePayload: BusinessProfilePayload = {
        Website: value.website,
        Name: value.businessName,
        Description: value.businessDescription,
        UserDefinedBusinessDescription: value.businessDescription,
        PrimaryLocation: {
          Location: location,
          Country: country,
        },
        BusinessObjective: normalizedServeCustomers,
        LocationType: normalizedOfferType,
        LTV:
          value.lifetimeValue === "high" ||
          value.lifetimeValue === "low"
            ? value.lifetimeValue
            : null,
        BrandTerms: brandTermsArray.length > 0 ? brandTermsArray : null,
      };

      // Inputs for some business metrics were removed from the UI, but the backend may still return them.
      // Preserve any existing non-editable fields by merging current profile data into the update payload.
      const payloadForUpdate: BusinessProfilePayload = profileData
        ? ({ ...(profileData as any), ...(businessProfilePayload as any) } as any)
        : businessProfilePayload;

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

      toast.success("Profile updated");
    },
  });

  const handleAutofillProfile = useCallback(async () => {
    const values = form.state.values as BusinessInfoFormData;
    const website = cleanWebsiteUrl(values?.website || "").trim();
    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }
    setIsAutofillLoading(true);
    try {
      const res = await api.post<ProfileAutofillResponse>(
        "/profile-autofill",
        "python",
        { business_url: website },
        { timeout: 120000 }
      );
      if (res?.errors) {
        toast.error("Failed to autofill profile");
        return;
      }
      const pa = res?.profile_autofill;
      if (!pa) return;

      const market = (pa.market ?? "").toLowerCase();
      if (market === "local" || market === "online") {
        form.setFieldValue(
          "serviceType" as any,
          (market === "local" ? "physical" : "online") as any
        );
      }

      const sell = (pa.sell ?? "products").toLowerCase();
      const nextOfferings =
        sell === "services"
          ? "services"
          : sell === "both"
            ? "both"
            : "products";
      form.setFieldValue("offerings" as any, nextOfferings as any);

      const ltvFromAutofill = (pa.ltv ?? "").toString().trim().toLowerCase();
      if (ltvFromAutofill === "high" || ltvFromAutofill === "low") {
        form.setFieldValue("lifetimeValue" as any, ltvFromAutofill as any);
      }

      toast.success("Profile fields updated from website");
    } catch {
      toast.error("Failed to autofill profile");
    } finally {
      setIsAutofillLoading(false);
    }
  }, [form]);

  const formValues = useStore(form.store, (state: any) => state.values) as BusinessInfoFormData;

  React.useEffect(() => {
    if (!businessId) return;
    if (profileDataLoading) return;
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
    const primaryLocation =
      toPrimaryLocationString(profileAny?.PrimaryLocation) ||
      String(profileData?.Locations?.[0] ? (profileData.Locations[0] as any)?.Name || "" : "").trim() ||
      (() => {
        const loc = String((jobDetails as any)?.location || "").trim();
        const country = String((jobDetails as any)?.country || "").trim();
        if (!loc && !country) return "";
        if (loc && country && country.toLowerCase() !== loc.toLowerCase()) return `${loc},${country}`;
        return loc || country;
      })();

    const businessObjective = String(
      profileData?.BusinessObjective || (jobDetails as any)?.serve || ""
    )
      .toLowerCase()
      .trim();
    const serviceType =
      businessObjective === "local" ? "physical" : businessObjective === "online" ? "online" : "";

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

    if (!String(formValues.website || "").trim() && website) form.setFieldValue("website", website);
    if (!String(formValues.businessName || "").trim() && businessName) form.setFieldValue("businessName", businessName);
    if (!String(formValues.businessDescription || "").trim() && businessDescription) {
      form.setFieldValue("businessDescription", businessDescription);
    }
    if (!String(formValues.primaryLocation || "").trim() && primaryLocation) {
      form.setFieldValue("primaryLocation", primaryLocation);
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

    if (!String(formValues.offerings || "").trim()) form.setFieldValue("offerings", offerings as any);
    if (!hasAnyOfferingRow && offeringsList.length > 0) form.setFieldValue("offeringsList", offeringsList as any);
    const currentBrandTerms = Array.isArray(formValues.brandTerms)
      ? formValues.brandTerms
      : [];
    if (currentBrandTerms.length === 0 && Array.isArray(brandTerms) && brandTerms.length > 0) {
      form.setFieldValue("brandTerms", brandTerms as any);
    }
  }, [businessId, form, formValues, jobQuery.data, jobQuery.isFetched, profileData, profileDataLoading]);

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
  }, [form]);

  const handleConvertToBusiness = React.useCallback(async () => {
    if (!businessId) return;

    await convertPitchMutation.mutateAsync({ businessId });
    setIsConvertConfirmOpen(false);
    router.push(`/business/${businessId}/profile`);
  }, [businessId, convertPitchMutation, router]);

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
                <ProfileStepCard
                  title="Basic Details"
                  description="Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business."
                  className="flex-1"
                  scrollableContent
                  contentClassName="pb-6"
                  rightAction={
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-general-border-three text-general-foreground"
                        onClick={() => setIsConvertConfirmOpen(true)}
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
                          "Save"
                        )}
                      </Button>
                    </div>
                  }
                >
                  <BusinessInfoForm
                    form={form}
                    embedded
                    embeddedVariant="full"
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
                                !(formValues?.website ?? "").toString().trim()
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
                  />
                  <OfferingsForm
                    form={form}
                    businessId={businessId ?? null}
                    embedded
                  />
                  <div className="w-full md:w-3/4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        Brand terms that best describe your business
                      </div>
                      <form.Field
                        name="brandTerms"
                        children={(field: any) => {
                          const currentValue = Array.isArray(field.state.value)
                            ? field.state.value
                            : [];
                          return (
                            <TagsInput
                              value={currentValue}
                              onChange={(next) => field.handleChange(next)}
                              placeholder="Type a term and press Enter"
                            />
                          );
                        }}
                      />
                    </div>
                  </div>
                </ProfileStepCard>
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
