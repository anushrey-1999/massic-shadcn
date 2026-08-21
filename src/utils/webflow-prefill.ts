import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type {
  WebflowOnboardingPrefill,
  WebflowPrefillOffering,
} from "@/hooks/use-webflow-onboarding";
import type { OfferingRow } from "@/store/business-store";

export interface WebflowPrefillSummary {
  filledLabels: string[];
  offeringCount: number;
  skippedLabels: string[];
}

function isBlankString(value: unknown) {
  return !String(value ?? "").trim();
}

/**
 * Table-backed fields keep an empty placeholder row once the user interacts with them, so a
 * list of entirely blank rows must still count as empty for prefill purposes.
 */
function isBlankRowList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return true;
  return value.every((row) => {
    if (row === null || row === undefined) return true;
    if (typeof row === "string") return isBlankString(row);
    return Object.values(row as Record<string, unknown>).every((entry) =>
      Array.isArray(entry) ? entry.length === 0 : isBlankString(entry),
    );
  });
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toOfferingRow(offering: WebflowPrefillOffering): OfferingRow {
  const link = String(offering.link || "").trim();
  return {
    name: String(offering.name || ""),
    description: String(offering.description || ""),
    // The offerings schema rejects anything that is not a parseable URL, so a malformed
    // Webflow link is dropped rather than blocking the create action.
    link: isAbsoluteHttpUrl(link) ? link : "",
    offeringType: String(offering.offeringType || ""),
    priceRange: String(offering.priceRange || ""),
    duration: String(offering.duration || ""),
    inclusions: Array.isArray(offering.inclusions) ? offering.inclusions : [],
    pricePositioning: "",
  } as OfferingRow;
}

/**
 * Copies Webflow-sourced values into the create-business form.
 *
 * Only fields the user has left empty are written, so re-running the import after manual
 * edits can never discard their work.
 */
export function applyWebflowPrefill(
  form: any,
  prefill: WebflowOnboardingPrefill,
): WebflowPrefillSummary {
  const values = (form.state?.values ?? {}) as Partial<BusinessInfoFormData>;
  const filledLabels: string[] = [];
  const skippedLabels: string[] = [];

  const setText = (
    fieldName: keyof BusinessInfoFormData,
    label: string,
    incoming: string,
  ) => {
    if (!String(incoming || "").trim()) return;
    if (!isBlankString(values[fieldName])) {
      skippedLabels.push(label);
      return;
    }
    form.setFieldValue(fieldName, incoming);
    filledLabels.push(label);
  };

  const setList = (
    fieldName: keyof BusinessInfoFormData,
    label: string,
    incoming: unknown[],
  ) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    if (!isBlankRowList(values[fieldName])) {
      skippedLabels.push(label);
      return;
    }
    form.setFieldValue(fieldName, incoming);
    filledLabels.push(label);
  };

  const { profile, offerings } = prefill;

  setText("businessName", "Business name", profile.businessName);
  setText("businessDescription", "Description", profile.businessDescription);
  setText("logoUrl", "Logo", profile.logoUrl);
  setText("supportEmail", "Support email", profile.supportEmail);

  setList("brandTerms", "Brand terms", profile.brandTerms);
  setList("imagePhotoLibrary", "Images", profile.imagePhotoLibrary);
  setList("stakeholders", "Team", profile.stakeholders);
  setList("detailedLocations", "Locations", profile.detailedLocations);
  setList("awardsCertifications", "Awards", profile.awardsCertifications);
  setList("licensesCompliance", "Licenses", profile.licensesCompliance);

  if (offerings.type && isBlankString(values.offerings)) {
    form.setFieldValue("offerings", offerings.type);
  }

  const offeringRows = (offerings.items || []).map(toOfferingRow);
  if (offeringRows.length > 0) {
    if (isBlankRowList(values.offeringsList)) {
      form.setFieldValue("offeringsList", offeringRows);
      filledLabels.push(
        `${offeringRows.length} ${offeringRows.length === 1 ? "offering" : "offerings"}`,
      );
    } else {
      skippedLabels.push("Offerings");
    }
  }

  return {
    filledLabels,
    skippedLabels,
    offeringCount: offeringRows.length,
  };
}

export function describeWebflowPrefillSources(
  prefill: WebflowOnboardingPrefill | null | undefined,
) {
  return (prefill?.detection?.selected ?? [])
    .map((entry) => entry.collectionName)
    .filter((name): name is string => Boolean(name));
}
