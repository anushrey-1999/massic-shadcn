"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocations } from "@/hooks/use-locations";
import {
  useCreateBusiness,
  useBusinessProfiles,
  updateCreatedBusinessProfileSafely,
} from "@/hooks/use-business-profiles";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import { useCreateJob, type BusinessProfilePayload } from "@/hooks/use-jobs";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { useRoleGuard } from "@/hooks/use-permissions";
import { ACCOUNT_ROLES } from "@/lib/permissions";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  buildBusinessProfilePayload,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import {
  normalizeProfileCountry,
  type NormalizedProfileResult,
} from "@/utils/profile-result";
import {
  formatPrimaryLocationApiValue,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";
import {
  CreateBusinessConflictError,
  type ExistingBusinessSummary,
} from "@/lib/business-conflict";
import {
  useConvertPitchToBusiness,
  useReactivateBusiness,
} from "@/hooks/use-business-actions";
import { DuplicateBusinessConflictDialog } from "@/components/create-business/DuplicateBusinessConflictDialog";

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
  payload: BusinessProfilePayload,
  expectedWebsite: string,
) => {
  // Verified write: refuses to run if `businessId` isn't the business we just
  // created (wrong domain, already analytics-linked, or a pitch).
  await updateCreatedBusinessProfileSafely(
    businessId,
    {
      ...(createdBusiness ?? {}),
      ...payload,
    },
    { expectedWebsite, expectedIsPitch: false },
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
  const convertPitch = useConvertPitchToBusiness();
  const reactivateBusiness = useReactivateBusiness();
  const offeringsExtractor = useOfferingsExtractor("create-business");
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  const [conflictingBusiness, setConflictingBusiness] =
    useState<ExistingBusinessSummary | null>(null);

  // Bug-fix: covers the entire handleSubmitCreate span (including the gap between
  // the two mutations where both isPending flags are momentarily false).
  const [isBusy, setIsBusy] = useState(false);
  // Bug-fix: synchronous guard that prevents a second invocation before React
  // has re-rendered with the updated isBusy/isPending flags.
  const isSubmittingRef = useRef(false);
  // Bug-fix: idempotency refs so a retry after partial failure re-uses the
  // already-created business/job instead of creating a second one.
  const createdBusinessIdRef = useRef<string | null>(null);
  const jobCreatedRef = useRef(false);
  const createdForWebsiteRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: {
      onChange: businessInfoSchema as any,
    },
  });

  // Anything entered or autofilled on top of the empty defaults is unsaved work.
  const { isDirty, resetBaseline } = useFormDirtyState({
    form,
    baseline: profileFormDefaults,
  });
  const { requestNavigation, allowNavigation } = useUnsavedChangesGuard({
    isDirty,
  });

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);


  const handleSubmitCreate = useCallback(
    async (options?: {
      values?: FormData;
      autofillData?: NormalizedProfileResult | null;
    }) => {
      // Bug-fix 1: synchronous guard — prevents a second call before React
      // re-renders with updated isPending/isBusy flags (avoids double-submit race).
      if (isSubmittingRef.current) return;

      if (offeringsExtractor.isExtracting) {
        toast.error("Please wait for offerings extraction to finish.");
        return;
      }

      const values = options?.values ?? (form.state.values as FormData);
      const activeAutofillData = options?.autofillData ?? null;

      // Bug-fix 3: reset idempotency state when the user switches to a different
      // website so a fresh attempt doesn't re-use the previous run's business/job.
      if (
        createdBusinessIdRef.current &&
        createdForWebsiteRef.current &&
        String(values.website || "").trim() !== createdForWebsiteRef.current
      ) {
        createdBusinessIdRef.current = null;
        jobCreatedRef.current = false;
        createdForWebsiteRef.current = null;
      }

      const validation = businessInfoSchema.safeParse(values);

      formFieldNames.forEach((fieldName) => {
        const fieldIssue = validation.success
          ? undefined
          : validation.error.issues.find(
              (issue) => issue.path[0] === fieldName,
            );

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
        toast.error(
          "Please fix the highlighted fields before creating your business.",
        );
        return;
      }

      // Bug-fix 1 + 2: set the synchronous guard and the busy state together so
      // the loading overlay covers the entire flow — including the gap between the
      // two mutations where both mutation isPending flags are momentarily false.
      isSubmittingRef.current = true;
      setIsBusy(true);

      try {
        // Bug-fix 3a: skip business creation if a prior attempt already succeeded.
        // This allows safe retry after job-creation failure without spawning a
        // second business for the same domain.
        let businessId = createdBusinessIdRef.current;
        let resultCreatedBusiness: BusinessProfile | null = null;

        if (!businessId) {
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
            suppressErrorToast: true,
          });

          await refetchBusinessProfiles();

          businessId = result?.createdBusiness?.UniqueId || null;
          resultCreatedBusiness = result?.createdBusiness || null;

          if (businessId) {
            createdBusinessIdRef.current = businessId;
            createdForWebsiteRef.current = String(values.website || "").trim();
          }
        }

        if (!businessId) {
          resetBaseline();
          allowNavigation(() => router.push("/"));
          return;
        }

        const formOfferings = Array.isArray(values.offeringsList)
          ? values.offeringsList
              .filter((row: any) => Boolean(row?.name?.trim()))
              .map((row: any) => ({
                name: String(row.name || ""),
                description: String(row.description || ""),
                link: String(row.link || ""),
                offering_type: String((row as any).offeringType || ""),
                price_range: String(
                  (row as any).priceRange || row.pricePositioning || "",
                ),
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
          resultCreatedBusiness,
          businessProfilePayload,
          values.website,
        );

        // Bug-fix 3b: skip job creation if a prior attempt already succeeded.
        if (!jobCreatedRef.current) {
          await createJob.mutateAsync({
            businessId,
            businessProfilePayload,
            offerings,
            suppressErrorToast: true,
          });
          jobCreatedRef.current = true;
        }

        await refetchBusinessProfiles();

        // Clean up idempotency state after full success (component will unmount
        // shortly via navigation, but this keeps state clean if it doesn't).
        createdBusinessIdRef.current = null;
        jobCreatedRef.current = false;
        createdForWebsiteRef.current = null;

        resetBaseline();
        allowNavigation(() => router.push(`/business/${businessId}/profile`));
      } catch (error) {
        if (error instanceof CreateBusinessConflictError) {
          setConflictingBusiness(error.conflict.existingBusiness);
          return;
        }
        console.error("Failed to finish business setup:", error);
        toast.error("Failed to finish business setup", {
          description:
            error instanceof Error
              ? error.message
              : "Please try again before continuing.",
        });
      } finally {
        // Always release the guards so the form is interactive again after the
        // flow completes (success, error, or conflict).
        isSubmittingRef.current = false;
        setIsBusy(false);
      }
    },
    [
      allowNavigation,
      form,
      createBusiness,
      createJob,
      refetchBusinessProfiles,
      resetBaseline,
      router,
      offeringsExtractor.isExtracting,
      locationOptions,
    ],
  );

  const {
    autofillProfile: handleAutofillProfile,
    autofillProfileResult,
    isAutofillLoading,
  } = useProfileAutofillForm({
    form,
    locationOptions,
    normalizeWebsite: true,
    onBeforeAutofill: (website) => {
      offeringsExtractor.clearExtraction();
      const values = form.state.values as FormData;
      const trimmedPrimaryLocation = String(
        values?.primaryLocation ?? "",
      ).trim();
      const context = trimmedPrimaryLocation
        ? (() => {
            const payload = parsePrimaryLocationForPayload(
              trimmedPrimaryLocation,
              locationOptions,
            );
            return {
              country: normalizeProfileCountry(payload.Country),
              location: formatPrimaryLocationApiValue(payload),
            };
          })()
        : undefined;

      void offeringsExtractor.startExtraction(website, context).catch(() => {});
    },
    onAutofillSuccess: async () => {
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
    requestNavigation("/");
  };

  const handleOpenExisting = useCallback(() => {
    if (!conflictingBusiness?.UniqueId) return;
    const target = conflictingBusiness.IsPitch
      ? `/pitches/${conflictingBusiness.UniqueId}/profile`
      : `/business/${conflictingBusiness.UniqueId}/profile`;
    setConflictingBusiness(null);
    allowNavigation(() => router.push(target));
  }, [allowNavigation, conflictingBusiness, router]);

  const handleConvertPitch = useCallback(async () => {
    if (!conflictingBusiness?.UniqueId || !conflictingBusiness.IsPitch) return;

    try {
      await convertPitch.mutateAsync({
        businessId: conflictingBusiness.UniqueId,
        suppressConflictToast: true,
      });
      const businessId = conflictingBusiness.UniqueId;
      setConflictingBusiness(null);
      allowNavigation(() => router.push(`/business/${businessId}/profile`));
    } catch (error) {
      if (error instanceof CreateBusinessConflictError) {
        setConflictingBusiness(error.conflict.existingBusiness);
        return;
      }
      // The mutation owns actionable error feedback.
    }
  }, [allowNavigation, conflictingBusiness, convertPitch, router]);

  const handleReactivate = useCallback(async () => {
    if (
      !conflictingBusiness?.UniqueId ||
      conflictingBusiness.IsPitch ||
      conflictingBusiness.IsActive
    ) {
      return;
    }

    try {
      await reactivateBusiness.mutateAsync({
        businessId: conflictingBusiness.UniqueId,
      });
      const businessId = conflictingBusiness.UniqueId;
      setConflictingBusiness(null);
      allowNavigation(() => router.push(`/business/${businessId}/profile`));
    } catch {
      // The mutation owns actionable error feedback.
    }
  }, [allowNavigation, conflictingBusiness, reactivateBusiness, router]);

  if (!allowed) return null;

  return (
    <>
      <CreateBusinessTemplate
        form={form}
        locationOptions={locationOptions}
        locationsLoading={locationsLoading}
        isSubmitting={form.state.isSubmitting}
        isPending={createBusiness.isPending || createJob.isPending || isBusy}
        isAutofillLoading={isAutofillLoading}
        offeringsExtractor={offeringsExtractor}
        hasAutofilledProfile={hasAutofilledProfile}
        onAutofillProfile={() => {
          void handleAutofillProfile();
        }}
        onSubmitCreate={() =>
          handleSubmitCreate({ autofillData: autofillProfileResult })
        }
        onCancel={handleCancel}
      />
      <DuplicateBusinessConflictDialog
        open={Boolean(conflictingBusiness)}
        business={conflictingBusiness}
        isConverting={convertPitch.isPending}
        isReactivating={reactivateBusiness.isPending}
        onOpenChange={(open) => {
          if (
            !open &&
            !convertPitch.isPending &&
            !reactivateBusiness.isPending
          ) {
            setConflictingBusiness(null);
          }
        }}
        onOpenExisting={handleOpenExisting}
        onConvertPitch={() => {
          void handleConvertPitch();
        }}
        onReactivate={() => {
          void handleReactivate();
        }}
      />
    </>
  );
}
