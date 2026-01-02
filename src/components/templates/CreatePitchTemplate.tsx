"use client";

import React from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";

import { useLocations } from "@/hooks/use-locations";
import { useBusinessStore } from "@/store/business-store";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useCreateBusiness, useBusinessProfiles, fetchPitchBusinessProfiles } from "@/hooks/use-business-profiles";
import { useCreateJob, type Offering, type BusinessProfilePayload } from "@/hooks/use-jobs";

import PageHeader from "@/components/molecules/PageHeader";
import ProfileSidebar from "@/components/organisms/ProfileSidebar";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { LoaderOverlay } from "@/components/ui/loader";
import { useAuthStore } from "@/store/auth-store";

const sections = [
  { id: "business-info", label: "Business Info" },
  { id: "offerings", label: "Offerings" },
];

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const { user } = useAuthStore();

  const createBusiness = useCreateBusiness();
  const createJobMutation = useCreateJob();
  const { refetchBusinessProfiles } = useBusinessProfiles();

  const activeSection = useBusinessStore((state) => state.profileForm.activeSection);
  const setActiveSection = useBusinessStore((state) => state.setActiveSection);
  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const resetProfileForm = useBusinessStore((state) => state.resetProfileForm);

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
    recurringRevenue: "",
    avgOrderValue: "",
    lifetimeValue: "",
    offerings: "",
    offeringsList: [],
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

      await createJobMutation.mutateAsync({
        businessId: createdBusinessId,
        businessProfilePayload,
        offerings,
      });

      router.push(`/pitches/${createdBusinessId}/reports`);
    },
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: "Create Pitch", href: "/pitches/create-pitch" },
  ];

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const isCreatingBusiness = createBusiness.isPending;
  const isCreatingJob = createJobMutation.isPending;
  const isSubmitting = useStore(form.store, (state: any) => state.isSubmitting === true);

  const isLoading = isCreatingBusiness || isCreatingJob;
  const loadingMessage = React.useMemo(() => {
    if (isCreatingJob) return "Creating job...";
    if (isCreatingBusiness) return "Creating business...";
    return undefined;
  }, [isCreatingBusiness, isCreatingJob]);

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
            buttonText="Confirm and Proceed"
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
              <OfferingsForm form={form} businessId="create-pitch" />
            </form>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}
