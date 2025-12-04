"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="bg-muted min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8">Create Business</h1>

        <form
          id="create-business-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* Website Card */}
              <Card>
                <CardContent>
                  <GenericInput<FormData>
                    form={form}
                    fieldName="website"
                    type="input"
                    label="Website"
                    required
                    description="Provide the official url of your business website"
                    placeholder="https://www.yourbusiness.com"
                  />
                </CardContent>
              </Card>

              {/* Business Name Card */}
              <Card>
                <CardContent>
                  <GenericInput<FormData>
                    form={form}
                    fieldName="businessName"
                    type="input"
                    label="Business Name"
                    required
                    description="Provide the official name of your business"
                    placeholder="Enter your business name"
                  />
                </CardContent>
              </Card>

              {/* Primary Location Card */}
              <Card>
                <CardContent>
                  <GenericInput
                    form={form as any}
                    fieldName="primaryLocation"
                    type="location-select"
                    label="Location"
                    options={locationOptions}
                    placeholder={
                      locationsLoading
                        ? "Loading locations..."
                        : "Location"
                    }
                    disabled={locationsLoading}
                    loading={locationsLoading}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              {/* Where do you primarily serve your customers Card */}
              <Card>
                <CardContent>
                  <GenericInput<FormData>
                    form={form}
                    fieldName="serveCustomers"
                    type="radio-group"
                    label="Where do you primarily serve your customers"
                    required
                    description="Indicate if you serve your customers at a physical location or online"
                    orientation="vertical"
                    options={[
                      { value: "local", label: "Local" },
                      { value: "online", label: "Online" },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* What do you offer your customers Card */}
              <Card>
                <CardContent>
                  <GenericInput<FormData>
                    form={form}
                    fieldName="offerType"
                    type="radio-group"
                    label="What do you offer your customers?"
                    required
                    description="Indicate whether your business primarily offers products or services"
                    orientation="vertical"
                    options={[
                      { value: "products", label: "Products" },
                      { value: "services", label: "Services" },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
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
              disabled={isSubmitting || isPending}
            >
              {isSubmitting || isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

