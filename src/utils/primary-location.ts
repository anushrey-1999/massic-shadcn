import type { LocationOption } from "@/store/business-store";

function normalizeLocationComparable(text: string): string {
  return formatLocationLabel(text).toLowerCase().replace(/\s+/g, " ");
}

function toTitleCase(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized.replace(/(^|[\s-])[a-z]/g, (match) => match.toUpperCase());
}

/** Matches the label shown in LocationSelect for a raw API location value. */
export function formatLocationLabel(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map(toTitleCase).join(", ");
}

function resolveLocationDisplayText(
  selectedValue: string,
  locationOptions?: LocationOption[]
): string {
  const trimmed = String(selectedValue || "").trim();
  if (!trimmed) return "";

  const match = locationOptions?.find(
    (opt) => !opt.disabled && opt.value !== "" && opt.value === trimmed
  );
  if (match?.label) return match.label;

  return formatLocationLabel(trimmed);
}

export type PrimaryLocationPayload = {
  Location: string;
  Country: string;
};

/** Converts a selected location value into API payload fields using the display label. */
export function parsePrimaryLocationForPayload(
  selectedValue: string,
  locationOptions?: LocationOption[]
): PrimaryLocationPayload {
  const displayText = resolveLocationDisplayText(selectedValue, locationOptions);
  const locationParts = displayText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const country =
    locationParts.length >= 2
      ? locationParts[locationParts.length - 1]
      : "United States";

  const location =
    locationParts.length >= 2
      ? locationParts.slice(0, -1).join(", ")
      : locationParts[0] || "";

  return { Location: location, Country: country };
}

/** Maps saved profile/API location text back to a LocationSelect option value. */
export function resolvePrimaryLocationFormValue(
  savedValue: string,
  locationOptions?: LocationOption[]
): string {
  const candidate = String(savedValue || "").trim();
  if (!candidate) return "";

  const validOptions = (locationOptions || []).filter(
    (opt) => !opt.disabled && opt.value !== ""
  );

  const exactValue = validOptions.find((opt) => opt.value === candidate);
  if (exactValue) return exactValue.value;

  const exactLabel = validOptions.find((opt) => opt.label === candidate);
  if (exactLabel) return exactLabel.value;

  const normalizedCandidate = normalizeLocationComparable(candidate);
  const fuzzyMatch = validOptions.find(
    (opt) =>
      normalizeLocationComparable(opt.value) === normalizedCandidate ||
      normalizeLocationComparable(opt.label) === normalizedCandidate
  );
  if (fuzzyMatch) return fuzzyMatch.value;

  return candidate;
}

export function primaryLocationFromProfile(
  primaryLocation:
    | {
        Location?: string;
        Country?: string;
      }
    | null
    | undefined,
  locationOptions?: LocationOption[]
): string {
  const location = String(primaryLocation?.Location || "").trim();
  if (!location) return "";

  const country = String(primaryLocation?.Country || "").trim();
  const combined =
    country && country.toLowerCase() !== location.toLowerCase()
      ? `${location},${country}`
      : location;

  return resolvePrimaryLocationFormValue(combined, locationOptions);
}
