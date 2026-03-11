"use client";

import React from "react";
import { GenericInput } from "@/components/ui/generic-input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { LoaderOverlay } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { Laptop, PackageSearch, Store, Handshake } from "lucide-react";

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
  onCancel: () => void;
}

export function CreateBusinessTemplate({
  form,
  locationOptions,
  locationsLoading,
  isSubmitting,
  isPending,
  onCancel,
}: CreateBusinessTemplateProps) {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Create Business" }];

  const isLoading = Boolean(isSubmitting || isPending);

  return (
    <div className={cn("flex flex-col h-full min-h-0 relative overflow-hidden")}>
      <LoaderOverlay isLoading={isLoading} message={isPending ? "Creating business..." : undefined}>
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
              <form
                id="create-business-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                <ProfileStepCard
                  title="Create Business"
                  description="Add basic details to create a business manually."
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
                      <Button
                        type="submit"
                        form="create-business-form"
                        className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                        disabled={isSubmitting || isPending}
                      >
                        {isSubmitting || isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-7">
                    <div className="w-1/2">
                      <GenericInput<FormData>
                        form={form}
                        fieldName="website"
                        type="url"
                        label="Website"
                        required
                        placeholder="Provide the official url of your business website"
                      />
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
                </ProfileStepCard>
              </form>
            </div>
          </div>
        </div>
      </LoaderOverlay>
    </div>
  );
}

