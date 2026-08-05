"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { Boxes, Handshake, PackageSearch } from "lucide-react";
import {
  CustomAddRowTable,
  type Column,
} from "@/components/organisms/CustomAddRowTable";
import { GenericInput } from "@/components/ui/generic-input";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type { OfferingRow } from "@/store/business-store";

const OFFERING_COLUMNS: Column<OfferingRow>[] = [
  { key: "name", label: "Name", validation: { required: true } },
  { key: "description", label: "Description" },
  { key: "link", label: "Link", validation: { url: true } },
  { key: "pricePositioning", label: "Price positioning" },
];

export function WebflowManualOfferingsForm({ form }: { form: any }) {
  const offerings = useStore(
    form.store,
    (state: any) => (state.values?.offeringsList || []) as OfferingRow[],
  );
  const [hasErrors, setHasErrors] = React.useState(false);
  const hasNamedOffering = offerings.some((row) =>
    Boolean(String(row?.name || "").trim()),
  );

  React.useEffect(() => {
    form.setFieldMeta("offeringsList", (previous: any) => ({
      ...previous,
      hasValidationErrors: hasErrors,
    }));
  }, [form, hasErrors]);

  const { handleAddRow, handleRowChange, handleDeleteRow } =
    useAddRowTableState<OfferingRow>({
      data: offerings,
      formFieldName: "offeringsList",
      setFormFieldValue: (name, value) =>
        form.setFieldValue(name as keyof BusinessInfoFormData, value),
      getCurrentData: () =>
        (form.state.values.offeringsList || []) as OfferingRow[],
      emptyRowFactory: () => ({
        name: "",
        description: "",
        link: "",
        pricePositioning: "",
      }),
    });

  return (
    <div className="space-y-7">
      <div className="w-full max-w-xl">
        <GenericInput<BusinessInfoFormData>
          form={form}
          fieldName="offerings"
          type="radio-cards"
          label="What type of offerings do you provide?"
          required
          orientation="horizontal"
          radioCardSize="sm"
          radioCardIcons={{
            products: <PackageSearch className="size-7" strokeWidth={1.5} />,
            services: <Handshake className="size-7" strokeWidth={1.5} />,
            both: <Boxes className="size-7" strokeWidth={1.5} />,
          }}
          options={[
            { value: "products", label: "Products" },
            { value: "services", label: "Services" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-general-foreground">
            Products and services <span className="text-destructive">*</span>
          </p>
          <p className="mt-1 text-xs text-general-muted-foreground">
            Add at least one offering. These details are entered manually and
            are not fetched from the website.
          </p>
        </div>
        <CustomAddRowTable
          columns={OFFERING_COLUMNS}
          data={offerings}
          onAddRow={handleAddRow}
          onRowChange={handleRowChange}
          onDeleteRow={handleDeleteRow}
          addButtonText="Add product or service"
          onValidationChange={setHasErrors}
          showErrorsWithoutTouch={hasErrors}
          variant="card"
        />
        {!hasNamedOffering ? (
          <p className="text-xs text-destructive">
            Add at least one product or service before creating the business.
          </p>
        ) : null}
      </div>
    </div>
  );
}
