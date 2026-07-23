"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { LoaderOverlay } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { ProfileFormTabs } from "@/components/templates/ProfileFormTabs";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import {
  PROFILE_FORM_TABS,
  type ProfileFormTabId,
} from "@/utils/profile-form-mappers";

type FormData = {
  website: string;
  businessName: string;
  businessCategory?: string;
  primaryLocation: string;
  serviceAreaType?: string;
  serviceAreas?: string[];
  serviceType: string;
  offerings: string;
};

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface CreateBusinessTemplateProps {
  form: any; // FormApi type is complex, using any for flexibility
  locationOptions: LocationOption[];
  locationsLoading: boolean;
  isSubmitting: boolean;
  isPending: boolean;
  isAutofillLoading: boolean;
  offeringsExtractor?: any;
  hasAutofilledProfile: boolean;
  onAutofillProfile: () => void;
  onSubmitCreate: () => void;
  onCancel: () => void;
}

export function CreateBusinessTemplate({
  form,
  locationOptions,
  locationsLoading,
  isSubmitting,
  isPending,
  isAutofillLoading,
  offeringsExtractor,
  hasAutofilledProfile,
  onAutofillProfile,
  onSubmitCreate,
  onCancel,
}: CreateBusinessTemplateProps) {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Create Business" }];
  const [profileTab, setProfileTab] = React.useState<ProfileFormTabId>(
    PROFILE_FORM_TABS[0].id
  );

  const formValues = useStore(form.store, (state: any) => state.values) as FormData;
  const isOfferingsExtracting = Boolean(offeringsExtractor?.isExtracting);
  const isLoading = Boolean(isSubmitting || isPending || isAutofillLoading);
  const isAutofillDisabled =
    isAutofillLoading ||
    locationsLoading ||
    !String(formValues?.website ?? "").trim() ||
    !String(formValues?.primaryLocation ?? "").trim() ||
    !String(formValues?.serviceAreaType ?? "").trim();

  const renderAutofillButton = ({
    className,
    variant,
  }: {
    className?: string;
    variant?: "outline";
  } = {}) => (
    <Button
      type="button"
      variant={variant}
      onClick={onAutofillProfile}
      disabled={isAutofillDisabled}
      className={cn(
        "gap-2",
        variant
          ? "border-general-border-three text-general-foreground"
          : "bg-general-primary text-general-primary-foreground hover:bg-general-primary/90",
        className
      )}
    >
      {isAutofillLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Autofilling...
        </>
      ) : (
        <>
          Autofill Profile
          <ArrowRight className="size-4 shrink-0" />
        </>
      )}
    </Button>
  );

  return (
    <div className={cn("flex flex-col h-full min-h-0 relative overflow-hidden")}>
      <LoaderOverlay
        isLoading={isLoading}
        message={
          isAutofillLoading
            ? "Autofilling profile..."
            : isPending
              ? "Creating business..."
              : undefined
        }
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div
              className={cn(
                "w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1",
                !hasAutofilledProfile && "justify-center items-center"
              )}
            >
              <form
                id="create-business-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitCreate();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                {!hasAutofilledProfile ? (
                  <ProfileGateCard
                    title="Add a business"
                    description="We build the profile from the website. Anything the site can't give us, you fill in after — nothing is guessed."
                    className="w-full max-w-[490px] self-center"
                  >
                    <div className="mx-auto w-full max-w-[442px]">
                      <BusinessInfoForm
                        form={form}
                        embedded
                        embeddedVariant="autofillGate"
                        disableWebsiteLock
                        primaryLocationAction={renderAutofillButton({ className: "w-full gap-2" })}
                      />
                    </div>
                  </ProfileGateCard>
                ) : null}
                {hasAutofilledProfile && (
                  <ProfileFormTabs
                    form={form}
                    businessId={null}
                    value={profileTab}
                    onValueChange={setProfileTab}
                    disableWebsiteLock
                    hideFetchOfferingsFromWebsite
                    extractionController={offeringsExtractor}
                    primaryLocationAction={renderAutofillButton({
                      className: "gap-2 border-general-border-three text-general-foreground",
                      variant: "outline",
                    })}
                    rightAction={
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onCancel}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          form="create-business-form"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          disabled={
                            isSubmitting ||
                            isPending ||
                            isAutofillLoading ||
                            isOfferingsExtracting
                          }
                        >
                          {isSubmitting || isPending
                            ? "Creating..."
                            : isOfferingsExtracting
                              ? "Extracting offerings..."
                              : "Create"}
                        </Button>
                      </div>
                    }
                  />
                )}
              </form>
            </div>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}

