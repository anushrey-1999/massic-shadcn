import type { SearchableSelectOption } from "@/components/ui/searchable-select";

export function normalizeCatalogValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function buildCatalogOptions(
  values: string[],
  selectedValues: string[] = []
): SearchableSelectOption[] {
  const canonicalByKey = new Map<string, string>();

  for (const value of [...selectedValues, ...values]) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const key = normalizeCatalogValue(trimmed);
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, trimmed);
  }

  return Array.from(canonicalByKey.values())
    .map((value) => ({ value, label: value }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
    );
}

export function resolveCatalogValue(
  value: string,
  options: SearchableSelectOption[]
): string {
  const key = normalizeCatalogValue(value);
  return options.find(
    (option) => normalizeCatalogValue(option.value) === key
  )?.value ?? value.trim();
}
