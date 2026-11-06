export const WEB_PAGE_TYPES = [
  "offering",
  "offering_collection",
  "audience",
  "use_case_need",
  "pricing",
  "alternative",
  "location",
  "service_area",
  "comparison",
  "editorial",
  "brand",
] as const;

export type WebPageType = (typeof WEB_PAGE_TYPES)[number];
export type WebPageContentType = "blog" | "page";
export type WebPageQuickTypeFilter = "all" | "editorial" | "other" | "custom";

export const WEB_PAGE_TYPE_LABELS: Record<WebPageType, string> = {
  offering: "Offering",
  offering_collection: "Offering Collection",
  audience: "Audience",
  use_case_need: "Use Case / Need",
  pricing: "Pricing",
  alternative: "Alternative",
  location: "Location",
  service_area: "Service Area",
  comparison: "Comparison",
  editorial: "Editorial",
  brand: "Brand",
};

export const WEB_PAGE_TYPE_OPTIONS = WEB_PAGE_TYPES.map((value) => ({
  label: WEB_PAGE_TYPE_LABELS[value],
  value,
}));

export const NON_EDITORIAL_WEB_PAGE_TYPES = WEB_PAGE_TYPES.filter(
  (pageType): pageType is Exclude<WebPageType, "editorial"> =>
    pageType !== "editorial"
);

const WEB_PAGE_TYPE_SET = new Set<string>(WEB_PAGE_TYPES);

export function parseWebPageType(value: unknown): WebPageType | null {
  return typeof value === "string" && WEB_PAGE_TYPE_SET.has(value)
    ? (value as WebPageType)
    : null;
}

export function getWebPageContentType(value: unknown): WebPageContentType | null {
  const pageType = parseWebPageType(value);
  if (!pageType) return null;
  return pageType === "editorial" ? "blog" : "page";
}

export function getWebPageQuickTypeFilter(
  operator: string | undefined,
  value: string | string[] | undefined,
): WebPageQuickTypeFilter {
  if (value === undefined) return "all";
  if (operator !== "inArray") return "custom";

  const values = Array.isArray(value) ? value : [value];
  if (values.length === 1 && values[0] === "editorial") return "editorial";

  return values.length === NON_EDITORIAL_WEB_PAGE_TYPES.length &&
    NON_EDITORIAL_WEB_PAGE_TYPES.every((pageType) => values.includes(pageType))
    ? "other"
    : "custom";
}

export function getWebPageTypesForQuickFilter(
  filter: WebPageQuickTypeFilter,
): WebPageType[] | null {
  if (filter === "editorial") return ["editorial"];
  if (filter === "other") return [...NON_EDITORIAL_WEB_PAGE_TYPES];
  return null;
}
