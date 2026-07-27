"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocations } from "@/hooks/use-locations";
import {
  useCreateBusiness,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import { api } from "@/hooks/use-api";
import {
  useCreateJob,
  type BusinessProfilePayload,
} from "@/hooks/use-jobs";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { useRoleGuard } from "@/hooks/use-permissions";
import { ACCOUNT_ROLES } from "@/lib/permissions";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";
import {
  buildBusinessProfilePayload,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import type { NormalizedProfileResult } from "@/utils/profile-result";

type FormData = BusinessInfoFormData;
const formFieldNames = [
  "website",
  "businessName",
  "primaryLocation",
  "serviceType",
  "offerings",
] as const;

const updateCreatedBusinessProfile = async (
  businessId: string,
  createdBusiness: BusinessProfile | null,
  payload: BusinessProfilePayload
) => {
  await api.post(
    "/profile/update-business-profile",
    "node",
    {
      ...(createdBusiness ?? {}),
      ...payload,
      UniqueId: businessId,
    }
  );
};

export default function CreateBusinessPage() {
  const allowed = useRoleGuard({
    allowedRoles: [ACCOUNT_ROLES.OWNER, ACCOUNT_ROLES.ADMIN],
    fallbackPath: "/settings",
  });
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();
  const offeringsExtractor = useOfferingsExtractor("create-business");
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const setLocationOptions = useBusinessStore((state) => state.setLocationOptions);
  const setLocationsLoading = useBusinessStore((state) => state.setLocationsLoading);
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: {
      onChange: businessInfoSchema as any,
    },
  });

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [locationOptions, locationsLoading, setLocationOptions, setLocationsLoading]);

  const handleSubmitCreate = useCallback(async (options?: {
    values?: FormData;
    autofillData?: NormalizedProfileResult | null;
  }) => {
    if (offeringsExtractor.isExtracting) {
      toast.error("Please wait for offerings extraction to finish.");
      return;
    }

    const values = options?.values ?? (form.state.values as FormData);
    const activeAutofillData = options?.autofillData ?? null;
    const validation = businessInfoSchema.safeParse(values);

    formFieldNames.forEach((fieldName) => {
      const fieldIssue = validation.success
        ? undefined
        : validation.error.issues.find((issue) => issue.path[0] === fieldName);

      form.setFieldMeta(fieldName, (prev: any) => ({
        ...prev,
        isTouched: true,
        isValid: !fieldIssue,
        errors: fieldIssue ? [{ message: fieldIssue.message }] : [],
        errorMap: fieldIssue
          ? {
            onChange: [{ message: fieldIssue.message }],
          }
          : {},
        hasValidationErrors: Boolean(fieldIssue),
      }));
    });

    if (!validation.success) {
      toast.error("Please fix the highlighted fields before creating your business.");
      return;
    }

    try {
      const result = await createBusiness.mutateAsync({
        website: values.website,
        businessName: values.businessName,
        primaryLocation: values.primaryLocation,
        serveCustomers:
          values.serviceType === "physical"
            ? "local"
            : values.serviceType === "both"
              ? "both"
              : "online",
        offerType: values.offerings,
      });

      await refetchBusinessProfiles();

      const businessId = result?.createdBusiness?.UniqueId;
      if (businessId) {
        const formOfferings = Array.isArray(values.offeringsList)
          ? values.offeringsList
            .filter((row: any) => Boolean(row?.name?.trim()))
            .map((row: any) => ({
              name: String(row.name || ""),
              description: String(row.description || ""),
              link: String(row.link || ""),
              offering_type: String((row as any).offeringType || ""),
              price_range: String((row as any).priceRange || row.pricePositioning || ""),
              duration: String((row as any).duration || ""),
              inclusions: Array.isArray((row as any).inclusions)
                ? (row as any).inclusions
                : typeof (row as any).inclusions === "string"
                  ? (row as any).inclusions
                  : [],
            }))
          : [];
        const offerings = formOfferings;
        const businessProfilePayload = buildBusinessProfilePayload(values, {
          autofillResult: activeAutofillData,
          locationOptions,
          normalizeWebsite: true,
          ctasMode: "wrapped-json",
        });

        await updateCreatedBusinessProfile(
          businessId,
          result.createdBusiness,
          businessProfilePayload
        );

        await createJob.mutateAsync({
          businessId,
          businessProfilePayload,
          offerings,
        });

        await refetchBusinessProfiles();

        router.push(`/business/${businessId}/profile`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to finish business setup:", error);
      toast.error("Failed to finish business setup", {
        description: "Please try again before continuing.",
      });
    }
  }, [
    form,
    createBusiness,
    createJob,
    refetchBusinessProfiles,
    router,
    offeringsExtractor.isExtracting,
    locationOptions,
  ]);

  const { autofillProfile: handleAutofillProfile, autofillProfileResult, isAutofillLoading } =
    useProfileAutofillForm({
      form,
      locationOptions,
      normalizeWebsite: true,
      onBeforeAutofill: (website) => {
        offeringsExtractor.clearExtraction();
        void offeringsExtractor.startExtraction(website).catch(() => {});
      },
      onAutofillSuccess: async (profile, nextValues) => {
        formFieldNames.forEach((fieldName) => {
          form.setFieldMeta(fieldName, (prev: any) => ({
            ...prev,
            isTouched: false,
            isValid: true,
            errors: [],
            errorMap: {},
            hasValidationErrors: false,
          }));
        });
        setHasAutofilledProfile(true);
      },
    });

  const handleCancel = () => {
    router.push("/");
  };

  if (!allowed) return null;

  return (
    <CreateBusinessTemplate
      form={form}
      locationOptions={locationOptions}
      locationsLoading={locationsLoading}
      isSubmitting={form.state.isSubmitting}
      isPending={createBusiness.isPending || createJob.isPending}
      isAutofillLoading={isAutofillLoading}
      offeringsExtractor={offeringsExtractor}
      hasAutofilledProfile={hasAutofilledProfile}
      onAutofillProfile={() => {
        void handleAutofillProfile();
      }}
      onSubmitCreate={() => handleSubmitCreate({ autofillData: autofillProfileResult })}
      onCancel={handleCancel}
    />
  );
}
