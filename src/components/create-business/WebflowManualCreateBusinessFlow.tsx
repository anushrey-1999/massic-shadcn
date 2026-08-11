"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { LoaderOverlay } from "@/components/ui/loader";
import {
  useBusinessProfiles,
  useCreateBusiness,
  updateCreatedBusinessProfileSafely,
} from "@/hooks/use-business-profiles";
import { useCreateJob, type BusinessProfilePayload } from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import {
  isWebflowSessionExpired,
  useFinalizeWebflowOnboarding,
  useWebflowOnboardingBusinessProfile,
} from "@/hooks/use-webflow-onboarding";
import type {
  WebflowOnboardingPrefill,
  WebflowOnboardingSelection,
} from "@/hooks/use-webflow-onboarding";
import { useWebflowOauthPopup } from "@/hooks/use-webflow-oauth-popup";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
import {
  applyWebflowPrefill,
  describeWebflowPrefillSources,
} from "@/utils/webflow-prefill";
import { CreateBusinessGateLayout } from "./CreateBusinessGateLayout";
import { WebflowAttachRecovery } from "./WebflowAttachRecovery";
import { WebflowBusinessOnboarding } from "./WebflowBusinessOnboarding";
import { WebflowManualBusinessTemplate } from "./WebflowManualBusinessTemplate";

const REQUIRED_FIELDS = [
  "website",
  "businessName",
  "primaryLocation",
  "serviceAreaType",
  "serviceType",
  "offerings",
  "offeringsList",
] as const;

const webflowManualBusinessSchema = businessInfoSchema.superRefine(
  (values, context) => {
    if (!String(values.serviceAreaType || "").trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceAreaType"],
        message: "Service Area Type is required",
      });
    }

    const hasOffering = values.offeringsList?.some((row) =>
      Boolean(String(row?.name || "").trim()),
    );

    if (!hasOffering) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offeringsList"],
        message: "Add at least one product or service",
      });
    }
  },
);

function offeringRows(values: BusinessInfoFormData) {
  return (Array.isArray(values.offeringsList) ? values.offeringsList : [])
    .filter((row) => Boolean(row?.name?.trim()))
    .map((row) => ({
      name: String(row.name || ""),
      description: String(row.description || ""),
      link: String(row.link || ""),
      offering_type: String(row.offeringType || ""),
      price_range: String(row.priceRange || row.pricePositioning || ""),
      duration: String(row.duration || ""),
      inclusions: Array.isArray(row.inclusions)
        ? row.inclusions
        : typeof row.inclusions === "string"
          ? row.inclusions
          : [],
    }));
}

async function persistCreatedProfile(
  businessId: string,
  createdBusiness: BusinessProfile | null,
  payload: BusinessProfilePayload,
  website: string,
) {
  await updateCreatedBusinessProfileSafely(
    businessId,
    { ...(createdBusiness ?? {}), ...payload },
    { expectedWebsite: website, expectedIsPitch: false },
  );
}

export function WebflowManualCreateBusinessFlow({
  sessionId,
  initialOauthError,
  onSessionId,
  onChooseAnotherPlatform,
  onComplete,
}: {
  sessionId: string | null;
  initialOauthError?: string | null;
  onSessionId: (sessionId: string | null) => void;
  onChooseAnotherPlatform: () => void;
  onComplete: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();
  const finalizeWebflow = useFinalizeWebflowOnboarding();
  const { connect: authorizeWebflow, isConnecting: isReconnectingWebflow } =
    useWebflowOauthPopup();
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const [selection, setSelection] =
    React.useState<WebflowOnboardingSelection | null>(null);
  const [createdBusinessId, setCreatedBusinessId] = React.useState<
    string | null
  >(null);
  const [attachError, setAttachError] = React.useState<string | null>(null);
  const [attachNeedsReauthorization, setAttachNeedsReauthorization] =
    React.useState(false);
  const [importedFromWebflow, setImportedFromWebflow] =
    React.useState<WebflowOnboardingPrefill | null>(null);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const createdBusinessRef = React.useRef<BusinessProfile | null>(null);
  const connectionAttachedRef = React.useRef(false);
  const profilePersistedRef = React.useRef(false);
  const jobCreatedRef = React.useRef(false);
  const appliedPrefillRef = React.useRef<number | null>(null);
  const reportedPrefillErrorRef = React.useRef<number | null>(null);

  const form = useForm({
    defaultValues: {
      ...profileFormDefaults,
      serviceAreaType: "",
    },
    validators: { onChange: webflowManualBusinessSchema as any },
  });

  // Once the business exists the form has already been prefilled, so a session change
  // during attach recovery must not trigger another Webflow fan-out.
  const prefill = useWebflowOnboardingBusinessProfile(
    createdBusinessId ? null : selection,
  );

  // Keyed on the fetch timestamp rather than the payload, because React Query's structural
  // sharing reuses the previous object when a reimport returns identical data, which would
  // otherwise leave the user with no feedback after pressing "Reimport from Webflow".
  const prefillUpdatedAt = prefill.dataUpdatedAt;
  React.useEffect(() => {
    const data = prefill.data;
    if (!data || !prefillUpdatedAt) return;
    if (appliedPrefillRef.current === prefillUpdatedAt) return;
    appliedPrefillRef.current = prefillUpdatedAt;
    setImportedFromWebflow(data);

    const summary = applyWebflowPrefill(form, data);
    const scopeWarnings = data.warnings.filter(
      (warning) => warning.code === "WEBFLOW_SCOPE_NOT_GRANTED",
    );

    if (summary.filledLabels.length > 0) {
      toast.success("Imported details from Webflow", {
        description: `Filled ${summary.filledLabels.join(", ")}. Review and edit anything before creating.`,
      });
    } else if (summary.skippedLabels.length > 0) {
      toast.info("Your edits were kept", {
        description:
          "Webflow returned the same details you already have, so nothing was overwritten.",
      });
    } else {
      toast.info("No reusable details found in Webflow", {
        description:
          "This Webflow site did not expose products, services, or business details we could import. Add them below.",
      });
    }

    if (scopeWarnings.length > 0) {
      toast.warning("Some Webflow details were unavailable", {
        description: scopeWarnings.map((warning) => warning.message).join(" "),
      });
    }
  }, [form, prefill.data, prefillUpdatedAt]);

  const prefillErrorUpdatedAt = prefill.errorUpdatedAt;
  React.useEffect(() => {
    if (!prefill.isError || !prefillErrorUpdatedAt) return;
    if (reportedPrefillErrorRef.current === prefillErrorUpdatedAt) return;
    reportedPrefillErrorRef.current = prefillErrorUpdatedAt;
    toast.error("Could not import details from Webflow", {
      description:
        prefill.error?.message ||
        "Add your business details below, or retry the import from the Offerings tab.",
    });
  }, [prefill.error, prefill.isError, prefillErrorUpdatedAt]);

  const reimportFromWebflow = prefill.reimportFromWebflow;
  const handleReimportFromWebflow = React.useCallback(() => {
    void reimportFromWebflow();
  }, [reimportFromWebflow]);

  React.useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);

  const validateManualValues = React.useCallback(() => {
    const values = form.state.values as BusinessInfoFormData;
    const parsed = webflowManualBusinessSchema.safeParse(values);

    REQUIRED_FIELDS.forEach((fieldName) => {
      form.setFieldMeta(fieldName, (previous: any) => ({
        ...previous,
        isTouched: true,
      }));
    });
    void form.validate("change");

    if (!parsed.success) {
      toast.error("Complete the required business details before creating.");
      return null;
    }
    return parsed.data;
  }, [form]);

  const attachConnection = React.useCallback(
    async (
      businessId: string,
      selectionOverride?: WebflowOnboardingSelection,
    ) => {
      // A reconnect passes its brand new session explicitly, because the state update
      // that stores it has not been applied to this closure yet.
      const activeSelection = selectionOverride || selection;
      if (!activeSelection) return false;
      if (connectionAttachedRef.current) return true;

      setAttachError(null);
      setAttachNeedsReauthorization(false);
      try {
        const result = await finalizeWebflow.mutateAsync({
          ...activeSelection,
          businessId,
        });
        connectionAttachedRef.current = true;
        if (result.connection) {
          queryClient.setQueryData(["webflow-connection", businessId], {
            connected: true,
            connection: result.connection,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: ["webflow-connection", businessId],
        });
        return true;
      } catch (error: any) {
        setAttachError(
          error?.message ||
            "Webflow could not be attached. Retry without creating another business.",
        );
        setAttachNeedsReauthorization(isWebflowSessionExpired(error));
        return false;
      }
    },
    [finalizeWebflow, queryClient, selection],
  );

  const finishBusinessSetup = React.useCallback(
    async (
      businessId: string,
      includeWebflow: boolean,
      selectionOverride?: WebflowOnboardingSelection,
    ) => {
      const values = form.state.values as BusinessInfoFormData;
      if (includeWebflow) {
        const attached = await attachConnection(businessId, selectionOverride);
        if (!attached) return false;
      }

      const businessProfilePayload = buildBusinessProfilePayload(values, {
        autofillResult: null,
        locationOptions,
        normalizeWebsite: true,
        ctasMode: "wrapped-json",
      });

      if (!profilePersistedRef.current) {
        await persistCreatedProfile(
          businessId,
          createdBusinessRef.current,
          businessProfilePayload,
          values.website,
        );
        profilePersistedRef.current = true;
      }

      if (!jobCreatedRef.current) {
        await createJob.mutateAsync({
          businessId,
          businessProfilePayload,
          offerings: offeringRows(values),
        });
        jobCreatedRef.current = true;
      }

      await refetchBusinessProfiles();
      onComplete();
      router.push(`/business/${businessId}/profile`);
      return true;
    },
    [
      attachConnection,
      createJob,
      form.state.values,
      locationOptions,
      onComplete,
      refetchBusinessProfiles,
      router,
    ],
  );

  const handleCreate = React.useCallback(async () => {
    if (!selection) {
      toast.error("Select an authorized Webflow site before creating.");
      return;
    }
    const values = validateManualValues();
    if (!values) return;

    setIsFinishing(true);
    try {
      let businessId = createdBusinessId;
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
        });
        businessId = result?.createdBusiness?.UniqueId || null;
        if (!businessId) {
          throw new Error("Business was created without a usable business ID");
        }
        createdBusinessRef.current = result.createdBusiness || null;
        setCreatedBusinessId(businessId);
      }

      await finishBusinessSetup(businessId, true);
    } catch (error) {
      console.error("Failed to finish Webflow business setup:", error);
      toast.error("Failed to finish business setup", {
        description:
          "Your business will not be created again. Retry to finish the existing setup.",
      });
    } finally {
      setIsFinishing(false);
    }
  }, [
    createBusiness,
    createdBusinessId,
    finishBusinessSetup,
    selection,
    validateManualValues,
  ]);

  const finishExistingBusiness = React.useCallback(
    async (includeWebflow: boolean) => {
      if (!createdBusinessId) return;
      setIsFinishing(true);
      try {
        await finishBusinessSetup(createdBusinessId, includeWebflow);
      } catch (error) {
        console.error("Failed to resume Webflow business setup:", error);
        toast.error("Failed to finish business setup", {
          description: "Retry to finish the existing business.",
        });
      } finally {
        setIsFinishing(false);
      }
    },
    [createdBusinessId, finishBusinessSetup],
  );

  const reconnectAndAttachWebflow = React.useCallback(async () => {
    if (!createdBusinessId) return;
    if (!selection) {
      setAttachError(
        "The selected Webflow site is no longer available. Continue without Webflow and connect it from the business.",
      );
      setAttachNeedsReauthorization(false);
      return;
    }
    setIsFinishing(true);
    try {
      const nextSessionId = await authorizeWebflow();
      const nextSelection = { ...selection, sessionId: nextSessionId };
      setSelection(nextSelection);
      onSessionId(nextSessionId);
      await finishBusinessSetup(createdBusinessId, true, nextSelection);
    } catch (error: any) {
      console.error("Failed to reauthorize Webflow:", error);
      setAttachError(
        error?.message ||
          "Webflow authorization did not complete. Try again, or continue without Webflow.",
      );
    } finally {
      setIsFinishing(false);
    }
  }, [
    authorizeWebflow,
    createdBusinessId,
    finishBusinessSetup,
    onSessionId,
    selection,
  ]);

  if (attachError && createdBusinessId) {
    return (
      <WebflowAttachRecovery
        message={attachError}
        isRetrying={
          isFinishing || finalizeWebflow.isPending || isReconnectingWebflow
        }
        requiresReauthorization={attachNeedsReauthorization}
        onRetry={() => finishExistingBusiness(true)}
        onReconnect={reconnectAndAttachWebflow}
        onContinue={() => finishExistingBusiness(false)}
      />
    );
  }

  if (!selection) {
    return (
      <WebflowBusinessOnboarding
        sessionId={sessionId}
        initialOauthError={initialOauthError}
        onSessionId={onSessionId}
        onContinue={(nextSelection) => {
          form.setFieldValue("website", nextSelection.website);
          setSelection(nextSelection);
        }}
        onBack={onChooseAnotherPlatform}
      />
    );
  }

  const isImportingFromWebflow = prefill.isFetching;
  const pending =
    isFinishing ||
    createBusiness.isPending ||
    finalizeWebflow.isPending ||
    createJob.isPending;

  return (
    <CreateBusinessGateLayout className="min-h-0 items-stretch justify-stretch overflow-hidden">
      <LoaderOverlay
        isLoading={pending || isImportingFromWebflow}
        message={
          isImportingFromWebflow
            ? "Importing your details from Webflow..."
            : finalizeWebflow.isPending
              ? "Connecting Webflow..."
              : "Creating business..."
        }
      >
        <form
          id="webflow-manual-create-business-form"
          className="flex min-h-0 w-full flex-1 overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <WebflowManualBusinessTemplate
            form={form}
            leftTitle="Create Business"
            webflowSource={{
              collections: describeWebflowPrefillSources(importedFromWebflow),
              importedCount: importedFromWebflow?.offerings.items.length ?? 0,
              truncated: importedFromWebflow?.offerings.truncated ?? false,
              isImporting: isImportingFromWebflow,
              onReimport: handleReimportFromWebflow,
            }}
            onSaveChanges={() => {}}
            onSaveAndUpdateStrategy={() => {}}
            showDefaultActions={false}
            showUnlinkBusiness={false}
            customHeaderActions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.setFieldValue("website", "");
                    setSelection(null);
                  }}
                  disabled={pending}
                  className="gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Webflow site
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onComplete();
                    router.push("/");
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="webflow-manual-create-business-form"
                  disabled={pending || locationsLoading}
                  className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </>
            }
            className="flex-1"
          />
        </form>
      </LoaderOverlay>
    </CreateBusinessGateLayout>
  );
}
