"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { GenericInput } from "@/components/ui/generic-input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { LoaderOverlay } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { Laptop, PackageSearch, Store, Handshake, Loader2 } from "lucide-react";

type FormData = {
  website: string;
  businessName: string;
  primaryLocation: string;
  serveCustomers: string;
  offerType: string;
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
  hasAutofilledProfile,
  onAutofillProfile,
  onSubmitCreate,
  onCancel,
}: CreateBusinessTemplateProps) {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Create Business" }];

  const formValues = useStore(form.store, (state: any) => state.values) as FormData;
  const isLoading = Boolean(isSubmitting || isPending || isAutofillLoading);
  const isAutofillDisabled =
    isAutofillLoading ||
    locationsLoading ||
    !String(formValues?.website ?? "").trim() ||
    !String(formValues?.primaryLocation ?? "").trim();

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
      className={className}
    >
      {isAutofillLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Autofilling...
        </>
      ) : (
        "Autofill Profile"
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
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
              <form
                id="create-business-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitCreate();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                <ProfileStepCard
                  title={hasAutofilledProfile ? "Create Business" : "Let's set up your business"}
                  description={
                    hasAutofilledProfile
                      ? "Review the required details before creating your business."
                      : "Enter your website URL and location, then click Autofill Profile."
                  }
                  className="flex-1"
                  scrollableContent
                  contentClassName="pb-6"
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
                      {hasAutofilledProfile && (
                        <Button
                          type="submit"
                          form="create-business-form"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          disabled={isSubmitting || isPending || isAutofillLoading}
                        >
                          {isSubmitting || isPending ? "Creating..." : "Create"}
                        </Button>
                      )}
                    </div>
                  }
                >
                  {!hasAutofilledProfile ? (
                    <div className="flex flex-col gap-5 w-[480px] max-w-full">
                      <GenericInput<FormData>
                        form={form}
                        fieldName="website"
                        type="url"
                        label="Website"
                        required
                        placeholder="Provide the official url of your business website"
                      />

                      <GenericInput<FormData>
                        form={form as any}
                        fieldName="primaryLocation"
                        type="location-select"
                        label="Location"
                        required
                        placeholder={
                          locationsLoading
                            ? "Loading locations..."
                            : "Where are your customers primarily located?"
                        }
                        options={locationOptions}
                        disabled={locationsLoading}
                        loading={locationsLoading}
                      />

                      <div className="flex flex-col gap-2 pt-1">
                        {renderAutofillButton({ className: "w-full gap-2" })}
                        <p className="text-xs text-general-muted-foreground">
                          We'll auto-fill your business name and suggested required details from your website.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-7">
                      <div className="flex items-end gap-4 w-full">
                        <div className="w-1/2 min-w-0">
                          <GenericInput<FormData>
                            form={form}
                            fieldName="website"
                            type="url"
                            label="Website"
                            required
                            placeholder="Provide the official url of your business website"
                          />
                        </div>
                        <div className="flex-1 min-w-0" />
                        <div className="shrink-0">
                          {renderAutofillButton({
                            className: "gap-2 border-general-border-three text-general-foreground",
                            variant: "outline",
                          })}
                        </div>
                      </div>

                      <div className="w-1/2">
                        <GenericInput<FormData>
                          form={form}
                          fieldName="businessName"
                          type="input"
                          label="Business Name"
                          required
                          placeholder="Provide the brand name of your business"
                        />
                      </div>

                      <div className="w-1/2">
                        <GenericInput<FormData>
                          form={form as any}
                          fieldName="primaryLocation"
                          type="location-select"
                          label="Location"
                          required
                          placeholder={
                            locationsLoading
                              ? "Loading locations..."
                              : "Where are your customers primarily located?"
                          }
                          options={locationOptions}
                          disabled={locationsLoading}
                          loading={locationsLoading}
                        />
                      </div>

                      <div className="w-1/2">
                        <GenericInput<FormData>
                          form={form as any}
                          fieldName="serveCustomers"
                          type="radio-cards"
                          label="Where do you primarily serve your customers?"
                          required
                          orientation="horizontal"
                          radioCardSize="sm"
                          radioCardIcons={{
                            local: <Store className="size-7" strokeWidth={1.5} />,
                            online: <Laptop className="size-7" strokeWidth={1.5} />,
                          }}
                          options={[
                            { value: "local", label: "Local" },
                            { value: "online", label: "Online" },
                          ]}
                        />
                      </div>

                      <div className="w-1/2">
                        <GenericInput<FormData>
                          form={form as any}
                          fieldName="offerType"
                          type="radio-cards"
                          label="What type of offerings do you provide your customers?"
                          required
                          orientation="horizontal"
                          radioCardSize="sm"
                          radioCardIcons={{
                            products: <PackageSearch className="size-7" strokeWidth={1.5} />,
                            services: <Handshake className="size-7" strokeWidth={1.5} />,
                          }}
                          options={[
                            { value: "products", label: "Products" },
                            { value: "services", label: "Services" },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </ProfileStepCard>
              </form>
            </div>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}

