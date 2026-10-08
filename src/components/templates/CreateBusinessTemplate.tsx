"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { LoaderOverlay } from "@/components/ui/loader";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { isValidWebsiteUrl } from "@/utils/utils";

type FormData = {
  website: string;
  primaryLocation: string;
  serviceAreaType?: string;
};

interface CreateBusinessTemplateProps {
  form: any;
  locationsLoading: boolean;
  isSubmitting: boolean;
  onSubmitCreate: () => void;
  onCancel: () => void;
}

export function CreateBusinessTemplate({
  form,
  locationsLoading,
  isSubmitting,
  onSubmitCreate,
  onCancel,
}: CreateBusinessTemplateProps) {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Create" }];
  const formValues = useStore(form.store, (state: any) => state.values) as FormData;
  const isCreateDisabled =
    isSubmitting ||
    locationsLoading ||
    !isValidWebsiteUrl(String(formValues?.website ?? "")) ||
    !String(formValues?.primaryLocation ?? "").trim() ||
    !String(formValues?.serviceAreaType ?? "").trim();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <LoaderOverlay
        isLoading={isSubmitting}
        message={isSubmitting ? "Preparing your profile..." : undefined}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitCreate();
              }}
              className="w-full max-w-[490px]"
            >
              <ProfileGateCard
                title="Add a business"
                description="Add the website and service location. You can complete the business profile after creation."
              >
                <div className="mx-auto w-full max-w-[442px]">
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
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gap-2"
                      disabled={isCreateDisabled}
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                      {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </ProfileGateCard>
            </form>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}
