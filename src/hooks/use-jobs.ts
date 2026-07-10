import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { formatPrimaryLocationApiValue } from "@/utils/primary-location";
import { isWorkflowActive } from "@/lib/workflow-status";
import { normalizeProfileCountry } from "@/utils/profile-result";

const JOBS_KEY = "jobs";

// Type for offerings array
export interface Offering {
  name?: string;
  offering?: string;
  description?: string;
  link?: string;
  url?: string;
  page_url?: string;
  price_positioning?: string;
  offering_type?: string;
  offeringType?: string;
  price_range?: string;
  priceRange?: string;
  duration?: string;
  inclusions?: string[] | string;
  [key: string]: unknown;
}

// Type for business profile payload (matching the structure from ProfileTemplate)
export interface BusinessProfilePayload {
  Website?: string;
  Name?: string;
  Description?: string;
  UserDefinedBusinessDescription?: string;
  AOV?: number | string | null;
  LTV?: "high" | "low" | string | null;
  BrandTerms?: string[] | null;
  RecurringFlag?: string | null;
  PrimaryLocation?: {
    Location?: string;
    Country?: string;
  };
  BusinessObjective?: string;
  LocationType?: string;
  USPs?: string[] | null;
  CTAs?: {
    value: string | Array<{ buttonText?: string; text?: string; url?: string }>;
  } | Array<{ buttonText?: string; text?: string; url?: string }> | null;
  SocialBrandVoice?: string[] | null;
  WebBrandVoice?: string[] | null;
  ProfileId?: string | null;
  profile_id?: string | null;
  BusinessCategory?: string | null;
  business_category?: string | null;
  ServiceAreaType?: string | null;
  service_area_type?: string | null;
  ServiceAreas?: string[] | null;
  service_areas?: string[] | null;
  StructuredServiceAreas?: Array<{ name?: string; kind?: string; rank?: number } | string> | null;
  ProfileLocation?: string | null;
  location?: string | null;
  ProfileCountry?: string | null;
  country?: string | null;
  Segment?: string | number | null;
  segment?: string | number | null;
  B2bB2c?: string | null;
  b2b_b2c?: string | null;
  Competitors?: Array<{ website?: string; Website?: string; url?: string }> | string[] | null;
  competitors?: Array<{ website?: string; Website?: string; url?: string }> | string[] | null;
  LegalName?: string | null;
  FoundingDate?: string | null;
  LogoUrl?: string | null;
  SiteName?: string | null;
  AlternateName?: string | null;
  SiteSearchUrlPattern?: string | null;
  Locations?: Array<Record<string, unknown>> | null;
  DetailedLocations?: Array<Record<string, unknown>> | null;
  StructuredLocations?: Array<Record<string, unknown>> | null;
  KeyPeople?: Array<Record<string, unknown>> | null;
  LicensesCompliance?: string[] | null;
  AwardsCertifications?: string[] | null;
  ReviewRating?: string | number | null;
  ReviewCount?: string | number | null;
  Testimonials?: string[] | null;
  ColorsFontsCss?: string | null;
  ImagePhotoLibrary?: Array<string | Record<string, unknown>> | null;
  SocialProfiles?: Array<string | Record<string, unknown>> | null;
  DirectoryProfiles?: Array<string | Record<string, unknown>> | null;
  SupportEmail?: string | null;
  [key: string]: any; // Allow other fields
}

// Type for job response
export interface JobDetails {
  job_id?: string;
  business_id?: string;
  name?: string;
  business_url?: string;
  user_defined_business_description?: string;
  offerings?: Array<{
    name?: string;
    offering?: string;
    description?: string;
    url?: string;
    link?: string;
    offering_type?: string;
    price_range?: string;
    duration?: string;
    inclusions?: string[];
  }>;
  usps?: string[];
  ctas?: Array<{ text?: string; url?: string }> | {
    value: string | Array<{ buttonText?: string; text?: string; url?: string }>;
  };
  social_brand_voice?: string[];
  web_brand_voice?: string[];
  profile_id?: string;
  business_category?: string;
  service_area_type?: string;
  service_areas?: string[];
  workflow_status?: {
    status?: "pending" | "processing" | "success" | "error" | null;
    workflows?: Record<string, "pending" | "processing" | "success" | "error" | string | null>;
    [key: string]: any;
  };
  [key: string]: any;
}

function normalizeServeValue(value: string | undefined): "local" | "online" | "both" {
  const objective = String(value || "local").toLowerCase();
  if (objective === "hybrid" || objective === "both") return "both";
  if (objective === "online") return "online";
  return "local";
}

function normalizeSellValue(value: string | undefined): "products" | "services" | "both" {
  const sell = String(value || "services").toLowerCase();
  if (sell === "both") return "both";
  if (sell === "product" || sell === "products") return "products";
  return "services";
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          return String(entry.Name ?? entry.DisplayName ?? entry.name ?? entry.value ?? "").trim();
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeStringArray(parsed);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeCtas(value: BusinessProfilePayload["CTAs"]): Array<{ text: string; url: string }> {
  if (!value) return [];
  let raw: unknown = value;
  if (!Array.isArray(value) && typeof value === "object" && "value" in value) {
    raw = value.value;
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((cta) => {
      if (!cta || typeof cta !== "object") return null;
      const item = cta as Record<string, unknown>;
      const text = String(item.text ?? item.buttonText ?? "").trim();
      const url = String(item.url ?? "").trim();
      return text && url ? { text, url } : null;
    })
    .filter((cta): cta is { text: string; url: string } => Boolean(cta));
}

function normalizeInclusions(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const inclusions = value.map((item) => String(item).trim()).filter(Boolean);
    return inclusions.length > 0 ? inclusions : undefined;
  }
  if (typeof value === "string") {
    const inclusions = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return inclusions.length > 0 ? inclusions : undefined;
  }
  return undefined;
}

function normalizeOfferings(offerings: Offering[]): Array<Record<string, unknown>> {
  return offerings
    .map((offering) => {
      const name = String(offering.name ?? offering.offering ?? "").trim();
      const description = String(offering.description ?? "").trim();
      const pageUrl = String(offering.page_url ?? offering.url ?? offering.link ?? "").trim();
      const offeringType = String(offering.offering_type ?? offering.offeringType ?? "").trim();
      const priceRange = String(
        offering.price_range ?? offering.priceRange ?? offering.price_positioning ?? ""
      ).trim();
      const duration = String(offering.duration ?? "").trim();
      return compactObject({
        offering: name,
        description: description || undefined,
        url: pageUrl || undefined,
        offering_type: offeringType || undefined,
        price_range: priceRange || undefined,
        duration: duration || undefined,
        inclusions: normalizeInclusions(offering.inclusions),
      });
    })
    .filter((offering) => Boolean(offering.offering));
}

function normalizeAov(value: unknown): number | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function normalizeRecurringFlag(value: unknown): "yes" | "no" | "sometimes" | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "no" || normalized === "sometimes") {
    return normalized;
  }
  if (normalized === "partial") return "sometimes";
  return undefined;
}

function normalizeCompetitors(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const competitors = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const competitor = item as Record<string, unknown>;
        return String(competitor.website ?? competitor.Website ?? competitor.url ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return competitors.length > 0 ? competitors : undefined;
}

function normalizeServiceAreasForJob(value: unknown, fallback: unknown): Array<Record<string, unknown>> | undefined {
  const raw = Array.isArray(value) && value.length > 0 ? value : fallback;
  if (!Array.isArray(raw)) return undefined;
  const areas = raw
    .map((item, index) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, rank: index + 1 } : null;
      }
      if (item && typeof item === "object") {
        const area = item as Record<string, unknown>;
        const name = String(area.name ?? area.value ?? "").trim();
        const kind = String(area.kind ?? "").trim();
        const rank = Number(area.rank);
        return name
          ? compactObject({
            name,
            kind: kind || undefined,
            rank: Number.isFinite(rank) ? rank : index + 1,
          })
          : null;
      }
      const name = String(item ?? "").trim();
      return name ? { name, rank: index + 1 } : null;
    })
    .filter((area): area is Record<string, unknown> => Boolean(area));
  return areas.length > 0 ? areas : undefined;
}

function parseStructuredJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function normalizeLocationsForJob(
  locations: unknown,
  detailedLocations: unknown,
  structuredLocations: unknown
): Array<Record<string, unknown>> | undefined {
  const structured = Array.isArray(structuredLocations) ? structuredLocations : [];
  const detailed = Array.isArray(detailedLocations) ? detailedLocations : [];
  const basic = Array.isArray(locations) ? locations : [];
  const source = structured.length > 0 ? structured : detailed.length > 0 ? detailed : basic;

  const normalized = source
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        const display = String(item ?? "").trim();
        return display ? { display } : null;
      }

      const location = item as Record<string, unknown>;
      const basicLocation = basic[index] as Record<string, unknown> | undefined;
      const display = String(
        location.display ??
          location.DisplayName ??
          location.Name ??
          location.name ??
          basicLocation?.DisplayName ??
          basicLocation?.Name ??
          ""
      ).trim();
      const streetAddress = String(
        location.street_address ??
          location.streetAddress ??
          location.Address1 ??
          location.address ??
          basicLocation?.Address1 ??
          basicLocation?.address ??
          ""
      ).trim();
      const hours = parseStructuredJson(location.hours) ?? location.hours;
      const specialHours =
        parseStructuredJson(location.special_hours ?? location.holidayHours) ??
        location.special_hours ??
        location.holidayHours;

      return compactObject({
        display: display || undefined,
        street_address: streetAddress || undefined,
        city: String(location.city ?? "").trim() || undefined,
        state: String(location.state ?? "").trim() || undefined,
        postal_code:
          String(location.postal_code ?? location.postalCode ?? location.zip ?? "").trim() ||
          undefined,
        country: String(location.country ?? "").trim() || undefined,
        phone: String(location.phone ?? "").trim() || undefined,
        email: String(location.email ?? "").trim() || undefined,
        map_url: String(location.map_url ?? location.mapUrl ?? location.mapLink ?? "").trim() || undefined,
        hours: hours && typeof hours === "object" ? hours : undefined,
        special_hours: specialHours && typeof specialHours === "object" ? specialHours : undefined,
      });
    })
    .filter((location): location is Record<string, unknown> =>
      Boolean(location && Object.keys(location).length > 0)
    );

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeProfileLinks(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const links = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const link = item as Record<string, unknown>;
        return String(link.url ?? link.href ?? link.link ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return links.length > 0 ? links : undefined;
}

function normalizeNonEmptyStringArray(value: unknown): string[] | undefined {
  const values = normalizeStringArray(value);
  return values.length > 0 ? values : undefined;
}

function normalizeKeyPeople(
  value: unknown
): Array<{ name: string; role: string; bio: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  const people = value
    .map((item): { name: string; role: string; bio: string } | null => {
      if (!item || typeof item !== "object") return null;
      const person = item as Record<string, unknown>;
      const name = String(person.name ?? person.personName ?? "").trim();
      const role = String(person.role ?? person.title ?? person.personDescription ?? "").trim();
      const bio = String(person.bio ?? "").trim();
      return name || role || bio ? { name, role, bio } : null;
    })
    .filter((person): person is { name: string; role: string; bio: string } =>
      Boolean(person)
    );
  return people.length > 0 ? people : undefined;
}

function normalizeBrandAssets(payload: BusinessProfilePayload): Record<string, unknown> | undefined {
  const unwrapValue = (value: unknown): unknown => {
    if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).value;
    }
    return value;
  };

  const stylesheets = normalizeStringArray(payload.ColorsFontsCss)
    .flatMap((item) => item.split(/\n+/))
    .map((item) => item.trim())
    .filter(Boolean);
  const imageLibrary = Array.isArray(payload.ImagePhotoLibrary)
    ? payload.ImagePhotoLibrary
      .map((item) => {
        if (typeof item === "string") {
          const url = item.trim();
          return url ? { url } : null;
        }
        if (item && typeof item === "object") {
          const image = item as Record<string, unknown>;
          const url = String(unwrapValue(image.url ?? image.src) ?? "").trim();
          const alt = String(unwrapValue(image.alt) ?? "").trim();
          return url ? compactObject({ url, alt: alt || undefined }) : null;
        }
        return null;
      })
      .filter((item): item is Record<string, unknown> => Boolean(item))
    : [];

  const assets = compactObject({
    stylesheets: stylesheets.length > 0 ? stylesheets : undefined,
    image_library: imageLibrary.length > 0 ? imageLibrary : undefined,
  });
  return Object.keys(assets).length > 0 ? assets : undefined;
}

function mapBusinessProfilePayloadToJobBody(
  businessProfilePayload: BusinessProfilePayload,
  businessId: string,
  offerings: Offering[],
  options?: { includeOfferings?: boolean; isUpdate?: boolean }
): Record<string, unknown> {
  const includeOfferings = options?.includeOfferings !== false;
  const isUpdate = options?.isUpdate === true;

  if (!businessId) {
    throw new Error("Business ID is required");
  }
  if (!isUpdate && !businessProfilePayload.Name) {
    throw new Error("Business name is required");
  }
  if (!isUpdate && !businessProfilePayload.Website) {
    throw new Error("Business website is required");
  }
  const locationValue = formatPrimaryLocationApiValue(
    businessProfilePayload.PrimaryLocation
  );
  if (!isUpdate && !locationValue) {
    throw new Error("Primary location is required");
  }
  const normalizedOfferings = normalizeOfferings(offerings);
  if (!isUpdate && normalizedOfferings.length === 0) {
    throw new Error("At least one offering is required");
  }

  const usps = Array.isArray(businessProfilePayload.USPs)
    ? businessProfilePayload.USPs
    : [];
  const shouldSendUsps = !isUpdate || "USPs" in businessProfilePayload;
  const shouldSendCtas = !isUpdate || "CTAs" in businessProfilePayload;

  const socialBrandVoice = Array.isArray(businessProfilePayload.SocialBrandVoice)
    ? businessProfilePayload.SocialBrandVoice
    : [];
  const shouldSendSocialBrandVoice =
    !isUpdate || "SocialBrandVoice" in businessProfilePayload;

  const webBrandVoice = Array.isArray(businessProfilePayload.WebBrandVoice)
    ? businessProfilePayload.WebBrandVoice
    : [];
  const shouldSendWebBrandVoice =
    !isUpdate || "WebBrandVoice" in businessProfilePayload;

  const aov = (businessProfilePayload as any).AOV ?? (businessProfilePayload as any).aov;
  const ltv = (businessProfilePayload as any).LTV ?? (businessProfilePayload as any).ltv;
  const recurringFlag =
    (businessProfilePayload as any).RecurringFlag ?? (businessProfilePayload as any).recurring_flag;
  const brandTerms = (businessProfilePayload as any).BrandTerms ?? (businessProfilePayload as any).brand_terms;
  const shouldSendBrandTerms =
    !isUpdate ||
    "BrandTerms" in businessProfilePayload ||
    "brand_terms" in businessProfilePayload;
  const ltvStr = ltv != null ? String(ltv).trim().toLowerCase() : "";
  const profileId = businessProfilePayload.ProfileId ?? businessProfilePayload.profile_id;
  const businessCategory =
    businessProfilePayload.BusinessCategory ?? businessProfilePayload.business_category;
  const serviceAreaType =
    businessProfilePayload.ServiceAreaType ?? businessProfilePayload.service_area_type;
  const serviceAreas = normalizeServiceAreasForJob(
    businessProfilePayload.StructuredServiceAreas,
    businessProfilePayload.ServiceAreas ?? businessProfilePayload.service_areas
  );
  const profileLocation =
    businessProfilePayload.ProfileLocation ?? businessProfilePayload.location;
  const country =
    businessProfilePayload.PrimaryLocation?.Country ??
    businessProfilePayload.ProfileCountry ??
    businessProfilePayload.country;
  const segment = businessProfilePayload.Segment ?? businessProfilePayload.segment;
  const b2bB2c = businessProfilePayload.B2bB2c ?? businessProfilePayload.b2b_b2c;
  const competitors =
    businessProfilePayload.Competitors ?? businessProfilePayload.competitors;
  const locations = normalizeLocationsForJob(
    businessProfilePayload.Locations,
    businessProfilePayload.DetailedLocations,
    businessProfilePayload.StructuredLocations
  );
  const aggregateRating = compactObject({
    rating_value:
      businessProfilePayload.ReviewRating !== undefined &&
      businessProfilePayload.ReviewRating !== null &&
      String(businessProfilePayload.ReviewRating).trim() !== ""
        ? String(businessProfilePayload.ReviewRating).trim()
        : undefined,
    review_count:
      businessProfilePayload.ReviewCount !== undefined &&
      businessProfilePayload.ReviewCount !== null &&
      String(businessProfilePayload.ReviewCount).trim() !== ""
        ? String(businessProfilePayload.ReviewCount).trim()
        : undefined,
  });
  const brandAssets = normalizeBrandAssets(businessProfilePayload);

  const body: Record<string, unknown> = compactObject({
    business_id: isUpdate ? undefined : businessId,
    name: businessProfilePayload.Name,
    business_url: businessProfilePayload.Website,
    brand: businessProfilePayload.Name,
    location: locationValue || profileLocation || undefined,
    country: country ? normalizeProfileCountry(country) : undefined,
    user_defined_business_description:
      businessProfilePayload.UserDefinedBusinessDescription ||
      businessProfilePayload.Description ||
      undefined,
    serve: businessProfilePayload.BusinessObjective
      ? normalizeServeValue(businessProfilePayload.BusinessObjective)
      : undefined,
    sell: businessProfilePayload.LocationType
      ? normalizeSellValue(businessProfilePayload.LocationType)
      : undefined,
    usps: shouldSendUsps ? usps : undefined,
    ctas: shouldSendCtas ? normalizeCtas(businessProfilePayload.CTAs) : undefined,
    social_brand_voice: shouldSendSocialBrandVoice
      ? socialBrandVoice
        .map((s) => s.toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
        .slice(0, 3)
      : undefined,
    web_brand_voice: shouldSendWebBrandVoice
      ? webBrandVoice
        .map((s) => s.toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
        .slice(0, 3)
      : undefined,
    trigger_workflow: false,
    aov: normalizeAov(aov),
    ltv: ltvStr === "high" || ltvStr === "low" ? ltvStr : undefined,
    recurring_flag: normalizeRecurringFlag(recurringFlag),
    brand_terms: shouldSendBrandTerms
      ? Array.isArray(brandTerms)
        ? brandTerms.map((t) => String(t).trim()).filter((t) => t.length > 0)
        : []
      : undefined,
    profile_id: profileId || undefined,
    business_category: businessCategory || undefined,
    service_area_type: serviceAreaType || undefined,
    service_areas: serviceAreas,
    locations,
    segment: segment !== undefined && segment !== null ? String(segment) : undefined,
    b2b_b2c: b2bB2c || undefined,
    competitors: normalizeCompetitors(competitors),
    legal_business_name: businessProfilePayload.LegalName || undefined,
    year_founded: businessProfilePayload.FoundingDate || undefined,
    site_name: businessProfilePayload.SiteName || undefined,
    alternate_name: businessProfilePayload.AlternateName || undefined,
    site_search_url_pattern: businessProfilePayload.SiteSearchUrlPattern || undefined,
    logo_url: businessProfilePayload.LogoUrl || undefined,
    support_email: businessProfilePayload.SupportEmail || undefined,
    social_profiles: normalizeProfileLinks(businessProfilePayload.SocialProfiles),
    directory_profiles: normalizeProfileLinks(businessProfilePayload.DirectoryProfiles),
    licenses: normalizeNonEmptyStringArray(businessProfilePayload.LicensesCompliance),
    testimonials: normalizeNonEmptyStringArray(businessProfilePayload.Testimonials),
    awards: normalizeNonEmptyStringArray(businessProfilePayload.AwardsCertifications),
    key_people: normalizeKeyPeople(businessProfilePayload.KeyPeople),
    aggregate_rating:
      Object.keys(aggregateRating).length > 0 ? aggregateRating : undefined,
    brand_assets: brandAssets,
  });

  if (includeOfferings) {
    body.offerings = normalizedOfferings;
  }

  return body;
}

/**
 * Get job details by business ID
 * Automatically polls every 20 seconds when workflow status is "processing" or "pending"
 */
export function useJobByBusinessId(businessId: string | null) {
  return useQuery<JobDetails | null>({
    queryKey: [JOBS_KEY, "detail", businessId],
    queryFn: async () => {
      if (!businessId) {
        return null;
      }

      try {
        const response = await api.get<JobDetails>(
          `/jobs/${businessId}`,
          "python"
        );
        return response || null;
      } catch (error: any) {
        // Job not found is not necessarily an error (job might not exist yet)
        if (error.response?.status === 404) {
          console.log("No job found for business:", businessId);
          return null;
        }
        console.error("Error fetching job details:", error);
        throw error;
      }
    },
    enabled: !!businessId,
    staleTime: 30 * 1000, // 30 seconds - short enough to catch workflow status changes, but not excessive
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: true, // Refetch on mount if data is stale (within 30 seconds)
    refetchOnWindowFocus: true, // Refetch on window focus if data is stale
    refetchInterval: (query) => {
      // Poll every 20 seconds when any workflow is processing or pending.
      const data = query.state.data;
      if (isWorkflowActive(data)) {
        return 20000; // 20 seconds
      }
      return false; // Stop polling when success or error
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (job doesn't exist)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

interface CreateJobParams {
  businessId: string;
  businessProfilePayload: BusinessProfilePayload;
  offerings: Offering[];
}

/**
 * Create a new job
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobDetails, Error, CreateJobParams>({
    mutationFn: async ({ businessId, businessProfilePayload, offerings }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      try {
        const jobPayload = mapBusinessProfilePayloadToJobBody(
          businessProfilePayload,
          businessId,
          offerings
        );

        const response = await api.post<JobDetails>("/jobs", "python", jobPayload);

        if (!response) {
          const errorMessage =
            (response as any)?.response?.data?.detail ||
            (response as any)?.response?.data?.message ||
            "Failed to create job";
          throw new Error(errorMessage);
        }

        // Invalidate and refetch job query
        queryClient.invalidateQueries({
          queryKey: [JOBS_KEY, "detail", businessId],
        });

        return response;
      } catch (error: any) {
        // Provide more detailed error message for 422 errors
        if (error.response?.status === 422) {
          const errorDetail = error.response?.data?.detail || error.response?.data?.message || "Validation error";
          throw new Error(`Validation failed: ${errorDetail}`);
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast.success("Job created successfully!");
      // Optionally update cache
      queryClient.setQueryData(
        [JOBS_KEY, "detail", variables.businessId],
        data
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to create job", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

interface UpdateJobParams {
  businessId: string;
  businessProfilePayload: BusinessProfilePayload;
  offerings: Offering[];
  includeOfferings?: boolean;
}

/**
 * Update an existing job
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobDetails, Error, UpdateJobParams>({
    mutationFn: async ({ businessId, businessProfilePayload, offerings, includeOfferings }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      try {
        const jobPayload = mapBusinessProfilePayloadToJobBody(
          businessProfilePayload,
          businessId,
          offerings,
          { includeOfferings, isUpdate: true }
        );

        const response = await api.put<JobDetails>(`/jobs/${businessId}`, "python", jobPayload);

        if (!response) {
          const errorMessage =
            (response as any)?.response?.data?.detail ||
            (response as any)?.response?.data?.message ||
            "Failed to update job";
          throw new Error(errorMessage);
        }

        // Invalidate and refetch job query
        queryClient.invalidateQueries({
          queryKey: [JOBS_KEY, "detail", businessId],
        });

        return response;
      } catch (error: any) {
        // Provide more detailed error message for 422 errors
        if (error.response?.status === 422) {
          const errorDetail = error.response?.data?.detail || error.response?.data?.message || "Validation error";
          throw new Error(`Validation failed: ${errorDetail}`);
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast.success("Job updated successfully");
      // Update cache optimistically
      queryClient.setQueryData(
        [JOBS_KEY, "detail", variables.businessId],
        data
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to update job", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
