import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";
import { isValidWebsiteUrl } from "@/utils/utils";

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

export function validateInitialProfileFields(
  values: BusinessInfoFormData
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  if (!isValidWebsiteUrl(String(values.website ?? ""))) {
    issues.push({
      field: "website",
      label: "Website",
      message: "Enter a valid website URL.",
      section: "identity",
    });
  }
  if (!String(values.primaryLocation ?? "").trim()) {
    issues.push({
      field: "primaryLocation",
      label: "Primary location",
      message: "Select a primary location.",
      section: "identity",
    });
  }
  if (!String(values.serviceAreaType ?? "").trim()) {
    issues.push({
      field: "serviceAreaType",
      label: "Service area type",
      message: "Select a service area type.",
      section: "identity",
    });
  }
  return issues;
}

export function validateStrategyProfileFields(
  values: BusinessInfoFormData
): ProfileValidationIssue[] {
  const issues = validateInitialProfileFields(values).map((issue) =>
    issue.field === "serviceAreaType"
      ? { ...issue, section: "service-areas" as const }
      : issue
  );

  if (!String(values.businessName ?? "").trim()) {
    issues.push({
      field: "businessName",
      label: "Business name",
      message: "Add a business name.",
      section: "identity",
    });
  }
  if (
    !(values.offeringsList ?? []).some((offering) =>
      Boolean(String(offering?.name ?? "").trim())
    )
  ) {
    issues.push({
      field: "offeringsList",
      label: "Offerings",
      message: "Add at least one offering with a name.",
      section: "offerings",
    });
  }
  return issues;
}

function definitionFor(
  field: keyof BusinessInfoFormData,
  sectionMode: "minimal" | "full" = "full"
): ProfileFieldDefinition {
  if (field === "serviceAreaType" && sectionMode === "minimal") {
    return {
      ...PROFILE_FIELD_DEFINITIONS.serviceAreaType,
      section: "identity",
    };
  }
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
  options: {
    offerings?: boolean;
    ctas?: boolean;
    sectionMode?: "minimal" | "full";
    visibleSections?: ProfileSectionId[];
  } = {}
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  const parsed = businessInfoSchema.safeParse(values);
  const sectionMode = options.sectionMode ?? "full";
  const isVisible = (section: ProfileSectionId) =>
    !options.visibleSections || options.visibleSections.includes(section);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof BusinessInfoFormData | undefined;
      if (!field) continue;
      const definition = definitionFor(field, sectionMode);
      if (!isVisible(definition.section)) continue;
      issues.push({
        field,
        label: definition.label,
        message: issue.message,
        section: definition.section,
      });
    }
  }

  if (!String(values.serviceAreaType ?? "").trim()) {
    const definition = definitionFor("serviceAreaType", sectionMode);
    issues.push({
      field: "serviceAreaType",
      label: definition.label,
      message: "Select a service area type.",
      section: definition.section,
    });
  }

  if (options.offerings) {
    const definition = definitionFor("offeringsList", sectionMode);
    issues.push({
      field: "offeringsList",
      label: definition.label,
      message: "Fix the highlighted offering errors.",
      section: definition.section,
    });
  }

  if (options.ctas && isVisible("positioning")) {
    const definition = definitionFor("ctas", sectionMode);
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
