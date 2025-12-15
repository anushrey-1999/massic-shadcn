"use client";

import React, { useMemo } from "react";
import { useStore } from "@tanstack/react-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import {
  CustomAddRowTable,
  Column,
} from "@/components/organisms/CustomAddRowTable";
import { OfferingRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";

type BusinessInfoFormData = {
  website: string;
  businessName: string;
  businessDescription: string;
  primaryLocation: string;
  serviceType: "physical" | "online";
  recurringRevenue: string;
  avgOrderValue: string;
  lifetimeValue: string;
  offerings: "products" | "services" | "both";
  offeringsList?: Array<{
    name: string;
    description: string;
    link: string;
  }>;
  offeringsSavedIndices?: number[];
};

interface OfferingsFormProps {
  form: any; // TanStack Form instance
}

export const OfferingsForm = ({
  form,
}: OfferingsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const offeringsData = useStore(form.store, (state: any) => (state.values?.offeringsList || []) as OfferingRow[]);

  // Own column definitions
  const offeringsColumns: Column<OfferingRow>[] = useMemo(() => [
    { key: "name", label: "Name", validation: { required: true } },
    { key: "description", label: "Description", validation: { required: false } },
    { key: "link", label: "Link", validation: { required: false, url: true } },
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
    emptyRowFactory: () => ({ name: "", description: "", link: "" }),
  });

  return (
    <Card
      id="offerings"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none mt-6"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Offerings</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card variant="profileCard">
          <CardContent>
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="offerings"
              type="radio-group"
              label="What type of offerings do you provide your customers?"
              required={true}
              orientation="horizontal"
              options={[
                { value: "products", label: "Products" },
                { value: "services", label: "Services" },
                { value: "both", label: "Both" },
              ]}
            />
          </CardContent>
        </Card>
        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                <span className="text-destructive mr-0.5">*</span>
                What products and services does your business sell?
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={offeringsColumns}
              data={offeringsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add Product/Service"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

