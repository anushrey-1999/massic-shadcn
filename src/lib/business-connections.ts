import { z } from "zod";
import { LOCATION_KINDS } from "@/lib/business-locations";
import type { LinkedBusiness } from "@/hooks/use-linked-businesses";

export const businessConnectionSchema = z.object({
  authId: z.string().min(1),
  siteUrl: z.string().min(1),
  selectedGa4: z.object({ propertyId: z.string().min(1) }).optional(),
  ga4PagePathScope: z.string().nullable().optional(),
  ga4Cleared: z.boolean(),
  selectedGbp: z.array(
    z.object({
      title: z.string(),
      locationId: z.string(),
      location: z.string(),
      account: z.string().optional(),
      websiteUri: z.string().optional(),
    }),
  ),
  gbpCleared: z.boolean(),
  noLocation: z.boolean(),
});

export type BusinessConnection = z.infer<typeof businessConnectionSchema>;

/** Snapshot explicit selections, never the fuzzy alternatives or OAuth data. */
export function connectionFromLinkedBusiness(
  row: LinkedBusiness,
): BusinessConnection {
  return businessConnectionSchema.parse({
    authId: row.authId,
    siteUrl: row.siteUrl,
    selectedGa4: row.selectedGa4,
    ga4PagePathScope: row.ga4PagePathScope,
    ga4Cleared: row.ga4Cleared === true,
    selectedGbp: row.selectedGbp ?? [],
    gbpCleared: row.gbpCleared === true,
    noLocation: row.noLocation === true,
  });
}

export function toGbpLocationPayload(
  selection: Pick<
    BusinessConnection,
    "selectedGbp" | "gbpCleared" | "noLocation"
  >,
) {
  if (selection.noLocation || selection.gbpCleared) return [];
  return selection.selectedGbp.map((gbp) => ({
    Kind: LOCATION_KINDS.GBP,
    DisplayName: gbp.title,
    Url: gbp.websiteUri ?? "",
    Name: gbp.location,
    AccountName: gbp.account ?? "",
  }));
}

export function businessConnectionPayload(connection: BusinessConnection) {
  const propertyId = connection.ga4Cleared
    ? ""
    : (connection.selectedGa4?.propertyId ?? "");
  return {
    propertyId,
    ...(propertyId && connection.ga4PagePathScope !== undefined
      ? { ga4PagePathScope: connection.ga4PagePathScope }
      : {}),
    locations: toGbpLocationPayload(connection),
    NoLocationExist: connection.noLocation,
  };
}
