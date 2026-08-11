"use client";

import React, { useMemo, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import {
  CustomAddRowTable,
  Column,
} from "@/components/organisms/CustomAddRowTable";
import { OfferingRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { useApplyExtractedOfferings } from "@/hooks/use-apply-extracted-offerings";
import { toast } from "sonner";
import { AlertCircle, Boxes, Handshake, Loader2, PackageSearch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessStore } from "@/store/business-store";
import {
  formatPrimaryLocationApiValue,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";
import { normalizeProfileCountry } from "@/utils/profile-result";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureActionGuard } from "@/hooks/use-permissions";

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
  businessId?: string | null; // Business ID for offerings extraction
  embedded?: boolean;
  disabled?: boolean;
  extractionController?: ReturnType<typeof useOfferingsExtractor>;
  restrictFetchOfferings?: boolean;
}

export const OfferingsForm = ({
  form,
  businessId,
  embedded = false,
  disabled = false,
  extractionController,
  restrictFetchOfferings = false,
}: OfferingsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const offeringsData = useStore(form.store, (state: any) => (state.values?.offeringsList || []) as OfferingRow[]);
  const website = useStore(form.store, (state: any) => state.values?.website || "");
  const primaryLocation = useStore(form.store, (state: any) => state.values?.primaryLocation || "");
  const locationOptions = useBusinessStore((state) => state.profileForm.locationOptions);

  const hasAnyOffering = useMemo(() => {
    return (offeringsData || []).some((o) =>
      Boolean(
        String(o?.name ?? "").trim() ||
          String(o?.description ?? "").trim() ||
          String(o?.link ?? "").trim()
      )
    );
  }, [offeringsData]);

  // Track offerings validation errors
  const [hasOfferingsErrors, setHasOfferingsErrors] = React.useState(false);

  // Update form field when offerings validation errors change
  React.useEffect(() => {
    form.setFieldMeta('offeringsList', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasOfferingsErrors,
    }));
  }, [hasOfferingsErrors, form]);

  // Offerings extractor hook (optionally controlled by parent)
  const internalExtractor = useOfferingsExtractor(businessId || null);
  const {
    startExtraction,
    isExtracting,
    extractionError,
    clearExtraction,
  } = extractionController ?? internalExtractor;
  const guardFetchOfferings = useFeatureActionGuard("profile.fetchOfferings");

  // Only own the merge when this form owns the extractor. When a parent supplies
  // the controller it also applies the results, so they land even while this
  // section is unmounted.
  useApplyExtractedOfferings({
    form,
    extractionController: internalExtractor,
    enabled: !extractionController,
  });

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

  // Handle fetch offerings from website
  const handleFetchOfferings = useCallback(async () => {
    if (disabled) return;
    if (restrictFetchOfferings && !guardFetchOfferings()) return;
    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }

    const trimmedPrimaryLocation = String(primaryLocation || "").trim();
    const context = trimmedPrimaryLocation
      ? (() => {
          const payload = parsePrimaryLocationForPayload(
            trimmedPrimaryLocation,
            locationOptions
          );
          return {
            country: normalizeProfileCountry(payload.Country),
            location: formatPrimaryLocationApiValue(payload),
          };
        })()
      : undefined;

    await startExtraction(website, context);
  }, [
    disabled,
    guardFetchOfferings,
    locationOptions,
    primaryLocation,
    restrictFetchOfferings,
    website,
    startExtraction,
  ]);

  const offeringsTypeInput = (
    <div className="w-1/2">
      <GenericInput<BusinessInfoFormData>
        form={form as any}
        fieldName="offerings"
        type="radio-cards"
        label="What type of offerings do you provide your customers?"
        required={true}
        orientation="horizontal"
        disabled={disabled}
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
  );

  const innerContent = (
    <div className="space-y-7">
        {embedded ? (
          offeringsTypeInput
        ) : (
          <Card variant="noBorderShadowCard">
            <CardContent>{offeringsTypeInput}</CardContent>
          </Card>
        )}
        <Card variant="noBorderShadowCard">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle>
                <FieldLabel className="gap-0">
                  <span className="text-destructive mr-0.5">*</span>
                  What products and services does your business sell?
                </FieldLabel>
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchOfferings}
                      disabled={disabled || isExtracting || !website}
                      className="min-w-[200px]"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : hasAnyOffering ? (
                        "Fetch more from Website"
                      ) : (
                        "Fetch Offerings from Website"
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(isExtracting || !website) && (
                  <TooltipContent>
                    Fill website URL to fetch offerings
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full md:w-3/4">
            {isExtracting ? (
              <div className="rounded-lg border border-general-border-three bg-white px-6 py-8">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-general-primary" />
                    <Typography variant="h6" className="text-general-foreground">
                      Extracting offerings
                    </Typography>
                  </div>
                  <Typography
                    variant="small"
                    className="text-general-muted-foreground/70 max-w-[420px]"
                  >
                    We’re pulling your products/services from the website in the background.
                    You can continue to the next steps while this runs.
                  </Typography>
                </div>
              </div>
            ) : (
              <>
                {extractionError ? (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                      <Typography variant="small" className="text-destructive">
                        {extractionError}
                      </Typography>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearExtraction}
                      className="shrink-0"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Dismiss
                    </Button>
                  </div>
                ) : null}
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
              </>
            )}
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

