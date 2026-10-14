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
import { Button } from "@/components/ui/button";
import {
  CustomAddRowTable,
  Column,
} from "@/components/organisms/CustomAddRowTable";
import { OfferingRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { PackageSearch, Plus } from "lucide-react";

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
  required?: boolean;
}

export const OfferingsForm = ({
  form,
  embedded = false,
  disabled = false,
  validationMessage,
  required = true,
}: OfferingsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const offeringsData = useStore(form.store, (state: any) => (state.values?.offeringsList || []) as OfferingRow[]);
  const emptyOfferingRow = useMemo<OfferingRow>(
    () => ({
      name: "",
      description: "",
      link: "",
      pricePositioning: "",
    }),
    []
  );
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
  const offeringsColumns: Column<OfferingRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        validation: { required: true },
      },
      {
        key: "pricePositioning",
        label: "Price positioning",
        validation: { required: false },
      },
      {
        key: "description",
        label: "Description",
        validation: { required: false },
        multiline: true,
        rows: 2,
        cardClassName: "sm:col-span-2",
      },
      {
        key: "link",
        label: "Link",
        validation: { required: false, url: true },
        cardClassName: "sm:col-span-2",
      },
    ],
    []
  );

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
    <div id="offeringsList" tabIndex={-1} className="space-y-3 outline-none">
        <Card variant="noBorderShadowCard">
          <CardHeader className={embedded ? "px-0 pt-0 pb-2" : ""}>
            <div className="flex items-center">
              <CardTitle className="text-sm font-medium leading-normal">
                <FieldLabel className="gap-0 text-sm font-medium leading-normal">
                  {required ? (
                    <span className="text-destructive mr-0.5">*</span>
                  ) : null}
                  What products and services does your business sell?
                </FieldLabel>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={embedded ? "p-0" : "space-y-4"}>
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
                  showErrorsWithoutTouch={
                    Boolean(validationMessage) || hasOfferingsErrors
                  }
                  emptyRowData={required ? emptyOfferingRow : undefined}
                  variant="card"
                  cardLayout="stacked"
                  hideAddButton={embedded}
                  disabled={disabled}
                />
            </div>
          </CardContent>
        </Card>
    </div>
  );

  if (embedded) {
    return (
      <div id="offerings-section" className="space-y-3">
        <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-general-border/30 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <h2 className="text-base font-semibold text-general-foreground">
            Offerings
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={disabled}
            className="h-8 shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add offering
          </Button>
        </div>
        {innerContent}
      </div>
    );
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

