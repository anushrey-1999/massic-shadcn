import type { SearchableSelectOption } from "@/components/ui/searchable-select";

export function normalizeCatalogValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function buildCatalogOptions(
  values: string[],
  selectedValues: string[] = [],
): SearchableSelectOption[] {
  const canonicalByKey = new Map<string, string>();

  for (const value of [...values, ...selectedValues]) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const key = normalizeCatalogValue(trimmed);
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, trimmed);
  }

  return Array.from(canonicalByKey.values())
    .map((value) => ({ value, label: value }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

export function isCatalogIndustry(
  value: string,
  industries: readonly string[],
): boolean {
  return industries.includes(value.trim());
}

export function resolveCatalogValue(
  value: string,
  options: SearchableSelectOption[],
): string {
  const key = normalizeCatalogValue(value);
  return (
    options.find((option) => normalizeCatalogValue(option.value) === key)
      ?.value ?? value.trim()
  );
}

export const SERVICE_AREA_TYPE_OPTIONS = [
  { value: "international", label: "International" },
  { value: "national", label: "National" },
  { value: "state_regional", label: "State-Regional" },
  { value: "city_local", label: "City/Local" },
] as const;
