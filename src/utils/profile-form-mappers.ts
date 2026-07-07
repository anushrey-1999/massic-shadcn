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
import {
  profileOfferingsToRows,
  type NormalizedProfileResult,
} from "@/utils/profile-result";

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
  segment: "",
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
  const allowedToneOptions = new Set([
    "professional",
    "bold",
    "friendly",
    "innovative",
    "playful",
    "trustworthy",
  ]);

  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => String(value).toLowerCase().trim())
    .filter((value) => allowedToneOptions.has(value))
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
        }))
    : [];
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
      profile.serviceAreas.length > 0 ? profile.serviceAreas : currentValues.serviceAreas,
    serviceType: profile.serviceType || currentValues.serviceType,
    offerings: profile.sell || currentValues.offerings,
    lifetimeValue: profile.ltv || currentValues.lifetimeValue,
    b2bB2c: profile.b2bB2c || currentValues.b2bB2c,
    segment: profile.segment || currentValues.segment,
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
    offeringsList:
      profile.offerings.length > 0
        ? profileOfferingsToRows(profile.offerings)
        : currentValues.offeringsList,
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
  const jobExists = Boolean(jobDetails?.job_id);
  const offeringsList = jobExists
    ? ((jobDetails?.offerings ?? []) as any[]).map(
        (offering): OfferingRow => ({
          name: offering.offering || offering.name || "",
          description: offering.description || "",
          link: offering.url || offering.link || "",
          pricePositioning: offering.price_positioning || offering.priceRange || "",
        })
      )
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
      "",
    businessName: profileData.Name || profileData.DisplayName || "",
    businessCategory:
      profileAny.BusinessCategory ||
      profileAny.business_category ||
      (jobDetails as any)?.business_category ||
      "",
    foundingDate:
      profileAny.FoundingDate || profileAny.foundingDate || profileAny.year_founded || "",
    logoUrl: profileAny.LogoUrl || profileAny.logoUrl || profileAny.logo_url || "",
    siteName: profileAny.SiteName || profileAny.siteName || profileAny.site_name || "",
    alternateName:
      profileAny.AlternateName || profileAny.alternateName || profileAny.alternate_name || "",
    siteSearchUrlPattern:
      profileAny.SiteSearchUrlPattern ||
      profileAny.siteSearchUrlPattern ||
      profileAny.site_search_url_pattern ||
      "",
    businessDescription:
      profileData.UserDefinedBusinessDescription || profileData.Description || "",
    primaryLocation,
    serviceAreaType:
      profileAny.ServiceAreaType ||
      profileAny.service_area_type ||
      (jobDetails as any)?.service_area_type ||
      "",
    serviceAreas: normalizeStringArray(
      profileAny.ServiceAreas ?? profileAny.service_areas ?? (jobDetails as any)?.service_areas
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
      profileAny.B2bB2c || profileAny.b2b_b2c || (jobDetails as any)?.b2b_b2c || "",
    segment: String(
      profileAny.Segment ?? profileAny.segment ?? (jobDetails as any)?.segment ?? ""
    ),
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
      profileAny.BrandTerms ?? profileAny.brand_terms ?? (jobDetails as any)?.brand_terms
    ),
    stakeholders: stakeholdersList,
    locations: locationsList,
    detailedLocations: parseArrayField(profileAny.DetailedLocations),
    keyPeople: parseArrayField(profileAny.KeyPeople),
    licensesCompliance: normalizeStringArray(profileAny.LicensesCompliance ?? profileAny.licenses),
    awardsCertifications: normalizeStringArray(profileAny.AwardsCertifications ?? profileAny.awards),
    reviewRating: String(
      profileAny.ReviewRating ??
        profileAny.aggregate_rating?.rating ??
        profileAny.aggregate_rating?.ratingValue ??
        ""
    ),
    reviewCount: String(
      profileAny.ReviewCount ??
        profileAny.aggregate_rating?.count ??
        profileAny.aggregate_rating?.reviewCount ??
        ""
    ),
    testimonials: normalizeStringArray(profileAny.Testimonials),
    colorsFontsCss: String(profileAny.ColorsFontsCss ?? ""),
    imagePhotoLibrary: normalizeStringArray(profileAny.ImagePhotoLibrary),
    socialProfiles: parseArrayField(profileAny.SocialProfiles),
    directoryProfiles: parseArrayField(profileAny.DirectoryProfiles),
    supportEmail: String(profileAny.SupportEmail ?? ""),
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
    ProfileLocation: autofillResult?.location ?? (existingProfile as any)?.ProfileLocation,
    ProfileCountry: autofillResult?.country ?? (existingProfile as any)?.ProfileCountry,
    B2bB2c:
      values.b2bB2c?.trim() ||
      autofillResult?.b2bB2c ||
      (existingProfile as any)?.B2bB2c,
    Segment:
      values.segment?.trim() ||
      autofillResult?.segment ||
      (existingProfile as any)?.Segment,
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
