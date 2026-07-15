import { api } from "@/hooks/use-api";

type ProfileCell<T = unknown> = {
  value?: T;
  [key: string]: unknown;
};

export type StructuredServiceArea = {
  name: string;
  kind?: string;
  rank?: number;
};

export type StructuredProfileLocation = {
  display?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  map_url?: string;
  hours?: unknown;
  special_hours?: unknown;
};

type ImageLibraryItem = string | { alt?: string; url: string };

type ProfileStatusResponse = {
  status?: "success" | "error" | "processing" | "pending" | string;
  profile_id?: string;
  metadata?: {
    profile_id?: string;
    [key: string]: unknown;
  };
  result?: Record<string, unknown>;
  profile_autofill?: Record<string, unknown>;
  error?: string | null;
  message?: string | null;
  detail?: string | null;
  errors?: string | string[] | null;
  [key: string]: unknown;
};

export type NormalizedProfileResult = {
  profileId?: string;
  businessUrl?: string;
  legalName?: string;
  brand?: string;
  businessCategory?: string;
  yearFounded?: string;
  logoUrl?: string;
  siteName?: string;
  alternateName?: string;
  siteSearchUrlPattern?: string;
  serve?: "local" | "online" | "both";
  serviceType?: "physical" | "online" | "both";
  sell?: "products" | "services" | "both";
  ltv?: "high" | "low";
  b2bB2c?: string;
  segment?: string;
  country?: string;
  location?: string;
  brandTerms: string[];
  webBrandVoice: string[];
  socialBrandVoice: string[];
  usps: string[];
  locations: string[];
  structuredLocations: StructuredProfileLocation[];
  serviceAreaType?: string;
  serviceAreas: string[];
  structuredServiceAreas: StructuredServiceArea[];
  competitors: string[];
  ctas: Array<{ text: string; url: string }>;
  offerings: Array<Record<string, unknown>>;
  colorsFontsCss?: string;
  imagePhotoLibrary: ImageLibraryItem[];
  socialProfiles: Array<{ url: string }>;
  directoryProfiles: Array<{ url: string }>;
  supportEmail?: string;
  licenses: string[];
  awards: string[];
  aggregateRating?: { rating: string; count: string };
  keyPeople: Array<{ name: string; role: string; bio: string }>;
  testimonials: string[];
  raw: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function unwrapProfileCell<T = unknown>(value: unknown): T | unknown {
  if (isObject(value) && "value" in value) {
    return (value as ProfileCell<T>).value;
  }
  return value;
}

function resultFromResponse(response: ProfileStatusResponse): Record<string, unknown> {
  if (isObject(response.result)) return response.result;
  if (isObject(response.profile_autofill)) return response.profile_autofill;
  return response as Record<string, unknown>;
}

function firstValue(result: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = result[key];
    if (value !== undefined && value !== null) return unwrapProfileCell(value);
  }
  return undefined;
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toStringArray(value: unknown): string[] {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .map((item) => toStringValue(item))
    .filter(Boolean);
}

function normalizeServe(value: unknown): NormalizedProfileResult["serve"] {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === "both" || normalized === "hybrid") return "both";
  if (normalized === "online") return "online";
  if (normalized === "local") return "local";
  return undefined;
}

function normalizeSell(value: unknown): NormalizedProfileResult["sell"] {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === "both") return "both";
  if (normalized === "service" || normalized === "services") return "services";
  if (normalized === "product" || normalized === "products") return "products";
  return undefined;
}

function normalizeLtv(value: unknown): NormalizedProfileResult["ltv"] {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === "high" || normalized === "low") return normalized;
  return undefined;
}

function serviceTypeFromServe(
  serve: NormalizedProfileResult["serve"]
): NormalizedProfileResult["serviceType"] {
  if (serve === "local") return "physical";
  if (serve === "online") return "online";
  if (serve === "both") return "both";
  return undefined;
}

function normalizeCtas(value: unknown): Array<{ text: string; url: string }> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => {
      const cta = unwrapProfileCell(item);
      if (!isObject(cta)) return null;
      const text = toStringValue(cta.text ?? cta.buttonText);
      const url = toStringValue(cta.url);
      return text && url ? { text, url } : null;
    })
    .filter((cta): cta is { text: string; url: string } => Boolean(cta));
}

function normalizeServiceAreas(value: unknown): string[] {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => {
      const area = unwrapProfileCell(item);
      const name = isObject(area)
        ? toStringValue(unwrapProfileCell(area.name))
        : toStringValue(area);
      const rank = isObject(area)
        ? Number(unwrapProfileCell(area.rank))
        : Number.NaN;
      return { name, rank };
    })
    .filter((area) => Boolean(area.name))
    .sort((a, b) => {
      if (Number.isFinite(a.rank) && Number.isFinite(b.rank)) return a.rank - b.rank;
      if (Number.isFinite(a.rank)) return -1;
      if (Number.isFinite(b.rank)) return 1;
      return 0;
    })
    .map((area) => area.name);
}

function normalizeStructuredServiceAreas(value: unknown): StructuredServiceArea[] {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item, index) => {
      const area = unwrapProfileCell(item);
      if (isObject(area)) {
        const name = toStringValue(unwrapProfileCell(area.name));
        const kind = toStringValue(unwrapProfileCell(area.kind));
        const rawRank = Number(unwrapProfileCell(area.rank));
        return {
          name,
          kind: kind || undefined,
          rank: Number.isFinite(rawRank) ? rawRank : index + 1,
        };
      }
      const name = toStringValue(area);
      return { name, rank: index + 1 };
    })
    .filter((area) => Boolean(area.name))
    .sort((a, b) => {
      if (Number.isFinite(a.rank) && Number.isFinite(b.rank)) {
        return Number(a.rank) - Number(b.rank);
      }
      return 0;
    });
}

function normalizeStructuredLocations(value: unknown): StructuredProfileLocation[] {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .map((item): StructuredProfileLocation | null => {
      if (!isObject(item)) {
        const display = toStringValue(item);
        return display ? { display } : null;
      }
      const location = {
        display: toStringValue(item.display ?? item.name ?? item.DisplayName),
        street_address: toStringValue(item.street_address ?? item.streetAddress ?? item.address),
        city: toStringValue(item.city),
        state: toStringValue(item.state),
        postal_code: toStringValue(item.postal_code ?? item.postalCode ?? item.zip),
        country: toStringValue(item.country),
        phone: toStringValue(item.phone),
        email: toStringValue(item.email),
        map_url: toStringValue(item.map_url ?? item.mapUrl ?? item.mapLink),
        hours: item.hours,
        special_hours: item.special_hours ?? item.specialHours ?? item.holidayHours,
      };
      const compacted = Object.fromEntries(
        Object.entries(location).filter(([, entry]) => {
          if (Array.isArray(entry)) return entry.length > 0;
          return entry !== undefined && entry !== null && String(entry).trim() !== "";
        })
      ) as StructuredProfileLocation;
      return Object.keys(compacted).length > 0 ? compacted : null;
    })
    .filter((location): location is StructuredProfileLocation => Boolean(location));
}

function normalizeLocationNames(value: unknown): string[] {
  const structuredLocations = normalizeStructuredLocations(value);
  if (structuredLocations.length > 0) {
    return structuredLocations
      .map((location) =>
        toStringValue(
          location.display ||
            [location.city, location.state, location.country].filter(Boolean).join(", ")
        )
      )
      .filter(Boolean);
  }
  return toStringArray(value);
}

function normalizeOfferings(value: unknown): Array<Record<string, unknown>> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .filter(isObject);
}

function normalizeProfileLinks(value: unknown): Array<{ url: string }> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .map((item) => {
      if (isObject(item)) {
        const url = toStringValue(item.url ?? item.href ?? item.link);
        return url ? { url } : null;
      }
      const url = toStringValue(item);
      return url ? { url } : null;
    })
    .filter((item): item is { url: string } => Boolean(item));
}

function normalizeKeyPeople(value: unknown): Array<{ name: string; role: string; bio: string }> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .map((item) => {
      if (!isObject(item)) return null;
      const name = toStringValue(item.name);
      const role = toStringValue(item.role ?? item.title);
      const bio = toStringValue(item.bio ?? item.description);
      return name || role || bio ? { name, role, bio } : null;
    })
    .filter((person): person is { name: string; role: string; bio: string } =>
      Boolean(person)
    );
}

function normalizeAggregateRating(value: unknown): { rating: string; count: string } | undefined {
  const rating = unwrapProfileCell(value);
  if (!isObject(rating)) {
    const ratingText = toStringValue(rating);
    return ratingText ? { rating: ratingText, count: "" } : undefined;
  }
  const ratingValue = toStringValue(
    rating.ratingValue ?? rating.rating ?? rating.value
  );
  const reviewCount = toStringValue(
    rating.reviewCount ?? rating.count ?? rating.ratingCount
  );
  return ratingValue || reviewCount
    ? { rating: ratingValue, count: reviewCount }
    : undefined;
}

function normalizeBrandAssets(value: unknown): {
  colorsFontsCss?: string;
  imagePhotoLibrary: ImageLibraryItem[];
} {
  const assets = unwrapProfileCell(value);
  if (!isObject(assets)) return { imagePhotoLibrary: [] };
  const colors = toStringValue(assets.colors);
  const fonts = toStringValue(assets.fonts);
  const css = toStringValue(assets.css);
  const stylesheets = toStringArray(assets.stylesheets);
  const summary = [
    colors ? `Colors: ${colors}` : "",
    fonts ? `Fonts: ${fonts}` : "",
    css ? `CSS: ${css}` : "",
    ...stylesheets,
  ].filter(Boolean).join("\n");
  const imageSource = unwrapProfileCell(
    assets.image_library ?? assets.images ?? assets.photos ?? assets.photo_library
  );
  const images = Array.isArray(imageSource)
    ? imageSource
        .map((item): ImageLibraryItem | null => {
          const unwrapped = unwrapProfileCell(item);
          if (typeof unwrapped === "string") return unwrapped.trim() || null;
          if (isObject(unwrapped)) {
            const url = toStringValue(unwrapProfileCell(unwrapped.url ?? unwrapped.src ?? unwrapped.href));
            const alt = toStringValue(unwrapProfileCell(unwrapped.alt));
            return url ? { alt, url } : null;
          }
          return null;
        })
        .filter((item): item is ImageLibraryItem => Boolean(item))
    : [];
  return {
    colorsFontsCss: summary || undefined,
    imagePhotoLibrary: images,
  };
}

export function normalizeProfileResult(
  response: ProfileStatusResponse
): NormalizedProfileResult {
  const result = resultFromResponse(response);
  const serve = normalizeServe(firstValue(result, ["serve", "market"]));
  const sell = normalizeSell(firstValue(result, ["sell", "offering_type"]));
  const ltv = normalizeLtv(firstValue(result, ["ltv"]));
  const segment = firstValue(result, ["segment"]);
  const brandAssets = normalizeBrandAssets(firstValue(result, ["brand_assets"]));
  const aggregateRating = normalizeAggregateRating(
    firstValue(result, ["aggregate_rating"])
  );

  return {
    profileId:
      toStringValue(response.profile_id) ||
      toStringValue(response.metadata?.profile_id) ||
      toStringValue(firstValue(result, ["profile_id"])) ||
      undefined,
    businessUrl:
      toStringValue(firstValue(result, ["business_url", "website_url", "url"])) ||
      toStringValue(response.business_url) ||
      undefined,
    legalName:
      toStringValue(firstValue(result, ["legal_business_name", "legal_name"])) ||
      undefined,
    brand: toStringValue(firstValue(result, ["brand", "business_name"])) || undefined,
    businessCategory:
      toStringValue(firstValue(result, ["business_category", "business_type"])) || undefined,
    yearFounded:
      toStringValue(firstValue(result, ["year_founded", "founding_date", "foundingDate"])) ||
      undefined,
    logoUrl: toStringValue(firstValue(result, ["logo_url", "logo"])) || undefined,
    siteName:
      toStringValue(firstValue(result, ["site_name", "WebSite.name"])) || undefined,
    alternateName:
      toStringValue(firstValue(result, ["alternate_name", "alternateName"])) || undefined,
    siteSearchUrlPattern:
      toStringValue(firstValue(result, ["site_search_url_pattern"])) || undefined,
    serve,
    serviceType: serviceTypeFromServe(serve),
    sell,
    ltv,
    b2bB2c: toStringValue(firstValue(result, ["b2b_b2c"])) || undefined,
    segment: segment !== undefined && segment !== null ? String(segment) : undefined,
    country: toStringValue(firstValue(result, ["country"])) || undefined,
    location: toStringValue(firstValue(result, ["location"])) || undefined,
    brandTerms: toStringArray(firstValue(result, ["brand_terms"])),
    webBrandVoice: toStringArray(firstValue(result, ["web_brand_voice", "tone_web", "web_tone"])),
    socialBrandVoice: toStringArray(firstValue(result, ["social_brand_voice", "social_tone"])),
    usps: toStringArray(firstValue(result, ["usps"])),
    locations: normalizeLocationNames(firstValue(result, ["locations", "location"])),
    structuredLocations: normalizeStructuredLocations(
      firstValue(result, ["locations", "location"])
    ),
    serviceAreaType:
      toStringValue(firstValue(result, ["service_area_type"])) ||
      toStringValue(response.metadata?.service_area_type) ||
      undefined,
    serviceAreas: normalizeServiceAreas(firstValue(result, ["service_areas"])),
    structuredServiceAreas: normalizeStructuredServiceAreas(
      firstValue(result, ["service_areas"])
    ),
    competitors: toStringArray(firstValue(result, ["competitors"])),
    ctas: normalizeCtas(firstValue(result, ["ctas"])),
    offerings: normalizeOfferings(firstValue(result, ["offerings"])),
    colorsFontsCss: brandAssets.colorsFontsCss,
    imagePhotoLibrary: brandAssets.imagePhotoLibrary,
    socialProfiles: normalizeProfileLinks(firstValue(result, ["social_profiles"])),
    directoryProfiles: normalizeProfileLinks(firstValue(result, ["directory_profiles"])),
    supportEmail: toStringValue(firstValue(result, ["support_email"])) || undefined,
    licenses: toStringArray(firstValue(result, ["licenses"])),
    awards: toStringArray(firstValue(result, ["awards"])),
    aggregateRating,
    keyPeople: normalizeKeyPeople(firstValue(result, ["key_people"])),
    testimonials: toStringArray(firstValue(result, ["testimonials"])),
    raw: result,
  };
}

export function profileOfferingsToRows(
  offerings: Array<Record<string, unknown>>
): Array<{
  name: string;
  description: string;
  link: string;
  pricePositioning: string;
  offeringType: string;
  priceRange: string;
  duration: string;
  inclusions: string[];
}> {
  return offerings
    .map((offering) => ({
      name: toStringValue(offering.name ?? offering.offering),
      description: toStringValue(offering.description),
      link: toStringValue(offering.page_url ?? offering.url ?? offering.link),
      pricePositioning: toStringValue(offering.price_positioning ?? offering.priceRange),
      offeringType: toStringValue(offering.offering_type ?? offering.offeringType),
      priceRange: toStringValue(offering.price_range ?? offering.priceRange),
      duration: toStringValue(offering.duration),
      inclusions: Array.isArray(offering.inclusions)
        ? offering.inclusions.map((item) => toStringValue(item)).filter(Boolean)
        : toStringValue(offering.inclusions)
          ? toStringValue(offering.inclusions)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
          : [],
    }))
    .filter((offering) => Boolean(offering.name));
}

function getProfileErrorMessage(response: ProfileStatusResponse): string {
  const errors = response.errors;
  if (Array.isArray(errors) && errors.length > 0) return String(errors[0]);
  return toStringValue(response.error || response.message || response.detail);
}

function isProfileSuccessStatus(status: unknown): boolean {
  return toStringValue(status).toLowerCase() === "success";
}

function isProfileErrorStatus(status: unknown): boolean {
  const normalized = toStringValue(status).toLowerCase();
  return normalized === "error" || normalized === "failed" || normalized === "failure";
}

export function normalizeProfileCountry(value: unknown): string {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return "us";
  if (normalized === "united states" || normalized === "usa" || normalized === "u.s.") {
    return "us";
  }
  return normalized;
}

export async function createAndPollProfileResult(
  businessUrl: string,
  options?: {
    country?: string;
    location?: string;
    serviceAreaType?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }
): Promise<NormalizedProfileResult> {
  const timeoutMs = options?.timeoutMs ?? 300000;
  const intervalMs = options?.intervalMs ?? 5000;
  const country = toStringValue(options?.country) || "us";
  const location = toStringValue(options?.location);
  const serviceAreaType = toStringValue(options?.serviceAreaType) || "city_local";
  const created = await api.post<ProfileStatusResponse>(
    "/tools/profile",
    "python",
    {
      website_url: businessUrl,
      country,
      location,
      service_area_type: serviceAreaType,
    },
    { timeout: timeoutMs }
  );

  if (isProfileSuccessStatus(created.status) || created.result || created.profile_autofill) {
    return normalizeProfileResult(created);
  }

  const profileId =
    toStringValue(created.profile_id) ||
    toStringValue(created.metadata?.profile_id) ||
    toStringValue((created as Record<string, unknown>).id);

  if (!profileId) {
    const message = getProfileErrorMessage(created);
    throw new Error(message || "Failed to start profile generation");
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await api.get<ProfileStatusResponse>(
      `/tools/profile?profile_id=${encodeURIComponent(profileId)}`,
      "python",
      { timeout: timeoutMs }
    );

    if (isProfileSuccessStatus(response.status)) {
      return normalizeProfileResult({
        ...response,
        profile_id: response.profile_id || profileId,
        metadata: {
          ...(response.metadata ?? {}),
          profile_id: response.metadata?.profile_id || profileId,
        },
      });
    }

    if (isProfileErrorStatus(response.status)) {
      const message = getProfileErrorMessage(response);
      throw new Error(message || "Profile generation failed");
    }

    await sleep(intervalMs);
  }

  throw new Error("Profile generation timed out");
}
