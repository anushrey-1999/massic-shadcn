"use client";

import React from "react";
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
import { useCreateJob, useJobByBusinessId, useUpdateJob, type Offering, type BusinessProfilePayload } from "@/hooks/use-jobs";

import PageHeader from "@/components/molecules/PageHeader";
import ProfileSidebar from "@/components/organisms/ProfileSidebar";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { LoaderOverlay } from "@/components/ui/loader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

const sections = [
  { id: "business-info", label: "Business Info" },
  { id: "offerings", label: "Offerings" },
];

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

function normalizeRecurring(raw: unknown): "yes" | "no" | "partial" | "" {
  if (raw === null || raw === undefined) return "";
  if (raw === true) return "yes";
  if (raw === false) return "no";

  const s = String(raw).trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
  if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
  if (s === "partial" || s === "partially" || s === "sometimes") return "partial";
  return "";
}

export function PitchProfileTemplate() {
  const router = useRouter();
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;

  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const activeSection = useBusinessStore((state) => state.profileForm.activeSection);
  const setActiveSection = useBusinessStore((state) => state.setActiveSection);
  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const resetProfileForm = useBusinessStore((state) => state.resetProfileForm);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId ?? null);
  const updateBusinessProfileMutation = useUpdateBusinessProfile(businessId ?? null);

  const jobQuery = useJobByBusinessId(businessId ?? null);
  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();

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
      recurringRevenue: "",
      avgOrderValue: "",
      lifetimeValue: "",
      serviceType: "" as any,
      offerings: "" as any,
      offeringsList: [],
      brandTerms: "",
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

      const brandTermsArray = String(value.brandTerms || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

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
        RecurringFlag: value.recurringRevenue || null,
        AOV: value.avgOrderValue ?? null,
        LTV: value.lifetimeValue ?? null,
        BrandTerms: brandTermsArray.length > 0 ? brandTermsArray : null,
      };

      await updateBusinessProfileMutation.mutateAsync(businessProfilePayload);

      const jobDetails = jobQuery.data;
      const jobExists = Boolean(jobDetails && jobDetails.job_id);

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

      toast.success("Profile updated");
    },
  });

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
        return raw.map((t) => String(t).trim()).filter(Boolean).join(", ");
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((t) => String(t).trim()).filter(Boolean).join(", ");
          }
        } catch {
          // ignore
        }
        return raw;
      }
      return "";
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

    const recurringFlag = normalizeRecurring(
      profileAny?.RecurringFlag ??
        profileAny?.recurring_flag ??
        profileAny?.recurringFlag ??
        profileAny?.RecurringRevenue ??
        profileAny?.recurringRevenue ??
        (jobDetails as any)?.recurring_flag ??
        (jobDetails as any)?.recurringFlag ??
        (jobDetails as any)?.recurring_revenue
    );
    if (!String(formValues.recurringRevenue || "").trim() && recurringFlag) {
      form.setFieldValue("recurringRevenue", recurringFlag);
    }

    const aovFromBusiness = profileAny?.AOV ?? profileAny?.aov;
    const aovFromJob = (jobDetails as any)?.aov;
    const aov = aovFromBusiness ?? aovFromJob;
    const aovStr =
      typeof aov === "number" && Number.isFinite(aov) ? String(aov) : aov ? String(aov) : "";
    if ((formValues.avgOrderValue == null || String(formValues.avgOrderValue).trim() === "") && aovStr) {
      form.setFieldValue("avgOrderValue", aovStr as any);
    }

    const ltvFromBusiness = profileAny?.LTV ?? profileAny?.ltv;
    const ltvFromJob = (jobDetails as any)?.ltv;
    const ltv = ltvFromBusiness ?? ltvFromJob;
    const ltvStr =
      typeof ltv === "number" && Number.isFinite(ltv) ? String(ltv) : ltv ? String(ltv) : "";
    if ((formValues.lifetimeValue == null || String(formValues.lifetimeValue).trim() === "") && ltvStr) {
      form.setFieldValue("lifetimeValue", ltvStr as any);
    }

    if (!String(formValues.offerings || "").trim()) form.setFieldValue("offerings", offerings as any);
    if (!hasAnyOfferingRow && offeringsList.length > 0) form.setFieldValue("offeringsList", offeringsList as any);
    if (!String(formValues.brandTerms || "").trim() && String(brandTerms || "").trim()) {
      form.setFieldValue("brandTerms", String(brandTerms).trim() as any);
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

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
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

  const hasRecurringRevenue = React.useMemo(() => {
    return Boolean((formValues.recurringRevenue ?? "").toString().trim());
  }, [formValues.recurringRevenue]);

  const completionPercentage = React.useMemo(() => {
    const totalFields = 10;
    let filledFields = 0;

    if (String(formValues.website ?? "").trim()) filledFields++;
    if (String(formValues.businessName ?? "").trim()) filledFields++;
    if (String(formValues.primaryLocation ?? "").trim()) filledFields++;
    if (String(formValues.recurringRevenue ?? "").trim()) filledFields++;
    if (String(formValues.serviceType ?? "").trim()) filledFields++;
    if (String(formValues.offerings ?? "").trim()) filledFields++;
    if (hasAtLeastOneOffering) filledFields++;

    if (String(formValues.businessDescription ?? "").trim()) filledFields++;

    if (formValues.avgOrderValue != null && formValues.avgOrderValue !== "") {
      const avgOrderValueStr =
        typeof formValues.avgOrderValue === "string"
          ? formValues.avgOrderValue.trim()
          : String(formValues.avgOrderValue);
      if (avgOrderValueStr) filledFields++;
    }

    if (formValues.lifetimeValue != null && formValues.lifetimeValue !== "") {
      const lifetimeValueStr =
        typeof formValues.lifetimeValue === "string"
          ? formValues.lifetimeValue.trim()
          : String(formValues.lifetimeValue);
      if (lifetimeValueStr) filledFields++;
    }

    const percentage = Math.round((filledFields / totalFields) * 100);
    return Math.max(0, Math.min(100, percentage));
  }, [
    formValues.avgOrderValue,
    formValues.businessDescription,
    formValues.businessName,
    formValues.lifetimeValue,
    formValues.offerings,
    formValues.primaryLocation,
    formValues.recurringRevenue,
    formValues.serviceType,
    formValues.website,
    hasAtLeastOneOffering,
  ]);

  const canConfirmAndProceed =
    !hasSchemaValidationErrors &&
    !hasOfferingsValidationErrors &&
    hasRecurringRevenue &&
    hasAtLeastOneOffering;

  const isSavingBusiness = updateBusinessProfileMutation.isPending;
  const isSavingJob = createJobMutation.isPending || updateJobMutation.isPending;
  const isSubmitting = useStore(form.store, (state: any) => state.isSubmitting === true);

  const isLoading = isSavingBusiness || isSavingJob;
  const loadingMessage = React.useMemo(() => {
    if (isSavingJob) return "Saving job...";
    if (isSavingBusiness) return "Saving business...";
    return undefined;
  }, [isSavingBusiness, isSavingJob]);

  const handleConfirmAndProceed = React.useCallback(async () => {
    await form.handleSubmit();
  }, [form]);

  return (
    <div className="flex flex-col min-h-full">
      <LoaderOverlay isLoading={isLoading} message={loadingMessage}>
        <div className="sticky top-0 z-10">
          <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
        </div>

        <div className="w-full max-w-[1224px] flex gap-6 p-5 items-start">
          <ProfileSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            completionPercentage={completionPercentage}
            buttonText="Save"
            onButtonClick={handleConfirmAndProceed}
            buttonDisabled={!canConfirmAndProceed || isSubmitting || isLoading}
            buttonHelperText={
              !canConfirmAndProceed
                ? "Fill all required fields to enable confirmation."
                : undefined
            }
          />

          <div className="flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <BusinessInfoForm form={form} disableWebsiteLock />
              <OfferingsForm form={form} businessId={businessId ?? null} />
              <Card
                variant="profileCard"
                className="py-6 px-4 bg-white border-none mt-6"
              >
                <CardHeader className="pb-4">
                  <CardTitle>
                    <Typography variant="h4">Brand Terms</Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Card variant="profileCard">
                    <CardHeader>
                      <CardTitle>
                        <FieldLabel className="gap-0">
                          Brand terms that best describe your business
                        </FieldLabel>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form.Field
                        name="brandTerms"
                        children={(field: any) => (
                          <Input
                            variant="noBorder"
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="List the words, separating each one with a comma"
                            className="w-full"
                          />
                        )}
                      />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}

