import { api } from "@/hooks/use-api";

type ProfileCell<T = unknown> = {
  value?: T;
  [key: string]: unknown;
};

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
  serviceAreaType?: string;
  serviceAreas: string[];
  competitors: string[];
  ctas: Array<{ text: string; url: string }>;
  offerings: Array<Record<string, unknown>>;
  colorsFontsCss?: string;
  imagePhotoLibrary: string[];
  socialProfiles: Array<{ platform: string; url: string }>;
  directoryProfiles: Array<{ name: string; url: string }>;
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

function normalizeOfferings(value: unknown): Array<Record<string, unknown>> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .filter(isObject);
}

function normalizeProfileLinks(
  value: unknown,
  nameKey: "platform" | "name"
): Array<{ platform: string; url: string } | { name: string; url: string }> {
  const unwrapped = unwrapProfileCell(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped
    .map((item) => unwrapProfileCell(item))
    .map((item) => {
      if (isObject(item)) {
        const url = toStringValue(item.url ?? item.href ?? item.link);
        const name = toStringValue(item[nameKey] ?? item.name ?? item.platform);
        return url ? { [nameKey]: name, url } : null;
      }
      const url = toStringValue(item);
      return url ? { [nameKey]: "", url } : null;
    })
    .filter(Boolean) as Array<{ platform: string; url: string } | { name: string; url: string }>;
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
  imagePhotoLibrary: string[];
} {
  const assets = unwrapProfileCell(value);
  if (!isObject(assets)) return { imagePhotoLibrary: [] };
  const colors = toStringValue(assets.colors);
  const fonts = toStringValue(assets.fonts);
  const css = toStringValue(assets.css);
  const summary = [
    colors ? `Colors: ${colors}` : "",
    fonts ? `Fonts: ${fonts}` : "",
    css ? `CSS: ${css}` : "",
  ].filter(Boolean).join("\n");
  const images = toStringArray(
    assets.image_library ?? assets.images ?? assets.photos ?? assets.photo_library
  );
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
    locations: toStringArray(firstValue(result, ["locations", "location"])),
    serviceAreaType:
      toStringValue(firstValue(result, ["service_area_type"])) ||
      toStringValue(response.metadata?.service_area_type) ||
      undefined,
    serviceAreas: normalizeServiceAreas(firstValue(result, ["service_areas"])),
    competitors: toStringArray(firstValue(result, ["competitors"])),
    ctas: normalizeCtas(firstValue(result, ["ctas"])),
    offerings: normalizeOfferings(firstValue(result, ["offerings"])),
    colorsFontsCss: brandAssets.colorsFontsCss,
    imagePhotoLibrary: brandAssets.imagePhotoLibrary,
    socialProfiles: normalizeProfileLinks(
      firstValue(result, ["social_profiles"]),
      "platform"
    ) as Array<{ platform: string; url: string }>,
    directoryProfiles: normalizeProfileLinks(
      firstValue(result, ["directory_profiles"]),
      "name"
    ) as Array<{ name: string; url: string }>,
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
}> {
  return offerings
    .map((offering) => ({
      name: toStringValue(offering.name ?? offering.offering),
      description: toStringValue(offering.description),
      link: toStringValue(offering.page_url ?? offering.url ?? offering.link),
      pricePositioning: toStringValue(offering.price_positioning ?? offering.priceRange),
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
