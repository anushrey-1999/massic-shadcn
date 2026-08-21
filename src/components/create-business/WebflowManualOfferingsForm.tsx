"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { Boxes, Handshake, Loader2, PackageSearch, RefreshCw } from "lucide-react";
import {
  CustomAddRowTable,
  type Column,
} from "@/components/organisms/CustomAddRowTable";
import { Button } from "@/components/ui/button";
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

export interface WebflowOfferingsSource {
  collections: string[];
  importedCount: number;
  truncated: boolean;
  isImporting: boolean;
  onReimport: () => void;
}

function formatCollectionList(collections: string[]) {
  if (collections.length === 0) return "";
  if (collections.length === 1) return collections[0];
  if (collections.length === 2) return `${collections[0]} and ${collections[1]}`;
  return `${collections.slice(0, -1).join(", ")}, and ${collections[collections.length - 1]}`;
}

function sourceDescription(source: WebflowOfferingsSource | undefined) {
  if (!source) {
    return "Add at least one offering so we know what this business sells.";
  }
  if (source.isImporting) {
    return "Importing products and services from your Webflow CMS...";
  }
  if (source.importedCount > 0) {
    const collections = formatCollectionList(source.collections);
    const from = collections ? ` from your Webflow ${collections} collection${source.collections.length > 1 ? "s" : ""}` : " from Webflow";
    return `Imported ${source.importedCount} ${source.importedCount === 1 ? "offering" : "offerings"}${from}. Edit or remove anything that should not be here.`;
  }
  return "We could not find products or services in your Webflow CMS, so add them here. Nothing you enter is sent back to Webflow.";
}

export function WebflowManualOfferingsForm({
  form,
  webflowSource,
}: {
  form: any;
  webflowSource?: WebflowOfferingsSource;
}) {
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
        <div className="flex items-start justify-between gap-4 max-md:flex-col max-md:gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-general-foreground">
              Products and services <span className="text-destructive">*</span>
            </p>
            <p className="mt-1 text-xs text-general-muted-foreground">
              {sourceDescription(webflowSource)}
            </p>
          </div>
          {webflowSource ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={webflowSource.onReimport}
              disabled={webflowSource.isImporting}
            >
              {webflowSource.isImporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Reimport from Webflow
                </>
              )}
            </Button>
          ) : null}
        </div>

        {webflowSource?.truncated ? (
          <p className="text-xs text-general-muted-foreground">
            Your Webflow CMS has more items than we import at once. Add any
            missing offerings manually.
          </p>
        ) : null}

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
        {!hasNamedOffering && !webflowSource?.isImporting ? (
          <p className="text-xs text-destructive">
            Add at least one product or service before creating the business.
          </p>
        ) : null}
      </div>
    </div>
  );
}
