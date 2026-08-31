/**
 * Canonical shape of `BusinessProfile.Locations`, mirroring
 * `src/utils/businessLocations.util.js` in the Node API.
 *
 * The column holds one array discriminated by `Kind`:
 *   - `gbp` is a linked Google Business Profile location. `Name` is the Google
 *     resource name (`locations/{id}`) and is what every GBP-backed feature keys on.
 *   - `physical` is an address the business operates from, edited on the profile page.
 *
 * Each write path replaces only its own kind, so the two never overwrite each other.
 */
export const LOCATION_KINDS = {
  GBP: "gbp",
  PHYSICAL: "physical",
} as const;

export type LocationKind = (typeof LOCATION_KINDS)[keyof typeof LOCATION_KINDS];

export interface BusinessLocationAddress {
  Line1: string | null;
  Line2: string | null;
  City: string | null;
  Region: string | null;
  PostalCode: string | null;
  Country: string | null;
  Landmark: string | null;
}

export interface BusinessLocation {
  Id: string;
  Kind: LocationKind;
  DisplayName: string | null;
  /** Google resource name `locations/{id}`; null for physical addresses. */
  Name: string | null;
  /** Google account resource name `accounts/{id}`; null for physical addresses. */
  AccountName: string | null;
  Url: string | null;
  Address: BusinessLocationAddress | null;
  TimeZone: string | null;
}

/** A GBP location guaranteed to carry its Google resource name. */
export type GbpBusinessLocation = BusinessLocation & { Name: string };

const ADDRESS_DISPLAY_ORDER: Array<keyof BusinessLocationAddress> = [
  "Line1",
  "Line2",
  "Landmark",
  "City",
  "Region",
  "PostalCode",
  "Country",
];

function toEntries(locations: unknown): BusinessLocation[] {
  return Array.isArray(locations) ? (locations as BusinessLocation[]) : [];
}

/**
 * Linked GBP locations. Entries missing a resource name are dropped because every
 * GBP-backed feature addresses locations by it.
 */
export function gbpLocations(locations: unknown): GbpBusinessLocation[] {
  return toEntries(locations).filter(
    (location): location is GbpBusinessLocation =>
      location?.Kind === LOCATION_KINDS.GBP && Boolean(location.Name)
  );
}

/** Addresses the business operates from, as edited on the business profile page. */
export function physicalLocations(locations: unknown): BusinessLocation[] {
  return toEntries(locations).filter(
    (location) => location?.Kind === LOCATION_KINDS.PHYSICAL
  );
}

export function hasGbpLink(locations: unknown): boolean {
  return gbpLocations(locations).length > 0;
}

/** Extracts the numeric id from a `locations/{id}` resource name. */
export function gbpLocationId(location: Pick<BusinessLocation, "Name">): string {
  const name = (location.Name || "").trim();
  return name.includes("/") ? name.split("/").pop() || name : name;
}

/** Single-line address for a location, or "" when no address is recorded. */
export function formatLocationAddress(location: BusinessLocation): string {
  if (!location.Address) return "";
  return ADDRESS_DISPLAY_ORDER.map((field) => (location.Address?.[field] || "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Display label, falling back to the address and then the GBP id. */
export function formatLocationLabel(location: BusinessLocation): string {
  return (
    (location.DisplayName || "").trim() ||
    formatLocationAddress(location) ||
    gbpLocationId(location)
  );
}
