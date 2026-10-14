"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import {
  ProfileActionConfirmDialog,
  type ProfileConfirmAction,
} from "@/components/organisms/profile/ProfileActionConfirmDialog";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { Button } from "@/components/ui/button";
import { LoaderOverlay } from "@/components/ui/loader";
import { usePitchBusinesses } from "@/hooks/use-business-profiles";
import {
  IncompleteBusinessCreationError,
  useManualBusinessCreation,
} from "@/hooks/use-manual-business-creation";
import { useLocations } from "@/hooks/use-locations";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import { profileFormDefaults } from "@/utils/profile-form-mappers";
import { validateInitialProfileFields } from "@/utils/profile-form-fields";
import {
  cleanWebsiteUrl,
  isValidWebsiteUrl,
  normalizeDomainForFavicon,
} from "@/utils/utils";

export function CreatePitchTemplate() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading
  );
  const manualCreation = useManualBusinessCreation({
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
    (state: { values: BusinessInfoFormData }) => state.values
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
      cleanWebsiteUrl(values.website)
    ).toLowerCase();
    const duplicate = pitchBusinesses.find(
      (pitch) =>
        normalizeDomainForFavicon(
          cleanWebsiteUrl(pitch.Website ?? "")
        ).toLowerCase() === domain
    );
    if (duplicate?.UniqueId) {
      toast.error("A pitch already exists for this website.", {
        action: {
          label: "Open",
          onClick: () => router.push(`/pitches/${duplicate.UniqueId}/profile`),
        },
      });
      return;
    }

    try {
      const issues = validateInitialProfileFields(values);
      if (issues.length > 0) {
        toast.error("Complete the required pitch details.", {
          description: issues.map((issue) => issue.label).join(", "),
        });
        return;
      }
      creationInFlight.current = true;
      setIsCreating(true);
      const result = await manualCreation.create(values);
      router.replace(`/pitches/${result.business.UniqueId}/profile`);
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
          description:
            error instanceof Error ? error.message : "Please try again.",
        }
      );
      if (incompletePitch?.UniqueId) {
        router.replace(`/pitches/${incompletePitch.UniqueId}/profile`);
        return;
      }
      creationInFlight.current = false;
      setIsCreating(false);
    }
  }, [manualCreation, pitchBusinesses, router, values]);

  const creationPending = isCreating || manualCreation.isPending;
  const isCreateDisabled =
    creationPending ||
    locationsLoading ||
    !isValidWebsiteUrl(values.website) ||
    !values.primaryLocation.trim() ||
    !values.serviceAreaType;

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <LoaderOverlay
          isLoading={creationPending}
          message={creationPending ? "Preparing your pitch profile..." : undefined}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "Pitches", href: "/pitches" },
                { label: "Create Pitch" },
              ]}
              showAskMassic={false}
            />
            <div className="flex min-h-0 flex-1 items-center justify-center p-5">
              <form
                className="w-full max-w-[490px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPendingConfirmAction("create-pitch");
                }}
              >
                <ProfileGateCard
                  title="Add a pitch"
                  description="Add the website and service location. You can complete the pitch profile after creation."
                >
                  <BusinessInfoForm
                    form={form}
                    embedded
                    embeddedVariant="initialSetup"
                    disableWebsiteLock
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={creationPending}
                      onClick={() => router.push("/pitches")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gap-2"
                      disabled={isCreateDisabled}
                    >
                      {creationPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                      {creationPending ? "Creating..." : "Create Pitch"}
                    </Button>
                  </div>
                </ProfileGateCard>
              </form>
            </div>
          </div>
        </LoaderOverlay>
      </div>
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
