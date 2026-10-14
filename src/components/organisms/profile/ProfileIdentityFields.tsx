"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";
import { GenericInput } from "@/components/ui/generic-input";
import { useBusinessStore } from "@/store/business-store";
import { SERVICE_AREA_TYPE_OPTIONS } from "@/utils/profile-catalog";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { cn } from "@/lib/utils";

export function ProfileIdentityFields({
  form,
  disabled = false,
  initialFieldsLocked = false,
  deriveName = false,
  className,
}: {
  form: any;
  disabled?: boolean;
  initialFieldsLocked?: boolean;
  deriveName?: boolean;
  className?: string;
}) {
  const { locationOptions, locationsLoading } = useBusinessStore(
    (state) => state.profileForm,
  );
  const values = useStore(
    form.store,
    (state: any) => state.values as BusinessInfoFormData,
  );
  const lastDerivedName = useRef("");
  useEffect(() => {
    if (!deriveName || disabled) return;
    const derived = deriveBusinessNameFromWebsite(values.website);
    if (
      !values.businessName.trim() ||
      values.businessName === lastDerivedName.current
    ) {
      form.setFieldValue("businessName", derived);
    }
    lastDerivedName.current = derived;
  }, [deriveName, disabled, form, values.website, values.businessName]);

  return (
    <div className={cn("grid gap-4", className)}>
      <GenericInput<BusinessInfoFormData>
        form={form}
        fieldName="website"
        label="Website"
        required
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="example.com"
        disabled={disabled || initialFieldsLocked}
      />
      <GenericInput<BusinessInfoFormData>
        form={form}
        fieldName="businessName"
        label="Business name"
        required
        placeholder="Business name"
        disabled={disabled}
      />
      <GenericInput<BusinessInfoFormData>
        form={form}
        fieldName="primaryLocation"
        type="location-select"
        label="Primary location"
        required
        options={locationOptions}
        placeholder={
          locationsLoading ? "Loading locations…" : "Select primary location"
        }
        loading={locationsLoading}
        disabled={disabled || initialFieldsLocked || locationsLoading}
      />
      <GenericInput<BusinessInfoFormData>
        form={form}
        fieldName="serviceAreaType"
        type="select"
        label="Service area type"
        required
        options={[...SERVICE_AREA_TYPE_OPTIONS]}
        placeholder="Select service area type"
        disabled={disabled || initialFieldsLocked}
      />
    </div>
  );
}
