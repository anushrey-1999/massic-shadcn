"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { CreateBusinessPlatformChooser } from "@/components/create-business/CreateBusinessPlatformChooser";
import { WebflowBusinessOnboarding } from "@/components/create-business/WebflowBusinessOnboarding";
import { WebflowAttachRecovery } from "@/components/create-business/WebflowAttachRecovery";
import { useCreateJob, type BusinessProfilePayload } from "@/hooks/use-jobs";
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
import { normalizeProfileCountry, type NormalizedProfileResult } from "@/utils/profile-result";
import {
  formatPrimaryLocationApiValue,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";
import {
  useFinalizeWebflowOnboarding,
  type WebflowOnboardingSelection,
} from "@/hooks/use-webflow-onboarding";

type FormData = BusinessInfoFormData;
type CreatePlatform = "webflow" | "other";
const PLATFORM_STORAGE_KEY = "massic:create-business:platform";
const WEBFLOW_SESSION_STORAGE_KEY = "massic:create-business:webflow-session";
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
  const queryClient = useQueryClient();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();
  const finalizeWebflow = useFinalizeWebflowOnboarding();
  const offeringsExtractor = useOfferingsExtractor("create-business");
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  const [platform, setPlatform] = useState<CreatePlatform | null>(null);
  const [isRestoringPlatform, setIsRestoringPlatform] = useState(true);
  const [webflowSessionId, setWebflowSessionId] = useState<string | null>(null);
  const [webflowSelection, setWebflowSelection] =
    useState<WebflowOnboardingSelection | null>(null);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(
    null,
  );
  const [webflowAttachError, setWebflowAttachError] = useState<string | null>(
    null,
  );
  const [oauthRedirectError, setOauthRedirectError] = useState<string | null>(
    null,
  );

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: {
      onChange: businessInfoSchema as any,
    },
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPlatform = params.get("platform");
    const storedPlatform = window.sessionStorage.getItem(PLATFORM_STORAGE_KEY);
    const nextPlatform =
      requestedPlatform === "webflow" || storedPlatform === "webflow"
        ? "webflow"
        : storedPlatform === "other"
          ? "other"
          : null;
    const callbackSessionId = params.get("webflowSessionId");
    const storedSessionId = window.sessionStorage.getItem(
      WEBFLOW_SESSION_STORAGE_KEY,
    );

    setPlatform(nextPlatform);
    setWebflowSessionId(callbackSessionId || storedSessionId || null);
    if (callbackSessionId) {
      window.sessionStorage.setItem(
        WEBFLOW_SESSION_STORAGE_KEY,
        callbackSessionId,
      );
    }
    if (params.get("webflowOnboarding") === "error") {
      setOauthRedirectError(
        "Webflow authorization did not complete. Please try again.",
      );
    }

    if (params.has("webflowSessionId") || params.has("webflowOnboarding")) {
      params.delete("webflowSessionId");
      params.delete("webflowOnboarding");
      const cleanQuery = params.toString();
      window.history.replaceState(
        null,
        "",
        `/create-business${cleanQuery ? `?${cleanQuery}` : ""}`,
      );
    }
    setIsRestoringPlatform(false);
  }, []);

  const handleSubmitCreate = useCallback(
    async (options?: {
      values?: FormData;
      autofillData?: NormalizedProfileResult | null;
      onBusinessCreated?: (businessId: string) => void | Promise<void>;
    }): Promise<string | null> => {
      if (offeringsExtractor.isExtracting) {
        toast.error("Please wait for offerings extraction to finish.");
        return null;
      }

      const values = options?.values ?? (form.state.values as FormData);
      const activeAutofillData = options?.autofillData ?? null;
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
        return null;
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

        const businessId = result?.createdBusiness?.UniqueId;
        if (businessId) {
          setCreatedBusinessId(businessId);
          await options?.onBusinessCreated?.(businessId);
          await refetchBusinessProfiles();

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
            result.createdBusiness,
            businessProfilePayload,
            values.website,
          );

          await createJob.mutateAsync({
            businessId,
            businessProfilePayload,
            offerings,
          });

          await refetchBusinessProfiles();

          return businessId;
        } else {
          throw new Error("Business was created without a usable business ID");
        }
      } catch (error) {
        console.error("Failed to finish business setup:", error);
        toast.error("Failed to finish business setup", {
          description: "Please try again before continuing.",
        });
        return null;
      }
    },
    [
      form,
      createBusiness,
      createJob,
      refetchBusinessProfiles,
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
      const trimmedPrimaryLocation = String(values?.primaryLocation ?? "").trim();
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
    window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    window.sessionStorage.removeItem(WEBFLOW_SESSION_STORAGE_KEY);
    router.push("/");
  };

  const persistPlatform = useCallback((nextPlatform: CreatePlatform | null) => {
    setPlatform(nextPlatform);
    if (nextPlatform) {
      window.sessionStorage.setItem(PLATFORM_STORAGE_KEY, nextPlatform);
    } else {
      window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    }
  }, []);

  const persistWebflowSession = useCallback((sessionId: string | null) => {
    setWebflowSessionId(sessionId);
    setOauthRedirectError(null);
    if (sessionId) {
      window.sessionStorage.setItem(WEBFLOW_SESSION_STORAGE_KEY, sessionId);
    } else {
      window.sessionStorage.removeItem(WEBFLOW_SESSION_STORAGE_KEY);
      setWebflowSelection(null);
    }
  }, []);

  const clearOnboardingStorage = useCallback(() => {
    window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    window.sessionStorage.removeItem(WEBFLOW_SESSION_STORAGE_KEY);
  }, []);

  const attachWebflow = useCallback(
    async (
      businessId: string,
      selection: WebflowOnboardingSelection,
    ): Promise<boolean> => {
      setWebflowAttachError(null);
      try {
        const result = await finalizeWebflow.mutateAsync({
          ...selection,
          businessId,
        });
        if (result.connection) {
          queryClient.setQueryData(["webflow-connection", businessId], {
            connected: true,
            connection: result.connection,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: ["webflow-connection", businessId],
        });
        toast.success("Webflow connected to your business");
        return true;
      } catch (error: any) {
        setWebflowAttachError(
          error?.message ||
            "Webflow could not be attached. Retry without creating the business again.",
        );
        return false;
      }
    },
    [finalizeWebflow, queryClient],
  );

  const handleFinalCreate = useCallback(async () => {
    if (platform === "webflow" && !webflowSelection) {
      toast.error(
        "Reconnect Webflow and select a site before creating the business.",
      );
      setHasAutofilledProfile(false);
      return;
    }

    let attachmentResult: boolean | null = null;
    const businessId =
      createdBusinessId ||
      (await handleSubmitCreate({
        autofillData: autofillProfileResult,
        onBusinessCreated:
          platform === "webflow" && webflowSelection
            ? async (newBusinessId) => {
                attachmentResult = await attachWebflow(
                  newBusinessId,
                  webflowSelection,
                );
              }
            : undefined,
      }));
    if (!businessId) return;
    setCreatedBusinessId(businessId);

    if (platform === "webflow" && webflowSelection) {
      const attached =
        attachmentResult ?? (await attachWebflow(businessId, webflowSelection));
      if (!attached) return;
    }

    clearOnboardingStorage();
    router.push(`/business/${businessId}/profile`);
  }, [
    attachWebflow,
    autofillProfileResult,
    clearOnboardingStorage,
    createdBusinessId,
    handleSubmitCreate,
    platform,
    router,
    webflowSelection,
  ]);

  if (!allowed) return null;

  if (isRestoringPlatform) return null;

  if (webflowAttachError && createdBusinessId && webflowSelection) {
    return (
      <WebflowAttachRecovery
        message={webflowAttachError}
        isRetrying={finalizeWebflow.isPending}
        onRetry={async () => {
          const attached = await attachWebflow(
            createdBusinessId,
            webflowSelection,
          );
          if (!attached) return;
          clearOnboardingStorage();
          router.push(`/business/${createdBusinessId}/profile`);
        }}
        onContinue={() => {
          clearOnboardingStorage();
          router.push(`/business/${createdBusinessId}/profile`);
        }}
      />
    );
  }

  if (!platform) {
    return (
      <CreateBusinessPlatformChooser
        onSelect={(nextPlatform) => persistPlatform(nextPlatform)}
      />
    );
  }

  if (platform === "webflow" && !hasAutofilledProfile) {
    return (
      <WebflowBusinessOnboarding
        form={form}
        sessionId={webflowSessionId}
        locationOptions={locationOptions}
        locationsLoading={locationsLoading}
        isAutofillLoading={isAutofillLoading}
        initialOauthError={oauthRedirectError}
        onSessionId={persistWebflowSession}
        onSelection={setWebflowSelection}
        onContinue={async () => {
          await handleAutofillProfile();
        }}
        onBack={() => {
          persistPlatform(null);
          persistWebflowSession(null);
        }}
      />
    );
  }

  return (
    <CreateBusinessTemplate
      form={form}
      locationOptions={locationOptions}
      locationsLoading={locationsLoading}
      isSubmitting={form.state.isSubmitting}
      isPending={
        createBusiness.isPending ||
        createJob.isPending ||
        finalizeWebflow.isPending
      }
      isAutofillLoading={isAutofillLoading}
      offeringsExtractor={offeringsExtractor}
      hasAutofilledProfile={hasAutofilledProfile}
      lockWebsite={platform === "webflow"}
      pendingMessage={
        finalizeWebflow.isPending ? "Connecting Webflow..." : undefined
      }
      onAutofillProfile={() => {
        void handleAutofillProfile();
      }}
      onSubmitCreate={() => {
        void handleFinalCreate();
      }}
      onCancel={handleCancel}
      onBackToPlatform={
        !hasAutofilledProfile ? () => persistPlatform(null) : undefined
      }
    />
  );
}
