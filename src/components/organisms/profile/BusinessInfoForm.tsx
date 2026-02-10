"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";
import { Store } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@tanstack/react-form";

type BusinessInfoFormData = {
  website: string;
  businessName: string;
  businessDescription: string;
  primaryLocation: string;
  serviceType: "physical" | "online";
  recurringRevenue: string;
  avgOrderValue: string | number;
  lifetimeValue: string | number;
  offerings: "products" | "services" | "both";
  offeringsList?: Array<{
    name: string;
    description: string;
    link: string;
  }>;
};

interface BusinessInfoFormProps {
  form: any; // TanStack Form instance
  disableWebsiteLock?: boolean;
}

export const BusinessInfoForm = React.memo(({
  form,
  disableWebsiteLock = false,
}: BusinessInfoFormProps) => {
  const websiteValue = useStore(form.store, (state: any) => state.values?.website || "");
  const isWebsiteLocked =
    !disableWebsiteLock && String(websiteValue || "").trim().length > 0;

  // Own Zustand selectors - isolated selector for better performance
  const { locationOptions, locationsLoading } = useBusinessStore(
    useShallow((state) => ({
      locationOptions: state.profileForm.locationOptions,
      locationsLoading: state.profileForm.locationsLoading,
    }))
  );

  return (
    <Card
      id="business-info"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Store className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="!text-2xl">Business Info</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business.
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Row 1 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="website"
                type="url"
                inputVariant="noBorder"
                label="Website"
                required={true}
                placeholder="Provide the official url of your business website"
                disabled={isWebsiteLocked}
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="businessName"
                type="input"
                label="Business Name"
                inputVariant="noBorder"
                required
                placeholder="Provide the brand name of your business"
              />
            </CardContent>
          </Card>

          {/* Row 2 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="businessDescription"
                type="textarea"
                inputVariant="noBorder"
                label="Business Description"
                placeholder="Add a short overview of your business, products, or services."
                rows={4}
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="primaryLocation"
                type="location-select"
                label="Primary Location"
                required={true}
                inputVariant="noBorder"
                placeholder={
                  locationsLoading
                    ? "Loading locations..."
                    : "Where are your customers primarily located?"
                }
                options={locationOptions}
                disabled={locationsLoading}
                loading={locationsLoading}
              />
            </CardContent>
          </Card>

          {/* Row 3 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="serviceType"
                type="radio-group"
                label="Where do you primarily serve your customers?"
                required={true}
                orientation="horizontal"
                options={[
                  { value: "physical", label: "Physical Location" },
                  { value: "online", label: "Online" },
                ]}
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="recurringRevenue"
                type="select"
                inputVariant="noBorder"
                label="Recurring Revenue"
                placeholder="Is your revenue earned on a set schedule?"
                options={[
                  {
                    value: "",
                    label: "Select an option",
                    disabled: true,
                  },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "partial", label: "Partial" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Row 4 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="avgOrderValue"
                type="number"
                inputVariant="noBorder"
                label="Avg. Order Value ($)"
                placeholder="Total amount of a single order in USD"
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="lifetimeValue"
                type="number"
                inputVariant="noBorder"
                label="Lifetime Value ($)"
                placeholder="Total amount earned on all orders in USD"
              />
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
});

BusinessInfoForm.displayName = "BusinessInfoForm";
