"use client";

import React, { useCallback, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLocations } from "@/hooks/use-locations";
import { useBusinessStore } from "@/store/business-store";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useCreateBusiness, useBusinessProfiles, fetchPitchBusinessProfiles } from "@/hooks/use-business-profiles";
import { useCreateJob, type Offering, type BusinessProfilePayload } from "@/hooks/use-jobs";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { LoaderOverlay } from "@/components/ui/loader";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import { cleanWebsiteUrl } from "@/utils/utils";
import { getAutofillErrorMessage } from "@/utils/profile-autofill";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { TagsInput } from "@/components/ui/tags-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProfileAutofillResponse {
  business_url?: string;
  profile_autofill?: {
    business_name?: string;
    url?: string;
    market?: string;
    ltv?: string;
    sell?: string;
    b2b_b2c?: string;
    competitors?: string[];
    segment?: number;
    ctas?: Array<{ text?: string; url?: string }>;
    brand_terms?: string[];
    web_tone?: string[];
    social_tone?: string[];
    error?: string | null;
    reason?: string | null;
    recommendation?: string | null;
    [key: string]: unknown;
  };
  errors?: string | string[] | null;
  error?: string | null;
  message?: string | null;
  detail?: string | null;
}

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const { user } = useAuthStore();

  const createBusiness = useCreateBusiness();
  const createJobMutation = useCreateJob();
  const { refetchBusinessProfiles } = useBusinessProfiles();

  const offeringsExtractor = useOfferingsExtractor("create-pitch");

  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const resetProfileForm = useBusinessStore((state) => state.resetProfileForm);

  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  React.useEffect(() => {
    resetProfileForm();
    return () => resetProfileForm();
  }, [resetProfileForm]);

  React.useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [locationOptions, locationsLoading, setLocationOptions, setLocationsLoading]);

  const defaultValues = {
    website: "",
    businessName: "",
    businessDescription: "",
    primaryLocation: "",
    serviceType: "",
    lifetimeValue: "",
    offerings: "",
    offeringsList: [],
    brandTerms: [],
  } as unknown as BusinessInfoFormData;

  const form = useForm({
    defaultValues,
    validators: {
      onChange: businessInfoSchema,
    },
    onSubmit: async ({ value }) => {
      const normalizedOfferType: "products" | "services" =
        value.offerings === "products" ? "products" : "services";

      const normalizedServeCustomers: "local" | "online" =
        value.serviceType === "physical" ? "local" : "online";

      const result = await createBusiness.mutateAsync({
        website: value.website,
        businessName: value.businessName,
        primaryLocation: value.primaryLocation,
        serveCustomers: normalizedServeCustomers,
        offerType: normalizedOfferType,
        isPitch: true, // Mark this business as created from pitch flow
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
          value.lifetimeValue === "high" || value.lifetimeValue === "low"
            ? value.lifetimeValue
            : null,
        BrandTerms: brandTermsArray.length > 0 ? brandTermsArray : null,
      };

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

  const [isAutofillLoading, setIsAutofillLoading] = useState(false);

  const handleAutofillProfile = useCallback(async () => {
    const values = form.state.values as BusinessInfoFormData;
    const website = cleanWebsiteUrl(values?.website || "").trim();
    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }
    setIsAutofillLoading(true);
    // Start offerings extraction in parallel (same click as Profile Autofill)
    // Do not await here so Profile Autofill UX isn't blocked.
    void offeringsExtractor.startExtraction(website).catch(() => {});
    try {
      const res = await api.post<ProfileAutofillResponse>(
        "/tools/autofill-profile",
        "python",
        { business_url: website },
        { timeout: 120000 }
      );
      const autofillErrorMessage = getAutofillErrorMessage(res, "");
      if (autofillErrorMessage) {
        toast.error(autofillErrorMessage);
        return;
      }
      const pa = res?.profile_autofill;
      if (!pa) {
        const fallbackMessage = String(res?.message ?? res?.detail ?? "").trim();
        toast.error(fallbackMessage || "Failed to autofill profile");
        return;
      }

      const ensureHttpsUrl = (raw: unknown): string => {
        const s = String(raw ?? "")
          .replace(/^sc-domain:/i, "")
          .trim();
        if (!s) return "";
        if (/^(tel:|mailto:)/i.test(s)) return s;
        if (/^https?:\/\//i.test(s)) {
          return s.replace(/^http:\/\//i, "https://");
        }
        return `https://${s}`;
      };

      const nextWebsite = (() => {
        const raw = pa.url || res?.business_url || website;
        return cleanWebsiteUrl(String(raw ?? ""));
      })();
      if (nextWebsite) {
        form.setFieldValue("website" as any, nextWebsite as any);
      }

      const nextBusinessName = String(pa.business_name ?? "").trim();
      if (nextBusinessName) {
        form.setFieldValue("businessName" as any, nextBusinessName as any);
      }

      const market = (pa.market ?? "").toString().trim().toLowerCase();
      const nextServiceType =
        market === "online"
          ? "online"
          : market === "local"
            ? "physical"
            : market === "hybrid"
              ? "both"
              : undefined;
      if (nextServiceType) {
        form.setFieldValue("serviceType" as any, nextServiceType as any);
      }

      const ltvFromAutofill = (pa.ltv ?? "").toString().trim().toLowerCase();
      form.setFieldValue(
        "lifetimeValue" as any,
        (ltvFromAutofill === "high" || ltvFromAutofill === "low"
          ? ltvFromAutofill
          : "") as any
      );

      const sell = (pa.sell ?? "products").toString().trim().toLowerCase();
      const nextOfferings =
        sell === "services"
          ? "services"
          : sell === "both"
            ? "both"
            : "products";
      form.setFieldValue("offerings" as any, nextOfferings as any);

      const competitorsFromApi = Array.isArray(pa.competitors)
        ? pa.competitors
          .filter((url): url is string => Boolean(url && String(url).trim()))
          .map((url) => cleanWebsiteUrl(String(url)))
          .filter(Boolean)
        : [];
      form.setFieldValue(
        "competitors" as any,
        competitorsFromApi.map((url) => ({ url })) as any
      );

      const ctasFromApi = Array.isArray(pa.ctas)
        ? pa.ctas
          .map((cta) => ({
            buttonText: String(cta?.text ?? "").trim(),
            url: ensureHttpsUrl(cta?.url),
          }))
          .filter((cta) => Boolean(cta.buttonText && cta.url))
        : [];
      form.setFieldValue("ctas" as any, ctasFromApi as any);

      const brandTermsFromApi = Array.isArray(pa.brand_terms)
        ? pa.brand_terms.map((t) => String(t).trim()).filter(Boolean)
        : [];
      form.setFieldValue("brandTerms" as any, brandTermsFromApi as any);

      const allowedToneOptions = new Set([
        "professional",
        "bold",
        "friendly",
        "innovative",
        "playful",
        "trustworthy",
      ]);
      const normalizeTones = (raw: unknown): string[] => {
        if (!Array.isArray(raw)) return [];
        return raw
          .map((v) => String(v).toLowerCase().trim())
          .filter((v) => allowedToneOptions.has(v))
          .slice(0, 3);
      };
      form.setFieldValue("brandToneWeb" as any, normalizeTones(pa.web_tone) as any);
      form.setFieldValue(
        "brandToneSocial" as any,
        normalizeTones(pa.social_tone) as any
      );

      setHasAutofilledProfile(true);
      toast.success("Profile fields updated from website");
    } catch (error: any) {
      const fallbackMessage = String(
        error?.response?.data?.message ??
        error?.response?.data?.detail ??
        error?.message ??
        ""
      ).trim();
      toast.error(
        getAutofillErrorMessage(error?.response?.data ?? error, "") ||
        fallbackMessage ||
        "Failed to autofill profile"
      );
    } finally {
      setIsAutofillLoading(false);
    }
  }, [form, offeringsExtractor]);

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

  const hasSchemaValidationErrors = React.useMemo(() => {
    return !businessInfoSchema.safeParse(formValues).success;
  }, [formValues]);

  const hasAtLeastOneOffering = React.useMemo(() => {
    const list = Array.isArray(formValues.offeringsList) ? formValues.offeringsList : [];
    return list.some((row) => Boolean(row?.name?.trim()));
  }, [formValues.offeringsList]);

  const canConfirmAndProceed =
    hasAutofilledProfile &&
    !hasSchemaValidationErrors &&
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

  const handleConfirmAndProceed = React.useCallback(async () => {
    await form.handleSubmit();
  }, [form]);

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
                  title="Create Pitch"
                  description="Add basic details so we can generate a pitch and tailored recommendations."
                  className="flex-1"
                  scrollableContent
                  contentClassName="pb-6"
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
                      ) : (
                        "Confirm and Proceed"
                      )}
                    </Button>
                  }
                >
                  <BusinessInfoForm
                    form={form}
                    embedded
                    embeddedVariant="full"
                    disableWebsiteLock
                    disabledFields={
                      hasAutofilledProfile
                        ? undefined
                        : {
                            businessName: true,
                            serviceType: true,
                            lifetimeValue: true,
                          }
                    }
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
                                offeringsExtractor.isExtracting ||
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
                    businessId="create-pitch"
                    embedded
                    hideFetchOfferingsFromWebsite
                    extractionController={offeringsExtractor}
                    disabled={!hasAutofilledProfile}
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
                              disabled={!hasAutofilledProfile}
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
    </div>
  );
}
