"use client";

import React, { useMemo } from "react";
import { useStore } from "@tanstack/react-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import {
  CustomAddRowTable,
  Column,
} from "@/components/organisms/CustomAddRowTable";
import { OfferingRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

type BusinessInfoFormData = {
  website: string;
  businessName: string;
  businessDescription: string;
  primaryLocation: string;
  serviceType: "physical" | "online" | "both";
  lifetimeValue: string;
  offerings: "products" | "services" | "both";
  offeringsList?: Array<{
    name: string;
    description: string;
    link: string;
    pricePositioning?: string;
    offeringType?: string;
    priceRange?: string;
    duration?: string;
    inclusions?: string[] | string;
  }>;
  offeringsSavedIndices?: number[];
};

interface OfferingsFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
  disabled?: boolean;
  validationMessage?: string;
}

export const OfferingsForm = ({
  form,
  embedded = false,
  disabled = false,
  validationMessage,
}: OfferingsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const offeringsData = useStore(form.store, (state: any) => (state.values?.offeringsList || []) as OfferingRow[]);
  // Track offerings validation errors
  const [hasOfferingsErrors, setHasOfferingsErrors] = React.useState(false);

  // Update form field when offerings validation errors change
  React.useEffect(() => {
    form.setFieldMeta('offeringsList', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasOfferingsErrors,
    }));
  }, [hasOfferingsErrors, form]);

  // Own column definitions
  const offeringsColumns: Column<OfferingRow>[] = useMemo(() => [
    { key: "name", label: "Name", validation: { required: true } },
    { key: "description", label: "Description", validation: { required: false } },
    { key: "link", label: "Link", validation: { required: false, url: true } },
    { key: "pricePositioning", label: "Price Positioning", validation: { required: false } },
  ], []);

  // Own handlers - encapsulated logic
  const {
    handleAddRow,
    handleRowChange,
    handleDeleteRow,
  } = useAddRowTableState<OfferingRow>({
    data: offeringsData,
    formFieldName: "offeringsList",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    emptyRowFactory: () => ({
      name: "",
      description: "",
      link: "",
      pricePositioning: "",
    }),
  });

  const innerContent = (
    <div id="offeringsList" tabIndex={-1} className="space-y-7 outline-none">
        <Card
          variant="noBorderShadowCard"
          className={cn(
            validationMessage && "border border-destructive/40 bg-destructive/5"
          )}
        >
          <CardHeader className="">
            <div className="flex items-center">
              <CardTitle>
                <FieldLabel className="gap-0">
                  <span className="text-destructive mr-0.5">*</span>
                  What products and services does your business sell?
                </FieldLabel>
              </CardTitle>
            </div>
            {validationMessage ? (
              <p role="alert" className="text-xs text-destructive">
                {validationMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full">
              <CustomAddRowTable
                  columns={offeringsColumns}
                  data={offeringsData}
                  onAddRow={() => {
                    if (!disabled) handleAddRow();
                  }}
                  onRowChange={(rowIndex, field, value) => {
                    if (!disabled) handleRowChange(rowIndex, field, value);
                  }}
                  onDeleteRow={(rowIndex) => {
                    if (!disabled) handleDeleteRow(rowIndex);
                  }}
                  addButtonText="Add Product/Service"
                  onValidationChange={setHasOfferingsErrors}
                  showErrorsWithoutTouch={hasOfferingsErrors}
                  variant="card"
                  disabled={disabled}
                />
            </div>
          </CardContent>
        </Card>
    </div>
  );

  if (embedded) {
    return <div id="offerings-section">{innerContent}</div>;
  }

  return (
    <Card
      id="offerings-section"
      variant="profileCard"
      className="p-4 bg-transparent border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">Offerings</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Defines what you actually sell so recommendations focus on revenue-driving products and services.
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-7">
        {innerContent}
      </CardContent>
    </Card>
  );
};

