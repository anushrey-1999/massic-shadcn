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
import { useFinalizeWebflowOnboarding } from "@/hooks/use-webflow-onboarding";
import type { WebflowOnboardingSelection } from "@/hooks/use-webflow-onboarding";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  profileFormDefaults,
} from "@/utils/profile-form-mappers";
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
  const [isFinishing, setIsFinishing] = React.useState(false);
  const createdBusinessRef = React.useRef<BusinessProfile | null>(null);
  const connectionAttachedRef = React.useRef(false);
  const profilePersistedRef = React.useRef(false);
  const jobCreatedRef = React.useRef(false);

  const form = useForm({
    defaultValues: {
      ...profileFormDefaults,
      serviceAreaType: "",
    },
    validators: { onChange: webflowManualBusinessSchema as any },
  });

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
    async (businessId: string) => {
      if (!selection) return false;
      if (connectionAttachedRef.current) return true;

      setAttachError(null);
      try {
        const result = await finalizeWebflow.mutateAsync({
          ...selection,
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
        return false;
      }
    },
    [finalizeWebflow, queryClient, selection],
  );

  const finishBusinessSetup = React.useCallback(
    async (businessId: string, includeWebflow: boolean) => {
      const values = form.state.values as BusinessInfoFormData;
      if (includeWebflow) {
        const attached = await attachConnection(businessId);
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

  if (attachError && createdBusinessId) {
    return (
      <WebflowAttachRecovery
        message={attachError}
        isRetrying={isFinishing || finalizeWebflow.isPending}
        onRetry={() => finishExistingBusiness(true)}
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

  const pending =
    isFinishing ||
    createBusiness.isPending ||
    finalizeWebflow.isPending ||
    createJob.isPending;

  return (
    <CreateBusinessGateLayout className="min-h-0 items-stretch justify-stretch overflow-hidden">
      <LoaderOverlay
        isLoading={pending}
        message={
          finalizeWebflow.isPending
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
