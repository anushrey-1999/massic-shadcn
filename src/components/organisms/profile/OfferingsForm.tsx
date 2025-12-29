"use client";

import React, { useMemo, useEffect, useCallback, useRef } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  businessId?: string | null; // Business ID for offerings extraction
}

export const OfferingsForm = ({
  form,
  businessId,
}: OfferingsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const offeringsData = useStore(form.store, (state: any) => (state.values?.offeringsList || []) as OfferingRow[]);
  const website = useStore(form.store, (state: any) => state.values?.website || "");

  // Track offerings validation errors
  const [hasOfferingsErrors, setHasOfferingsErrors] = React.useState(false);

  // Update form field when offerings validation errors change
  React.useEffect(() => {
    form.setFieldMeta('offeringsList', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasOfferingsErrors,
    }));
  }, [hasOfferingsErrors, form]);

  // Offerings extractor hook
  const {
    startExtraction,
    isExtracting,
    extractedOfferings,
    extractionStatus,
    clearExtraction,
    taskId,
    extractionData,
  } = useOfferingsExtractor(businessId || null);

  // Track processed taskId to avoid duplicate processing
  const processedTaskIdRef = useRef<string | null>(null);

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

  // Handle fetch offerings from website
  const handleFetchOfferings = useCallback(async () => {
    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }

    await startExtraction(website);
  }, [website, startExtraction]);

  // Merge extracted offerings with existing ones when extraction completes
  useEffect(() => {
    // Process when:
    // 1. Status is "completed" OR
    // 2. We have extractionData with offerings (API might return data without status field)
    const hasCompletedStatus = extractionStatus === "completed";
    const hasOfferingsData = extractionData?.offerings && Array.isArray(extractionData.offerings) && extractionData.offerings.length > 0;
    const shouldProcess = taskId && (hasCompletedStatus || hasOfferingsData);
    
    if (!shouldProcess) return;

    // Avoid processing the same extraction twice
    if (processedTaskIdRef.current === taskId) {
      return;
    }

    // Get offerings from extractionData if available and has items, otherwise use extractedOfferings
    // Prefer extractionData.offerings as it's the raw API response
    const rawOfferings = 
      (extractionData?.offerings && Array.isArray(extractionData.offerings) && extractionData.offerings.length > 0)
        ? extractionData.offerings
        : (extractedOfferings && extractedOfferings.length > 0)
        ? extractedOfferings
        : [];
    
    if (rawOfferings.length === 0) {
      toast.warning("No offerings found on the website");
      processedTaskIdRef.current = taskId;
      clearExtraction();
      return;
    }

    // Transform raw offerings to our format
    const offeringsArray = Array.isArray(rawOfferings) ? rawOfferings : [rawOfferings];
    
    const transformedOfferings = offeringsArray
      .map((offering: any) => ({
        name: (offering.name || offering.offering || "").trim(),
        description: (offering.description || "").trim(),
        link: (offering.url || offering.link || "").trim(),
      }))
      .filter((offering) => offering.name !== ""); // Filter out empty names

    if (transformedOfferings.length === 0) {
      toast.warning("No valid offerings found on the website");
      processedTaskIdRef.current = taskId;
      clearExtraction();
      return;
    }

    // Mark this task as processed
    processedTaskIdRef.current = taskId;

    // Get existing offerings - preserve all existing ones
    const existingOfferings = offeringsData || [];
    
    // Filter out only completely empty offerings
    const validExistingOfferings = existingOfferings.filter(
      (offering) => offering && (offering.name?.trim() || offering.description?.trim() || offering.link?.trim())
    );

    // Combine existing and extracted offerings
    const combinedOfferings = [...validExistingOfferings, ...transformedOfferings];

    // Remove duplicates based on name (case-insensitive)
    const uniqueOfferings = combinedOfferings.filter(
      (offering, index, self) =>
        index ===
        self.findIndex(
          (o) =>
            o.name.toLowerCase().trim() === offering.name.toLowerCase().trim() &&
            offering.name.trim() !== ""
        )
    );

    // Calculate counts for toast message
    const existingCount = validExistingOfferings.length;
    const newCount = transformedOfferings.length;
    const totalCount = uniqueOfferings.length;
    const duplicateCount = newCount - (totalCount - existingCount);

    // Update form with merged offerings
    form.setFieldValue("offeringsList", uniqueOfferings);

    // Show toast message
    if (duplicateCount > 0) {
      toast.success(
        `Added ${newCount - duplicateCount} new offerings from website (${duplicateCount} duplicates skipped). Total: ${totalCount} offerings.`
      );
    } else {
      toast.success(
        `Added ${newCount} new offerings from website. Total: ${totalCount} offerings.`
      );
    }

    // Clear extraction state after processing
    clearExtraction();
  }, [extractionStatus, extractionData, extractedOfferings, offeringsData, form, clearExtraction, taskId]);

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
        <Card variant="profileCard" className="relative">
          {/* Loading overlay for offerings extraction */}
          {isExtracting && (
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-lg">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <Typography variant="h6" className="text-primary">
                  Extracting offerings from website...
                </Typography>
                <Typography variant="small" className="text-muted-foreground mt-2">
                  This may take a few minutes. You can continue editing other fields.
                </Typography>
              </div>
            </div>
          )}
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle>
                <FieldLabel className="gap-0">
                  <span className="text-destructive mr-0.5">*</span>
                  What products and services does your business sell?
                </FieldLabel>
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchOfferings}
                disabled={isExtracting || !website}
                className="min-w-[200px]"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : offeringsData.length > 0 ? (
                  "Add More from Website"
                ) : (
                  "Fetch Offerings from Website"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={offeringsColumns}
              data={offeringsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add Product/Service"
              onValidationChange={setHasOfferingsErrors}
                showErrorsWithoutTouch={hasOfferingsErrors}
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

