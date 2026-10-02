import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";

export type ProfileSectionId =
  | "identity"
  | "classification"
  | "locations"
  | "service-areas"
  | "offerings"
  | "positioning"
  | "trust-people"
  | "channels"
  | "competitors";

type ProfileFieldDefinition = {
  label: string;
  section: ProfileSectionId;
  required?: boolean;
  immutableAfterJob?: boolean;
};

export const PROFILE_FIELD_DEFINITIONS = {
  website: {
    label: "Website",
    section: "identity",
    required: true,
    immutableAfterJob: true,
  },
  businessName: {
    label: "Business name",
    section: "identity",
    required: true,
  },
  primaryLocation: {
    label: "Primary location",
    section: "identity",
    required: true,
    immutableAfterJob: true,
  },
  serviceAreaType: {
    label: "Service area type",
    section: "service-areas",
    required: true,
    immutableAfterJob: true,
  },
  offeringsList: {
    label: "Offerings",
    section: "offerings",
    required: true,
  },
  primaryCategory: {
    label: "Primary category",
    section: "classification",
  },
  secondaryCategory: {
    label: "Secondary category",
    section: "classification",
  },
  businessDescription: {
    label: "Business description",
    section: "positioning",
  },
  ctas: {
    label: "Calls to action",
    section: "positioning",
  },
  supportEmail: {
    label: "Support email",
    section: "channels",
  },
  commsEmail: {
    label: "Communications email",
    section: "channels",
  },
  competitors: {
    label: "Competitors",
    section: "competitors",
  },
} satisfies Partial<Record<keyof BusinessInfoFormData, ProfileFieldDefinition>>;

export type ProfileValidationIssue = {
  field: keyof BusinessInfoFormData;
  label: string;
  message: string;
  section: ProfileSectionId;
};

function definitionFor(
  field: keyof BusinessInfoFormData
): ProfileFieldDefinition {
  return (
    PROFILE_FIELD_DEFINITIONS[
      field as keyof typeof PROFILE_FIELD_DEFINITIONS
    ] ?? {
      label: String(field),
      section: "identity" as const,
    }
  );
}

export function validateProfileForm(
  values: BusinessInfoFormData,
  tableErrors: { offerings?: boolean; ctas?: boolean } = {}
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  const parsed = businessInfoSchema.safeParse(values);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof BusinessInfoFormData | undefined;
      if (!field) continue;
      const definition = definitionFor(field);
      issues.push({
        field,
        label: definition.label,
        message: issue.message,
        section: definition.section,
      });
    }
  }

  if (!String(values.serviceAreaType ?? "").trim()) {
    const definition = definitionFor("serviceAreaType");
    issues.push({
      field: "serviceAreaType",
      label: definition.label,
      message: "Select a service area type.",
      section: definition.section,
    });
  }

  const hasOffering = (values.offeringsList ?? []).some((offering) =>
    Boolean(String(offering?.name ?? "").trim())
  );
  if (!hasOffering || tableErrors.offerings) {
    const definition = definitionFor("offeringsList");
    issues.push({
      field: "offeringsList",
      label: definition.label,
      message: tableErrors.offerings
        ? "Fix the highlighted offering errors."
        : "Add at least one offering with a name.",
      section: definition.section,
    });
  }

  if (tableErrors.ctas) {
    const definition = definitionFor("ctas");
    issues.push({
      field: "ctas",
      label: definition.label,
      message: "Fix the highlighted call-to-action errors.",
      section: definition.section,
    });
  }

  return issues.filter(
    (issue, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.field === issue.field &&
          candidate.message === issue.message
      ) === index
  );
}

export function countIssuesBySection(
  issues: ProfileValidationIssue[]
): Partial<Record<ProfileSectionId, number>> {
  return issues.reduce<Partial<Record<ProfileSectionId, number>>>(
    (counts, issue) => {
      counts[issue.section] = (counts[issue.section] ?? 0) + 1;
      return counts;
    },
    {}
  );
}
