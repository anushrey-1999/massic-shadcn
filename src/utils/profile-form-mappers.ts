import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type { BusinessProfile, OfferingRow } from "@/store/business-store";
import type { BusinessProfilePayload, JobDetails, Offering } from "@/hooks/use-jobs";
import {
  cleanWebsiteUrl,
  normalizeWebsiteUrl,
  parseArrayField,
} from "@/utils/utils";
import {
  parsePrimaryLocationForPayload,
  primaryLocationFromProfile,
  resolvePrimaryLocationFormValue,
} from "@/utils/primary-location";
import type { NormalizedProfileResult } from "@/utils/profile-result";

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type BuildProfilePayloadOptions = {
  autofillResult?: NormalizedProfileResult | null;
  existingProfile?: BusinessProfile | null;
  locationOptions?: LocationOption[];
  normalizeWebsite?: boolean;
  businessObjectiveBothValue?: "both" | "hybrid";
  ctasMode?: "array" | "wrapped-json";
  preserveExistingProfile?: boolean;
};

export const profileFormDefaults: BusinessInfoFormData = {
  website: "",
  legalName: "",
  businessName: "",
  businessCategory: "",
  foundingDate: "",
  logoUrl: "",
  siteName: "",
  alternateName: "",
  siteSearchUrlPattern: "",
  businessDescription: "",
  primaryLocation: "",
  serviceAreaType: "city_local",
  serviceAreas: [],
  serviceType: "" as BusinessInfoFormData["serviceType"],
  lifetimeValue: "",
  b2bB2c: "",
  offerings: "" as BusinessInfoFormData["offerings"],
  offeringsList: [],
  usps: "",
  ctas: [],
  brandTerms: [],
  stakeholders: [],
  locations: [],
  detailedLocations: [],
  keyPeople: [],
  licensesCompliance: [],
  awardsCertifications: [],
  reviewRating: "",
  reviewCount: "",
  testimonials: [],
  colorsFontsCss: "",
  imagePhotoLibrary: [],
  socialProfiles: [],
  directoryProfiles: [],
  supportEmail: "",
  commsEmail: "",
  competitors: [],
  brandToneSocial: [],
  brandToneWeb: [],
};

export const profileFormEditDefaults: BusinessInfoFormData = {
  ...profileFormDefaults,
  serviceType: "physical",
  offerings: "products",
};

export const PROFILE_FORM_TABS = [
  { id: "basic-details", label: "Basic Details" },
  { id: "content-cues", label: "Content Cues" },
  { id: "competitors", label: "Competitors" },
] as const;

export type ProfileFormTabId = (typeof PROFILE_FORM_TABS)[number]["id"];

export function ensureHttpsUrl(raw: unknown): string {
  const value = String(raw ?? "")
    .replace(/^sc-domain:/i, "")
    .trim();
  if (!value) return "";
  if (/^(tel:|mailto:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }
  return `https://${value}`;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeStringArray(parsed);
    } catch {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function normalizeToneOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function toTitleCaseToneValues(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const values = raw
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
  return values.length > 0 ? values : null;
}

export function mapFormOfferingsToJobOfferings(
  value: Pick<BusinessInfoFormData, "offeringsList">
): Offering[] {
  return Array.isArray(value.offeringsList)
    ? value.offeringsList
        .filter((row) => Boolean(row?.name?.trim()))
        .map((row) => ({
          name: String(row.name || ""),
          description: String(row.description || ""),
          link: String(row.link || ""),
          price_positioning: String(row.pricePositioning || ""),
          offering_type: String((row as any).offeringType || ""),
          price_range: String((row as any).priceRange || row.pricePositioning || ""),
          duration: String((row as any).duration || ""),
          inclusions: Array.isArray((row as any).inclusions)
            ? (row as any).inclusions
            : typeof (row as any).inclusions === "string"
              ? (row as any).inclusions
                .split(",")
                .map((item: string) => item.trim())
                .filter(Boolean)
              : [],
        }))
    : [];
}

function normalizeOfferingsToRows(rawOfferings: unknown): OfferingRow[] {
  if (!Array.isArray(rawOfferings)) return [];
  return rawOfferings
    .map((offering: any): OfferingRow => ({
      name: String(offering?.offering ?? offering?.name ?? "").trim(),
      description: String(offering?.description ?? "").trim(),
      link: String(offering?.url ?? offering?.link ?? offering?.page_url ?? "").trim(),
      pricePositioning: String(
        offering?.price_positioning ?? offering?.priceRange ?? offering?.price_range ?? ""
      ).trim(),
      offeringType: String(offering?.offering_type ?? offering?.offeringType ?? "").trim(),
      priceRange: String(offering?.price_range ?? offering?.priceRange ?? "").trim(),
      duration: String(offering?.duration ?? "").trim(),
      inclusions: Array.isArray(offering?.inclusions)
        ? offering.inclusions.map((item: unknown) => String(item).trim()).filter(Boolean)
        : typeof offering?.inclusions === "string"
          ? offering.inclusions
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean)
          : [],
    }))
    .filter((offering) => Boolean(offering.name));
}

function normalizeServiceAreaNames(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return String((item as any).name ?? (item as any).value ?? "").trim();
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
  }
  return normalizeStringArray(raw);
}

function mapJobLocationsToLocationRows(raw: unknown): Array<{ name: string; address: string; timezone: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((location: any, index) => ({
      name: String(location?.display || location?.name || `Location ${index + 1}`).trim(),
      address: String(location?.street_address || location?.address || "").trim(),
      timezone: String(location?.timezone || "").trim(),
    }))
    .filter((location) => Boolean(location.name || location.address || location.timezone));
}

function mapJobLocationsToDetailedRows(raw: unknown): BusinessInfoFormData["detailedLocations"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((location: any) => ({
      streetAddress: String(location?.street_address || location?.streetAddress || "").trim(),
      city: String(location?.city || "").trim(),
      state: String(location?.state || "").trim(),
      zip: String(location?.postal_code || location?.postalCode || location?.zip || "").trim(),
      country: String(location?.country || "").trim(),
      phone: String(location?.phone || "").trim(),
      email: String(location?.email || "").trim(),
      mapLink: String(location?.map_url || location?.mapUrl || location?.mapLink || "").trim(),
      hours:
        typeof location?.hours === "string"
          ? location.hours
          : location?.hours
            ? JSON.stringify(location.hours)
            : "",
      holidayHours:
        typeof location?.special_hours === "string"
          ? location.special_hours
          : location?.special_hours
            ? JSON.stringify(location.special_hours)
            : "",
      primaryFlag: String(location?.primaryFlag || "").trim(),
    }))
    .filter((location) =>
      Object.values(location).some((value) => String(value ?? "").trim().length > 0)
    );
}

function normalizeImageLibrary(
  raw: unknown
): NonNullable<BusinessInfoFormData["imagePhotoLibrary"]> {
  const unwrapValue = (value: unknown): unknown => {
    if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).value;
    }
    return value;
  };

  if (!Array.isArray(raw)) return normalizeStringArray(raw);
  return raw
    .map((item): string | { alt?: string; url: string } | null => {
      const unwrappedItem = unwrapValue(item);
      if (typeof unwrappedItem === "string") {
        const url = unwrappedItem.trim();
        return url || null;
      }
      if (unwrappedItem && typeof unwrappedItem === "object") {
        const image = unwrappedItem as Record<string, unknown>;
        const url = String(unwrapValue(image.url ?? image.src ?? image.href) ?? "").trim();
        const alt = String(unwrapValue(image.alt) ?? "").trim();
        return url ? { url, ...(alt ? { alt } : {}) } : null;
      }
      const url = String(unwrappedItem ?? "").trim();
      return url || null;
    })
    .filter((item): item is string | { alt?: string; url: string } => item !== null);
}

function normalizeProfileUrlRows(raw: unknown): Array<{ url: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const url = item.trim();
        return url ? { url } : null;
      }
      if (item && typeof item === "object") {
        const profile = item as Record<string, unknown>;
        const url = String(profile.url ?? profile.href ?? profile.link ?? "").trim();
        return url ? { url } : null;
      }
      return null;
    })
    .filter((item): item is { url: string } => Boolean(item));
}

export function mapAutofillResultToFormValues(
  currentValues: BusinessInfoFormData,
  profile: NormalizedProfileResult,
  fallbackWebsite: string,
  options?: { normalizeWebsite?: boolean }
): BusinessInfoFormData {
  const nextWebsite = cleanWebsiteUrl(String(profile.businessUrl || fallbackWebsite));
  const normalizedWebsite =
    options?.normalizeWebsite === true ? normalizeWebsiteUrl(nextWebsite) : nextWebsite;

  return {
    ...currentValues,
    website: normalizedWebsite || currentValues.website,
    legalName: profile.legalName || currentValues.legalName,
    businessName: String(profile.brand ?? "").trim() || currentValues.businessName,
    businessCategory: profile.businessCategory || currentValues.businessCategory,
    foundingDate: profile.yearFounded || currentValues.foundingDate,
    logoUrl: profile.logoUrl || currentValues.logoUrl,
    siteName: profile.siteName || currentValues.siteName,
    alternateName: profile.alternateName || currentValues.alternateName,
    siteSearchUrlPattern:
      profile.siteSearchUrlPattern || currentValues.siteSearchUrlPattern,
    serviceAreaType: profile.serviceAreaType || currentValues.serviceAreaType,
    serviceAreas:
      profile.serviceAreas.length > 0
        ? profile.serviceAreas
        : profile.structuredServiceAreas.length > 0
          ? profile.structuredServiceAreas.map((area) => area.name)
          : currentValues.serviceAreas,
    serviceType: profile.serviceType || currentValues.serviceType,
    offerings: profile.sell || currentValues.offerings,
    lifetimeValue: profile.ltv || currentValues.lifetimeValue,
    b2bB2c: profile.b2bB2c || currentValues.b2bB2c,
    colorsFontsCss: profile.colorsFontsCss || currentValues.colorsFontsCss,
    imagePhotoLibrary:
      profile.imagePhotoLibrary.length > 0
        ? profile.imagePhotoLibrary
        : currentValues.imagePhotoLibrary,
    socialProfiles:
      profile.socialProfiles.length > 0
        ? profile.socialProfiles
        : currentValues.socialProfiles,
    directoryProfiles:
      profile.directoryProfiles.length > 0
        ? profile.directoryProfiles
        : currentValues.directoryProfiles,
    supportEmail: profile.supportEmail || currentValues.supportEmail,
    licensesCompliance:
      profile.licenses.length > 0 ? profile.licenses : currentValues.licensesCompliance,
    awardsCertifications:
      profile.awards.length > 0 ? profile.awards : currentValues.awardsCertifications,
    reviewRating: profile.aggregateRating?.rating || currentValues.reviewRating,
    reviewCount: profile.aggregateRating?.count || currentValues.reviewCount,
    stakeholders:
      profile.keyPeople.length > 0
        ? profile.keyPeople.map((person) => ({
            name: person.name,
            title: person.role,
            bio: person.bio,
          }))
        : currentValues.stakeholders,
    testimonials:
      profile.testimonials.length > 0
        ? profile.testimonials
        : currentValues.testimonials,
    offeringsList: currentValues.offeringsList,
    locations:
      profile.structuredLocations.length > 0
        ? mapJobLocationsToLocationRows(profile.structuredLocations)
        : currentValues.locations,
    detailedLocations:
      profile.structuredLocations.length > 0
        ? mapJobLocationsToDetailedRows(profile.structuredLocations)
        : currentValues.detailedLocations,
    usps: profile.usps.length > 0 ? profile.usps.join(", ") : currentValues.usps,
    ctas:
      profile.ctas.length > 0
        ? profile.ctas
            .map((cta) => ({
              buttonText: String(cta.text || "").trim(),
              url: ensureHttpsUrl(cta.url),
            }))
            .filter((cta) => Boolean(cta.buttonText && cta.url))
        : currentValues.ctas,
    brandTerms:
      profile.brandTerms.length > 0 ? profile.brandTerms : currentValues.brandTerms,
    brandToneWeb:
      profile.webBrandVoice.length > 0
        ? normalizeToneOptions(profile.webBrandVoice)
        : currentValues.brandToneWeb,
    brandToneSocial:
      profile.socialBrandVoice.length > 0
        ? normalizeToneOptions(profile.socialBrandVoice)
        : currentValues.brandToneSocial,
    competitors:
      profile.competitors.length > 0
        ? profile.competitors
            .map((url) => cleanWebsiteUrl(String(url)))
            .filter(Boolean)
            .map((url) => ({ url }))
        : currentValues.competitors,
  };
}

export function applyFormValues(form: any, values: BusinessInfoFormData) {
  Object.entries(values).forEach(([fieldName, fieldValue]) => {
    form.setFieldValue(fieldName as any, fieldValue as any);
  });
}

export function mapProfileDataToFormValues(
  profileData: BusinessProfile | null | undefined,
  jobDetails: JobDetails | null | undefined,
  locationOptions: LocationOption[] = []
): BusinessInfoFormData {
  if (!profileData) return { ...profileFormEditDefaults };

  const profileAny = profileData as any;
  const jobAny = jobDetails as any;
  const jobExists = Boolean(jobDetails?.job_id);
  const offeringsList = jobExists
    ? normalizeOfferingsToRows(jobDetails?.offerings)
    : [];

  const primaryLocation = profileAny?.PrimaryLocation
    ? primaryLocationFromProfile(profileAny.PrimaryLocation, locationOptions)
    : profileData.Locations?.[0]
      ? resolvePrimaryLocationFormValue(
          String((profileData.Locations[0] as any).Name || ""),
          locationOptions
        )
      : "";

  const ctasList = parseArrayField<any>(profileAny.CTAs).map((cta) => ({
    buttonText: cta?.buttonText || cta?.text || "",
    url: cta?.url || "",
  }));
  const rawStakeholders = parseArrayField<any>(profileData.CustomerPersonas);
  const rawKeyPeople = parseArrayField<any>(profileAny.KeyPeople);
  const stakeholdersList = (rawStakeholders.length > 0 ? rawStakeholders : rawKeyPeople).map(
    (person) => ({
      name: person.personName || person.name || "",
      title: person.personDescription || person.title || person.role || "",
      bio: person.bio || "",
    })
  );
  const locationsList = parseArrayField<any>(profileData.Locations).map(
    (location, index) => ({
      name: location.DisplayName || location.Name || `Location ${index + 1}`,
      address: location.Address1 || location.address || "",
      timezone: location.TimeZone || location.timezone || "",
    })
  );
  const jobLocationsList = mapJobLocationsToLocationRows(jobAny?.locations);
  const detailedLocationsList = parseArrayField<any>(profileAny.DetailedLocations) as NonNullable<
    BusinessInfoFormData["detailedLocations"]
  >;
  const jobDetailedLocationsList = mapJobLocationsToDetailedRows(jobAny?.locations);
  const competitorsList = parseArrayField<any>(profileData.Competitors)
    .map((competitor) => ({
      url: cleanWebsiteUrl(
        competitor.website || competitor.Website || competitor.url || ""
      ),
    }))
    .filter((competitor) => Boolean(competitor.url));
  const usps = normalizeStringArray(
    (jobDetails as any)?.usps ?? profileAny.USPs ?? profileAny.SellingPoints
  ).join(", ");

  return {
    website: cleanWebsiteUrl(profileData.Website),
    legalName:
      profileAny.LegalName ||
      profileAny.legalName ||
      profileAny.legal_business_name ||
      jobAny?.legal_business_name ||
      "",
    businessName: profileData.Name || profileData.DisplayName || "",
    businessCategory:
      profileAny.BusinessCategory ||
      profileAny.business_category ||
      jobAny?.business_category ||
      "",
    foundingDate:
      profileAny.FoundingDate ||
      profileAny.foundingDate ||
      profileAny.year_founded ||
      jobAny?.year_founded ||
      "",
    logoUrl: profileAny.LogoUrl || profileAny.logoUrl || profileAny.logo_url || jobAny?.logo_url || "",
    siteName: profileAny.SiteName || profileAny.siteName || profileAny.site_name || jobAny?.site_name || "",
    alternateName:
      profileAny.AlternateName ||
      profileAny.alternateName ||
      profileAny.alternate_name ||
      jobAny?.alternate_name ||
      "",
    siteSearchUrlPattern:
      profileAny.SiteSearchUrlPattern ||
      profileAny.siteSearchUrlPattern ||
      profileAny.site_search_url_pattern ||
      jobAny?.site_search_url_pattern ||
      "",
    businessDescription:
      profileData.UserDefinedBusinessDescription || profileData.Description || "",
    primaryLocation,
    serviceAreaType:
      profileAny.ServiceAreaType ||
      profileAny.service_area_type ||
      jobAny?.service_area_type ||
      "",
    serviceAreas: normalizeServiceAreaNames(
      profileAny.ServiceAreas ?? profileAny.service_areas ?? jobAny?.service_areas
    ),
    serviceType: (() => {
      const objective = String(profileData.BusinessObjective || "").toLowerCase();
      if (objective === "local") return "physical";
      if (objective === "hybrid" || objective === "both") return "both";
      return "online";
    })(),
    lifetimeValue: (() => {
      const ltv = profileAny.LTV ?? profileAny.ltv ?? (jobDetails as any)?.ltv;
      const value = ltv != null ? String(ltv).trim().toLowerCase() : "";
      return value === "high" || value === "low" ? value : "";
    })(),
    b2bB2c:
      profileAny.B2bB2c || profileAny.b2b_b2c || jobAny?.b2b_b2c || "",
    offerings: (() => {
      const locationType = String(profileData.LocationType || "").toLowerCase();
      if (locationType === "services") return "services";
      if (locationType === "both") return "both";
      return "products";
    })(),
    offeringsList,
    usps,
    ctas: ctasList,
    brandTerms: normalizeStringArray(
      profileAny.BrandTerms ?? profileAny.brand_terms ?? jobAny?.brand_terms
    ),
    stakeholders: stakeholdersList,
    locations: locationsList.length > 0 ? locationsList : jobLocationsList,
    detailedLocations:
      detailedLocationsList.length > 0 ? detailedLocationsList : jobDetailedLocationsList,
    keyPeople: parseArrayField(profileAny.KeyPeople ?? jobAny?.key_people),
    licensesCompliance: normalizeStringArray(
      profileAny.LicensesCompliance ?? profileAny.licenses ?? jobAny?.licenses
    ),
    awardsCertifications: normalizeStringArray(
      profileAny.AwardsCertifications ?? profileAny.awards ?? jobAny?.awards
    ),
    reviewRating: String(
      profileAny.ReviewRating ??
        profileAny.aggregate_rating?.rating ??
        profileAny.aggregate_rating?.ratingValue ??
        jobAny?.aggregate_rating?.rating_value ??
        jobAny?.aggregate_rating?.ratingValue ??
        jobAny?.aggregate_rating?.rating ??
        ""
    ),
    reviewCount: String(
      profileAny.ReviewCount ??
        profileAny.aggregate_rating?.count ??
        profileAny.aggregate_rating?.reviewCount ??
        jobAny?.aggregate_rating?.review_count ??
        jobAny?.aggregate_rating?.reviewCount ??
        jobAny?.aggregate_rating?.count ??
        ""
    ),
    testimonials: normalizeStringArray(profileAny.Testimonials ?? jobAny?.testimonials),
    colorsFontsCss: String(
      String(profileAny.ColorsFontsCss ?? "").trim() ||
        jobAny?.brand_assets?.stylesheets?.join?.("\n") ||
        ""
    ),
    imagePhotoLibrary: normalizeImageLibrary(
      profileAny.ImagePhotoLibrary ?? jobAny?.brand_assets?.image_library
    ),
    socialProfiles: normalizeProfileUrlRows(
      parseArrayField(profileAny.SocialProfiles ?? jobAny?.social_profiles)
    ),
    directoryProfiles: normalizeProfileUrlRows(
      parseArrayField(profileAny.DirectoryProfiles ?? jobAny?.directory_profiles)
    ),
    supportEmail: String(profileAny.SupportEmail ?? jobAny?.support_email ?? ""),
    commsEmail: String(profileAny.CommsEmail ?? ""),
    competitors: competitorsList,
    brandToneSocial: normalizeToneOptions(profileAny.SocialBrandVoice),
    brandToneWeb: normalizeToneOptions(profileAny.WebBrandVoice),
  };
}

export function buildBusinessProfilePayload(
  values: BusinessInfoFormData,
  options: BuildProfilePayloadOptions = {}
): BusinessProfilePayload {
  const {
    autofillResult,
    existingProfile,
    locationOptions,
    normalizeWebsite = false,
    businessObjectiveBothValue = "both",
    ctasMode = "array",
    preserveExistingProfile = false,
  } = options;
  const { Location: location, Country: country } = parsePrimaryLocationForPayload(
    values.primaryLocation,
    locationOptions
  );
  const formUsps = values.usps?.trim()
    ? values.usps.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  const brandTerms =
    Array.isArray(values.brandTerms) && values.brandTerms.length > 0
      ? values.brandTerms.map((term) => String(term).trim()).filter(Boolean)
      : null;
  const ctas = Array.isArray(values.ctas)
    ? values.ctas
        .map((cta) => ({
          buttonText: String(cta?.buttonText ?? "").trim(),
          url: ensureHttpsUrl(cta?.url),
        }))
        .filter((cta) => Boolean(cta.buttonText && cta.url))
    : [];
  const ctasPayload =
    ctas.length > 0
      ? ctasMode === "wrapped-json"
        ? { value: JSON.stringify(ctas) }
        : ctas
      : null;

  const payload: BusinessProfilePayload = {
    ...(preserveExistingProfile && existingProfile ? (existingProfile as any) : {}),
    Website: normalizeWebsite
      ? normalizeWebsiteUrl(cleanWebsiteUrl(values.website))
      : values.website,
    LegalName: values.legalName || null,
    Name: values.businessName,
    FoundingDate: values.foundingDate || null,
    LogoUrl: values.logoUrl || null,
    SiteName: values.siteName || null,
    AlternateName: values.alternateName || null,
    SiteSearchUrlPattern: values.siteSearchUrlPattern || null,
    Description: values.businessDescription || "",
    UserDefinedBusinessDescription: values.businessDescription || "",
    PrimaryLocation: {
      Location: location,
      Country: country,
    },
    BusinessObjective:
      values.serviceType === "physical"
        ? "local"
        : values.serviceType === "both"
          ? businessObjectiveBothValue
          : "online",
    LocationType: values.offerings,
    ProfileId: autofillResult?.profileId ?? (existingProfile as any)?.ProfileId,
    BusinessCategory:
      values.businessCategory?.trim() ||
      autofillResult?.businessCategory ||
      (existingProfile as any)?.BusinessCategory,
    ServiceAreaType:
      values.serviceAreaType?.trim() ||
      autofillResult?.serviceAreaType ||
      (existingProfile as any)?.ServiceAreaType,
    ServiceAreas:
      values.serviceAreas?.length
        ? values.serviceAreas
        : autofillResult?.serviceAreas?.length
          ? autofillResult.serviceAreas
          : (existingProfile as any)?.ServiceAreas,
    StructuredServiceAreas:
      autofillResult?.structuredServiceAreas?.length
        ? autofillResult.structuredServiceAreas
        : (existingProfile as any)?.StructuredServiceAreas ??
          (existingProfile as any)?.service_areas,
    ProfileLocation: autofillResult?.location ?? (existingProfile as any)?.ProfileLocation,
    ProfileCountry: autofillResult?.country ?? (existingProfile as any)?.ProfileCountry,
    B2bB2c:
      values.b2bB2c?.trim() ||
      autofillResult?.b2bB2c ||
      (existingProfile as any)?.B2bB2c,
    Segment: autofillResult?.segment || (existingProfile as any)?.Segment,
    LTV:
      values.lifetimeValue === "high" || values.lifetimeValue === "low"
        ? values.lifetimeValue
        : null,
    BrandTerms: brandTerms,
    USPs: formUsps.length > 0 ? formUsps : autofillResult?.usps?.length ? autofillResult.usps : null,
    SellingPoints:
      formUsps.length > 0 ? formUsps : autofillResult?.usps?.length ? autofillResult.usps : null,
    CTAs: ctasPayload,
    CustomerPersonas: (values.stakeholders || []).map((stakeholder) => ({
      personName: stakeholder.name || "",
      personDescription: stakeholder.title || "",
      bio: stakeholder.bio || "",
    })),
    Locations: (values.locations || []).map((locationRow) => ({
      Name: locationRow.name || "",
      Address1: locationRow.address || "",
      TimeZone: locationRow.timezone || "",
    })),
    DetailedLocations: values.detailedLocations || null,
    StructuredLocations:
      autofillResult?.structuredLocations?.length
        ? autofillResult.structuredLocations
        : (existingProfile as any)?.StructuredLocations ??
          (existingProfile as any)?.locations,
    KeyPeople: (values.stakeholders || []).map((stakeholder) => ({
      name: stakeholder.name || "",
      role: stakeholder.title || "",
      bio: stakeholder.bio || "",
    })),
    LicensesCompliance: values.licensesCompliance || null,
    AwardsCertifications: values.awardsCertifications || null,
    ReviewRating: values.reviewRating || null,
    ReviewCount: values.reviewCount || null,
    Testimonials: values.testimonials || null,
    ColorsFontsCss: values.colorsFontsCss || null,
    ImagePhotoLibrary: values.imagePhotoLibrary || null,
    SocialProfiles: values.socialProfiles || null,
    DirectoryProfiles: values.directoryProfiles || null,
    SupportEmail: values.supportEmail || null,
    CommsEmail: values.commsEmail || null,
    Competitors: (values.competitors || []).map((competitor) => ({
      website: cleanWebsiteUrl(competitor.url),
    })),
    WebBrandVoice: toTitleCaseToneValues(values.brandToneWeb),
    SocialBrandVoice: toTitleCaseToneValues(values.brandToneSocial),
  };

  return payload;
}
