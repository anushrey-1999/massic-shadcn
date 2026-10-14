"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DuplicateBusinessConflictDialog } from "@/components/create-business/DuplicateBusinessConflictDialog";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import {
  useConvertPitchToBusiness,
  useReactivateBusiness,
} from "@/hooks/use-business-actions";
import {
  IncompleteBusinessCreationError,
  useManualBusinessCreation,
} from "@/hooks/use-manual-business-creation";
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
import { validateInitialProfileFields } from "@/utils/profile-form-fields";

export default function CreateBusinessPage() {
  const allowed = useRoleGuard({
    allowedRoles: [ACCOUNT_ROLES.OWNER, ACCOUNT_ROLES.ADMIN],
    fallbackPath: "/settings",
  });
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading
  );
  const manualCreation = useManualBusinessCreation({
    isPitch: false,
    locationOptions,
  });
  const convertPitch = useConvertPitchToBusiness();
  const reactivateBusiness = useReactivateBusiness();
  const [isCreating, setIsCreating] = useState(false);
  const creationInFlight = useRef(false);
  const [conflictingBusiness, setConflictingBusiness] =
    useState<ExistingBusinessSummary | null>(null);

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: { onChange: businessInfoSchema as never },
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

  const handleSubmitCreate = useCallback(async () => {
    if (creationInFlight.current) return;
    const values = form.state.values as BusinessInfoFormData;
    const issues = validateInitialProfileFields(values);
    if (issues.length > 0) {
      toast.error("Complete the required business details.", {
        description: issues.map((issue) => issue.label).join(", "),
      });
      return;
    }

    creationInFlight.current = true;
    setIsCreating(true);
    try {
      const result = await manualCreation.create(values);
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
          description:
            error instanceof Error ? error.message : "Please try again.",
        }
      );
      if (incompleteBusiness?.UniqueId) {
        router.replace(`/business/${incompleteBusiness.UniqueId}/profile`);
        return;
      }
      creationInFlight.current = false;
      setIsCreating(false);
    }
  }, [
    form,
    manualCreation,
    router,
  ]);

  const handleOpenExisting = useCallback(() => {
    if (!conflictingBusiness?.UniqueId) return;
    router.push(
      conflictingBusiness.IsPitch
        ? `/pitches/${conflictingBusiness.UniqueId}/profile`
        : `/business/${conflictingBusiness.UniqueId}/profile`
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

  if (!allowed) return null;

  return (
    <>
      <CreateBusinessTemplate
        form={form}
        locationsLoading={locationsLoading}
        isSubmitting={isCreating || manualCreation.isPending}
        onSubmitCreate={() => void handleSubmitCreate()}
        onCancel={() => router.push("/")}
      />
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
    </>
  );
}
