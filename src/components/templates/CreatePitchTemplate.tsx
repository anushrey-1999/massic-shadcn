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
import ProfileSidebar from "@/components/organisms/ProfileSidebar";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { LoaderOverlay } from "@/components/ui/loader";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { cleanWebsiteUrl } from "@/utils/utils";

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
    lifetimeValue: "",
    offerings: "",
    offeringsList: [],
    brandTerms: "",
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

  const canConfirmAndProceed =
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
              <BusinessInfoForm
                form={form}
                disableWebsiteLock
                headerAction={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutofillProfile}
                          disabled={
                            isAutofillLoading ||
                            !(formValues?.website ?? "").toString().trim()
                          }
                          className="gap-2"
                        >
                          {isAutofillLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Autofilling...
                            </>
                          ) : (
                            "Autofill profile"
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(isAutofillLoading || !(formValues?.website ?? "").toString().trim()) && (
                      <TooltipContent>
                        Fill website URL to enable button
                      </TooltipContent>
                    )}
                  </Tooltip>
                }
              />
              <OfferingsForm
                form={form}
                businessId="create-pitch"
              />
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
