"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  industryCatalogQueryOptions,
  useIndustries,
  useSpecialties,
} from "./use-profile-v2";
import { isCatalogIndustry } from "@/utils/profile-catalog";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import {
  validatePrimaryCategory,
  validateProfileForm,
  validateStrategyProfileFields,
  type ProfileSectionId,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";

/** One catalog-backed rule for existing values, field errors, and submit gates. */
export function useProfileValidation(
  values: BusinessInfoFormData,
  storedPrimaryCategory: string | undefined,
  sectionMode: "minimal" | "full",
) {
  const client = useQueryClient();
  const catalogRequired =
    Boolean(values.primaryCategory || storedPrimaryCategory) ||
    sectionMode === "full";
  const catalog = useIndustries(catalogRequired);
  const specialtiesRequired =
    sectionMode === "full" &&
    isCatalogIndustry(storedPrimaryCategory ?? "", catalog.data ?? []);
  const specialties = useSpecialties(
    storedPrimaryCategory,
    specialtiesRequired,
  );
  const taggedCategories = useSpecialties(undefined, sectionMode === "full");
  const catalogLoading =
    (catalogRequired && (catalog.isPending || catalog.isFetching)) ||
    (specialtiesRequired &&
      (specialties.isPending || specialties.isFetching)) ||
    (sectionMode === "full" &&
      (taggedCategories.isPending || taggedCategories.isFetching));
  const catalogError =
    (catalogRequired && catalog.error) ||
    (specialtiesRequired && specialties.error) ||
    (sectionMode === "full" && taggedCategories.error) ||
    undefined;
  const refetchCatalogs = () =>
    Promise.allSettled([
      ...(catalogRequired ? [catalog.refetch({ throwOnError: true })] : []),
      ...(specialtiesRequired
        ? [specialties.refetch({ throwOnError: true })]
        : []),
      ...(sectionMode === "full"
        ? [taggedCategories.refetch({ throwOnError: true })]
        : []),
    ]);
  const repairPrimaryCategory =
    validatePrimaryCategory(storedPrimaryCategory, catalog.data).length > 0;
  const visibleSections: ProfileSectionId[] | undefined =
    sectionMode === "full"
      ? undefined
      : [
          "identity",
          "offerings",
          "competitors",
          ...(repairPrimaryCategory ? ["classification" as const] : []),
        ];
  const options = { sectionMode, visibleSections, industries: catalog.data };
  const catalogIssues = validatePrimaryCategory(
    values.primaryCategory,
    catalog.data,
  );

  const validate = async (
    submitted: BusinessInfoFormData,
    action: "save" | "analysis",
  ) => {
    // Never write or run against an unverified nonempty category while the catalog loads.
    const industries = submitted.primaryCategory?.trim()
      ? await client.fetchQuery(industryCatalogQueryOptions())
      : catalog.data;
    const resolvedOptions = { ...options, industries };
    // Catalog reads can finish during submission: validate the just-revealed repair field too.
    if (
      sectionMode === "minimal" &&
      validatePrimaryCategory(storedPrimaryCategory, industries).length
    ) {
      resolvedOptions.visibleSections = [
        ...(visibleSections ?? []),
        "classification",
      ];
    }
    return action === "analysis"
      ? validateStrategyProfileFields(submitted, resolvedOptions)
      : validateProfileForm(submitted, resolvedOptions);
  };

  const displayIssues = (submissionIssues: ProfileValidationIssue[]) => [
    ...submissionIssues.filter((issue) => issue.field !== "primaryCategory"),
    ...catalogIssues,
  ];
  return {
    catalogIssues,
    repairPrimaryCategory,
    options,
    validate,
    displayIssues,
    catalogLoading,
    catalogError,
    refetchCatalogs,
  };
}
