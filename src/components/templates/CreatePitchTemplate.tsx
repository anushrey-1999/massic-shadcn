"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CreateBusinessTemplate } from "./CreateBusinessTemplate";
import { apiErrorMessage } from "@/lib/api-error";
import {
  ProfileActionConfirmDialog,
  type ProfileConfirmAction,
} from "@/components/organisms/profile/ProfileActionConfirmDialog";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import {
  IncompleteBusinessCreationError,
  useBusinessCreation,
} from "@/hooks/use-business-creation";
import { useLocations } from "@/hooks/use-locations";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import { profileFormDefaults } from "@/utils/profile-form-mappers";
import { validateProfileForm } from "@/utils/profile-form-fields";
import { cleanWebsiteUrl, normalizeDomainForFavicon } from "@/utils/utils";

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const manualCreation = useBusinessCreation({
    isPitch: true,
    locationOptions,
  });
  const { pitchBusinesses } = usePitchBusinesses();
  const [pendingConfirmAction, setPendingConfirmAction] =
    useState<ProfileConfirmAction | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const creationInFlight = useRef(false);

  const form = useForm({
    defaultValues: profileFormDefaults,
    validators: { onChange: businessInfoSchema as never },
  });
  const values = useStore(
    form.store,
    (state: { values: BusinessInfoFormData }) => state.values,
  );

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);

  const createPitch = useCallback(async () => {
    if (creationInFlight.current) return;
    const domain = normalizeDomainForFavicon(
      cleanWebsiteUrl(values.website),
    ).toLowerCase();
    const duplicate = pitchBusinesses.find(
      (pitch) =>
        normalizeDomainForFavicon(
          cleanWebsiteUrl(pitch.Website ?? ""),
        ).toLowerCase() === domain,
    );
    if (
      duplicate?.UniqueId &&
      duplicate.UniqueId !== manualCreation.createdBusinessId
    ) {
      toast.error("A pitch already exists for this website.", {
        action: {
          label: "Open",
          onClick: () => router.push(`/pitches/${duplicate.UniqueId}/profile`),
        },
      });
      return;
    }

    try {
      const issues = validateProfileForm(values, {
        sectionMode: "minimal",
        visibleSections: ["identity"],
      });
      if (issues.length > 0) {
        toast.error("Complete the required pitch details.", {
          description: issues
            .map((issue) => `${issue.label}: ${issue.message}`)
            .join("\n"),
        });
        return;
      }
      creationInFlight.current = true;
      setIsCreating(true);
      const result = await manualCreation.create(values);
      toast.success("Pitch created");
      router.replace(`/pitches/${result.business.UniqueId}/reports?view=cards`);
    } catch (error) {
      const incompletePitch =
        error instanceof IncompleteBusinessCreationError
          ? error.business
          : null;
      toast.error(
        incompletePitch
          ? "Pitch created, but setup is incomplete."
          : "Failed to create pitch",
        {
          description: apiErrorMessage(error),
        },
      );
      creationInFlight.current = false;
      setIsCreating(false);
    }
  }, [manualCreation, pitchBusinesses, router, values]);

  const creationPending = isCreating || manualCreation.isPending;

  return (
    <>
      <CreateBusinessTemplate
        form={form}
        isPitch
        initialFieldsLocked={manualCreation.hasCreatedBusiness}
        locationsLoading={locationsLoading}
        isSubmitting={creationPending}
        onSubmitCreate={() => setPendingConfirmAction("create-pitch")}
        onCancel={() => router.push("/pitches")}
      />
      <ProfileActionConfirmDialog
        action={pendingConfirmAction}
        onCancel={() => setPendingConfirmAction(null)}
        onConfirm={(action) => {
          setPendingConfirmAction(null);
          if (action === "create-pitch") void createPitch();
        }}
      />
    </>
  );
}
