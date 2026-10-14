"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@tanstack/react-form";

import { CustomSelect } from "@/components/molecules/settings/CustomSelect";
import { FieldLabel } from "@/components/ui/field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Typography } from "@/components/ui/typography";
import { useIndustries, useSpecialties } from "@/hooks/use-profile-v2";
import {
  buildCatalogOptions,
  normalizeCatalogValue,
  resolveCatalogValue,
} from "@/utils/profile-catalog";

interface ProfileCategoryFieldsProps {
  form: any;
  disabled?: boolean;
  className?: string;
}

const CUSTOMER_TYPE_OPTIONS = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
];

export function ProfileCategoryFields({
  form,
  disabled = false,
  className = "flex flex-col gap-6",
}: ProfileCategoryFieldsProps) {
  const primaryCategory = useStore(
    form.store,
    (state: any) => String(state.values?.primaryCategory ?? "")
  );
  const secondaryCategory = useStore(
    form.store,
    (state: any) => String(state.values?.secondaryCategory ?? "")
  );
  const categoriesTagged = useStore(
    form.store,
    (state: any) =>
      Array.isArray(state.values?.categoriesTagged)
        ? state.values.categoriesTagged
        : []
  ) as string[];
  const customerTypes = useStore(
    form.store,
    (state: any) =>
      Array.isArray(state.values?.customerTypes)
        ? state.values.customerTypes
        : []
  ) as string[];

  const industriesQuery = useIndustries();
  const specialtiesQuery = useSpecialties(primaryCategory);
  const allSpecialtiesQuery = useSpecialties();

  const industryOptions = useMemo(
    () => buildCatalogOptions(industriesQuery.data ?? [], [primaryCategory]),
    [industriesQuery.data, primaryCategory]
  );
  const specialtyOptions = useMemo(
    () =>
      buildCatalogOptions(specialtiesQuery.data ?? [], [secondaryCategory]),
    [secondaryCategory, specialtiesQuery.data]
  );
  const taggedOptions = useMemo(
    () => buildCatalogOptions(allSpecialtiesQuery.data ?? [], categoriesTagged),
    [allSpecialtiesQuery.data, categoriesTagged]
  );

  const handlePrimaryCategoryChange = useCallback(
    (nextValue: string) => {
      const resolved = resolveCatalogValue(nextValue, industryOptions);
      if (
        normalizeCatalogValue(resolved) !==
        normalizeCatalogValue(primaryCategory)
      ) {
        form.setFieldValue("secondaryCategory", "");
      }
      form.setFieldValue("primaryCategory", resolved);
    },
    [form, industryOptions, primaryCategory]
  );

  const handleSecondaryCategoryChange = useCallback(
    (nextValue: string) => {
      form.setFieldValue(
        "secondaryCategory",
        resolveCatalogValue(nextValue, specialtyOptions)
      );
    },
    [form, specialtyOptions]
  );

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <FieldLabel>Primary category</FieldLabel>
        <SearchableSelect
          value={resolveCatalogValue(primaryCategory, industryOptions)}
          options={industryOptions}
          onChange={handlePrimaryCategoryChange}
          placeholder="Select industry"
          searchPlaceholder="Search industries..."
          emptyMessage="No industries found"
          loading={industriesQuery.isLoading}
          error={
            industriesQuery.isError ? "Industries could not be loaded." : null
          }
          onRetry={() => void industriesQuery.refetch()}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel>Secondary category</FieldLabel>
        <SearchableSelect
          value={resolveCatalogValue(secondaryCategory, specialtyOptions)}
          options={specialtyOptions}
          onChange={handleSecondaryCategoryChange}
          placeholder={
            primaryCategory
              ? "Select specialty"
              : "Select a primary category first"
          }
          searchPlaceholder="Search specialties..."
          emptyMessage="No specialties found for this industry"
          loading={specialtiesQuery.isLoading}
          error={
            specialtiesQuery.isError
              ? "Specialties could not be loaded."
              : null
          }
          onRetry={() => void specialtiesQuery.refetch()}
          disabled={disabled || !primaryCategory}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="small" className="text-sm font-medium">
          Categories tagged
        </Typography>
        <CustomSelect
          options={taggedOptions}
          value={categoriesTagged}
          onChange={(next) => form.setFieldValue("categoriesTagged", next)}
          placeholder={
            allSpecialtiesQuery.isLoading
              ? "Loading specialties..."
              : "Select specialties"
          }
          searchPlaceholder="Search specialties..."
          emptyMessage="No specialties found"
          maxWidth="100%"
          className="rounded-md border-input bg-white text-general-foreground shadow-none"
          disabled={disabled}
          loading={allSpecialtiesQuery.isLoading}
        />
        {allSpecialtiesQuery.isError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <span>Tagged categories could not be loaded.</span>
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => void allSpecialtiesQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="small" className="text-sm font-medium">
          Customer types
        </Typography>
        <CustomSelect
          options={CUSTOMER_TYPE_OPTIONS}
          value={customerTypes}
          onChange={(next) => form.setFieldValue("customerTypes", next)}
          placeholder="Select customer types"
          maxWidth="100%"
          className="rounded-md border-input bg-white text-general-foreground shadow-none"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
