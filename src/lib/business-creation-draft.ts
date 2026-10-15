import { z } from "zod";
import {
  businessConnectionSchema,
  connectionFromLinkedBusiness,
} from "@/lib/business-connections";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import type { BusinessProfile } from "@/store/business-store";
import type { LinkedBusiness } from "@/hooks/use-linked-businesses";
import { profileFormDefaults } from "@/utils/profile-form-mappers";
import { normalizeWebsiteUrl } from "@/utils/utils";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import { businessDomain } from "@/lib/business-domain-match";

const PREFIX = "massic:business-creation:v1:";
const MAX_AGE = 24 * 60 * 60 * 1000;

// Persist only identity needed to verify/resume the created record, not its profile or auth data.
const createdBusinessSchema = z.object({
  UniqueId: z.string().min(1),
  Name: z.string().default(""),
  Website: z.string().optional(),
  LinkedAuthId: z.string().nullable().optional(),
  IsPitch: z.boolean().optional(),
});

export const creationProgressSchema = z.object({
  createAttempted: z.boolean(),
  preExistingIds: z.array(z.string()),
  business: createdBusinessSchema.nullable(),
  profileSaved: z.boolean(),
  savedIdentity: z.string().optional(),
  jobCreated: z.boolean(),
});
export type CreationProgress = z.infer<typeof creationProgressSchema>;
export const emptyCreationProgress = (): CreationProgress => ({
  createAttempted: false,
  preExistingIds: [],
  business: null,
  profileSaved: false,
  jobCreated: false,
});

// These are the only editable values on this screen. Avoid schema validation of
// required fields here: unfinished drafts must also survive a refresh.
const draftValuesSchema = businessInfoSchema
  .pick({
    businessName: true,
    website: true,
    primaryLocation: true,
    serviceAreaType: true,
  })
  .partial()
  .extend({
    businessName: z.string(),
    website: z.string(),
    primaryLocation: z.string(),
  });

const draftSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    ownerId: z.string().min(1),
    updatedAt: z.number(),
    connection: businessConnectionSchema,
    values: draftValuesSchema,
    progress: creationProgressSchema,
  })
  .superRefine((draft, context) => {
    if (
      businessDomain(draft.values.website) !==
      businessDomain(draft.connection.siteUrl)
    ) {
      context.addIssue({
        code: "custom",
        message: "The website no longer matches the selected Google property.",
      });
    }
    if (
      (draft.progress.profileSaved || draft.progress.jobCreated) &&
      !draft.progress.business
    ) {
      context.addIssue({
        code: "custom",
        message: "Setup progress is missing its business identity.",
      });
    }
  });
export type BusinessCreationDraft = z.infer<typeof draftSchema>;

export function creationOwnerId(user: Record<string, unknown> | null): string {
  return String(
    user?.accountUniqueId ?? user?.uniqueId ?? user?.UniqueId ?? user?.id ?? "",
  );
}

export function writeCreationDraft(
  draft: BusinessCreationDraft,
): BusinessCreationDraft {
  const safe = draftSchema.parse({ ...draft, updatedAt: Date.now() });
  try {
    sessionStorage.setItem(
      `${PREFIX}${safe.ownerId}:${safe.id}`,
      JSON.stringify(safe),
    );
  } catch {
    throw new Error(
      "Couldn't save setup progress in this tab. Allow browser storage and retry.",
    );
  }
  return safe;
}

export function readCreationDraft(
  ownerId: string,
  id: string,
): BusinessCreationDraft {
  let parsed: BusinessCreationDraft;
  try {
    parsed = draftSchema.parse(
      JSON.parse(sessionStorage.getItem(`${PREFIX}${ownerId}:${id}`) ?? "null"),
    );
  } catch {
    throw new Error(
      "This business setup is unavailable. Return to Settings and accept the business again.",
    );
  }
  if (
    parsed.ownerId !== ownerId ||
    parsed.id !== id ||
    Date.now() - parsed.updatedAt > MAX_AGE
  ) {
    throw new Error(
      "This business setup has expired. Return to Settings and accept the business again.",
    );
  }
  return parsed;
}

export function clearCreationDraft(ownerId: string, id: string) {
  try {
    sessionStorage.removeItem(`${PREFIX}${ownerId}:${id}`);
  } catch {
    throw new Error(
      "Couldn't clear setup progress in this tab. Allow browser storage and retry.",
    );
  }
}

export function startLinkedCreationDraft(
  ownerId: string,
  row: LinkedBusiness,
): BusinessCreationDraft {
  const website = normalizeWebsiteUrl(row.siteUrl);
  return writeCreationDraft({
    version: 1,
    id: crypto.randomUUID(),
    ownerId,
    updatedAt: Date.now(),
    connection: connectionFromLinkedBusiness(row),
    values: {
      businessName:
        row.title?.trim() ||
        row.displayName?.trim() ||
        deriveBusinessNameFromWebsite(website),
      website,
      primaryLocation: "",
      serviceAreaType: undefined,
    },
    progress: emptyCreationProgress(),
  });
}

export function creationDraftValues(
  draft: BusinessCreationDraft,
): BusinessInfoFormData {
  return { ...profileFormDefaults, ...draft.values };
}

export function resumableBusiness(
  business: BusinessProfile,
): CreationProgress["business"] {
  return createdBusinessSchema.parse(business);
}
