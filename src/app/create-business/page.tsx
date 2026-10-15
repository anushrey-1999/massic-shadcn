"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";

import { DuplicateBusinessConflictDialog } from "@/components/create-business/DuplicateBusinessConflictDialog";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import { MergeBusinessConfirmDialog } from "@/components/create-business/MergeBusinessConfirmDialog";
import { useCreateAgencyBusiness } from "@/hooks/use-linked-businesses";
import { useAuthStore } from "@/store/auth-store";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  clearCreationDraft,
  creationDraftValues,
  creationOwnerId,
  readCreationDraft,
  writeCreationDraft,
  type BusinessCreationDraft,
  type CreationProgress,
} from "@/lib/business-creation-draft";
import {
  useConvertPitchToBusiness,
  useReactivateBusiness,
} from "@/hooks/use-business-actions";
import {
  IncompleteBusinessCreationError,
  useBusinessCreation,
} from "@/hooks/use-business-creation";
import { useLocations } from "@/hooks/use-locations";
import { useRoleGuard } from "@/hooks/use-permissions";
import {
  CreateBusinessConflictError,
  type ExistingBusinessSummary,
} from "@/lib/business-conflict";
import { ACCOUNT_ROLES } from "@/lib/permissions";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import { profileFormDefaults } from "@/utils/profile-form-mappers";
import { validateProfileForm } from "@/utils/profile-form-fields";

export default function CreateBusinessPage() {
  return (
    <Suspense fallback={<BusinessSetupLoader />}>
      <CreateBusinessRoute />
    </Suspense>
  );
}

function BusinessSetupLoader() {
  return (
    <div
      role="status"
      aria-label="Loading business setup"
      className="flex h-full min-h-72 items-center justify-center"
    >
      <Loader />
    </div>
  );
}

function CreateBusinessRoute() {
  const allowed = useRoleGuard({
    allowedRoles: [ACCOUNT_ROLES.OWNER, ACCOUNT_ROLES.ADMIN],
    fallbackPath: "/settings",
  });
  const params = useSearchParams();
  const draftId = params.get("draft");
  const user = useAuthStore((state) => state.user);
  const ownerId = creationOwnerId(user);
  const router = useRouter();
  const key = `${ownerId}:${draftId ?? "manual"}`;
  const [restored, setRestored] = useState<{
    key: string;
    draft?: BusinessCreationDraft;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!draftId || !ownerId) return;
    try {
      setRestored({ key, draft: readCreationDraft(ownerId, draftId) });
    } catch (error) {
      setRestored({ key, error: apiErrorMessage(error) });
    }
  }, [draftId, ownerId, key]);

  if (!allowed) return null;
  if (draftId && (!ownerId || restored?.key !== key)) {
    return <BusinessSetupLoader />;
  }
  if (draftId && restored?.error) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center p-5">
        <Card className="w-full max-w-[490px] p-6">
          <h1 className="text-lg font-medium">Business setup unavailable</h1>
          <p role="alert" className="text-sm text-general-muted-foreground">
            {restored.error}
          </p>
          <Button onClick={() => router.push("/settings")}>
            Back to Settings
          </Button>
        </Card>
      </div>
    );
  }
  return (
    <CreateBusinessSetup
      key={key}
      draft={draftId ? restored?.draft : undefined}
    />
  );
}

function CreateBusinessSetup({ draft }: { draft?: BusinessCreationDraft }) {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const draftRef = useRef(draft);
  const persistDraft = useCallback((patch: Partial<BusinessCreationDraft>) => {
    if (draftRef.current) {
      draftRef.current = writeCreationDraft({ ...draftRef.current, ...patch });
    }
  }, []);
  const persistProgress = useCallback(
    (progress: CreationProgress) => {
      persistDraft({ progress });
    },
    [persistDraft],
  );
  const manualCreation = useBusinessCreation({
    isPitch: false,
    locationOptions,
    connection: draft?.connection,
    initialProgress: draft?.progress,
    onProgress: persistProgress,
  });
  const mergeBusiness = useCreateAgencyBusiness();
  const convertPitch = useConvertPitchToBusiness();
  const reactivateBusiness = useReactivateBusiness();
  const [isCreating, setIsCreating] = useState(false);
  const creationInFlight = useRef(false);
  const [conflictingBusiness, setConflictingBusiness] =
    useState<ExistingBusinessSummary | null>(null);
  const lastStorageError = useRef("");

  const form = useForm({
    defaultValues: draft ? creationDraftValues(draft) : profileFormDefaults,
    validators: { onChange: businessInfoSchema as never },
  });
  const values = useStore(form.store, (state) => state.values);

  const persistValues = useCallback(
    (input: BusinessInfoFormData) => {
      persistDraft({
        values: {
          businessName: input.businessName,
          website: input.website,
          primaryLocation: input.primaryLocation,
          serviceAreaType: input.serviceAreaType,
        },
      });
    },
    [persistDraft],
  );

  useEffect(() => {
    if (!draft) return;
    try {
      persistValues(values);
      lastStorageError.current = "";
    } catch (error) {
      const message = apiErrorMessage(error);
      if (lastStorageError.current !== message) {
        lastStorageError.current = message;
        toast.error("Couldn't keep your setup progress", {
          description: message,
        });
      }
    }
  }, [draft, values, persistValues]);

  const clearDraft = useCallback(() => {
    if (draft) clearCreationDraft(draft.ownerId, draft.id);
  }, [draft]);

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);

  const handleSubmitCreate = useCallback(async () => {
    if (creationInFlight.current) return;
    const values = form.state.values as BusinessInfoFormData;
    const issues = validateProfileForm(values, {
      sectionMode: "minimal",
      visibleSections: ["identity"],
    });
    if (issues.length > 0) {
      toast.error("Complete the required business details.", {
        description: issues
          .map((issue) => `${issue.label}: ${issue.message}`)
          .join("\n"),
      });
      return;
    }

    creationInFlight.current = true;
    setIsCreating(true);
    try {
      persistValues(values);
      const result = await manualCreation.create(values);
      clearDraft();
      toast.success("Business created");
      router.replace(`/business/${result.business.UniqueId}/profile`);
    } catch (error) {
      if (error instanceof CreateBusinessConflictError) {
        setConflictingBusiness(error.conflict.existingBusiness);
        creationInFlight.current = false;
        setIsCreating(false);
        return;
      }
      const incompleteBusiness =
        error instanceof IncompleteBusinessCreationError
          ? error.business
          : null;
      toast.error(
        incompleteBusiness
          ? "Business created, but setup is incomplete."
          : "Failed to create business",
        {
          description: apiErrorMessage(error),
        },
      );
      creationInFlight.current = false;
      setIsCreating(false);
    }
  }, [form, manualCreation, router, persistValues, clearDraft]);

  const handleMergeLinkedBusiness = useCallback(async () => {
    if (!draft || !conflictingBusiness?.UniqueId || creationInFlight.current)
      return;
    creationInFlight.current = true;
    try {
      const [connected] = await mergeBusiness.mutateAsync({
        businesses: [
          {
            ...draft.connection,
            displayName: form.state.values.businessName,
            title: form.state.values.businessName,
            selectedGa4: draft.connection.selectedGa4
              ? {
                  ...draft.connection.selectedGa4,
                  displayName: "",
                  accountName: "",
                  accountId: "",
                }
              : undefined,
          },
        ],
        mergeExisting: true,
        mergeTargetUniqueId: conflictingBusiness.UniqueId,
        suppressErrorToast: true,
      });
      if (!connected?.businessId)
        throw new Error("The merged business could not be identified.");
      clearDraft();
      router.replace(`/business/${connected.businessId}/profile`);
    } catch (error) {
      if (error instanceof CreateBusinessConflictError)
        setConflictingBusiness(error.conflict.existingBusiness);
      toast.error("Couldn't merge this business", {
        description: apiErrorMessage(error),
      });
    } finally {
      creationInFlight.current = false;
    }
  }, [draft, conflictingBusiness, mergeBusiness, form, clearDraft, router]);

  const handleOpenExisting = useCallback(() => {
    if (!conflictingBusiness?.UniqueId) return;
    router.push(
      conflictingBusiness.IsPitch
        ? `/pitches/${conflictingBusiness.UniqueId}/profile`
        : `/business/${conflictingBusiness.UniqueId}/profile`,
    );
  }, [conflictingBusiness, router]);

  const handleConvertPitch = useCallback(async () => {
    if (!conflictingBusiness?.UniqueId) return;
    await convertPitch.mutateAsync({
      businessId: conflictingBusiness.UniqueId,
      suppressConflictToast: true,
    });
    router.push(`/business/${conflictingBusiness.UniqueId}/profile`);
  }, [conflictingBusiness, convertPitch, router]);

  const handleReactivate = useCallback(async () => {
    if (!conflictingBusiness?.UniqueId) return;
    await reactivateBusiness.mutateAsync({
      businessId: conflictingBusiness.UniqueId,
    });
    router.push(`/business/${conflictingBusiness.UniqueId}/profile`);
  }, [conflictingBusiness, reactivateBusiness, router]);

  return (
    <>
      <CreateBusinessTemplate
        initialFieldsLocked={manualCreation.hasCreatedBusiness}
        websiteLocked={Boolean(draft)}
        form={form}
        locationsLoading={locationsLoading}
        isSubmitting={
          isCreating || manualCreation.isPending || mergeBusiness.isPending
        }
        onSubmitCreate={() => void handleSubmitCreate()}
        onCancel={() => {
          clearDraft();
          router.push(draft ? "/settings" : "/");
        }}
      />
      {draft ? (
        <MergeBusinessConfirmDialog
          business={conflictingBusiness}
          pending={mergeBusiness.isPending}
          onCancel={() => setConflictingBusiness(null)}
          onConfirm={() => void handleMergeLinkedBusiness()}
        />
      ) : (
        <DuplicateBusinessConflictDialog
          open={Boolean(conflictingBusiness)}
          business={conflictingBusiness}
          isConverting={convertPitch.isPending}
          isReactivating={reactivateBusiness.isPending}
          onOpenChange={(open) => !open && setConflictingBusiness(null)}
          onOpenExisting={handleOpenExisting}
          onConvertPitch={() => void handleConvertPitch()}
          onReactivate={() => void handleReactivate()}
        />
      )}
    </>
  );
}
