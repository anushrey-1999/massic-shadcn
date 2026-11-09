import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import type {
  CreateJobRequest,
  JobLocation,
  JobOffering,
  JobResponse,
  JobServiceArea,
  JobWriteFields,
  ProfileReadOnlyDetails,
  RequiredJobFieldState,
  ServiceAreaType,
  UpdateJobRequest,
} from "@/types/profile-v2";
import {
  formatPrimaryLocationApiValue,
  normalizeProfileCountry,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";
import {
  cleanWebsiteUrl,
  isValidWebsiteUrl,
  normalizeWebsiteUrl,
} from "@/utils/utils";
import { normalizeJobServiceAreas } from "@/utils/profile-service-areas";

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function normalizeExistingUrl(value: unknown): string {
  const url = stringValue(value);
  if (!url) return "";
  if (/^https:\/\//i.test(url)) return url;
  if (/^http:\/\//i.test(url)) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return `https://${url}`;
}

function mapOfferingsFromApi(
  value: unknown,
): BusinessInfoFormData["offeringsList"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const offering = item as Record<string, unknown>;
    const name = stringValue(offering.name);
    if (!name) return [];
    const urls = stringArray(offering.existing_urls);
    return [
      {
        name,
        description: stringValue(offering.description),
        link: urls[0] ?? "",
        offeringType: stringValue(offering.category),
        existingUrls: urls,
      },
    ];
  });
}

function mapDifferentiatorsFromApi(
  value: unknown,
): NonNullable<BusinessInfoFormData["differentiators"]> {
  return stringArray(value).map((differentiator) => ({ differentiator }));
}

function serviceAreaKind(
  serviceAreaType: ServiceAreaType | null | undefined,
): JobServiceArea["kind"] {
  if (serviceAreaType === "city_local") return "city";
  if (serviceAreaType === "state_regional") return "state";
  return "region";
}

function mapOfferingsForWrite(
  offerings: BusinessInfoFormData["offeringsList"],
): JobOffering[] {
  if (!Array.isArray(offerings)) return [];
  return offerings
    .map((offering) => {
      const name = stringValue(offering?.name);
      if (!name) return null;
      const link = stringValue(offering?.link);
      const existingUrls = stringArray(offering?.existingUrls);
      const urls = Array.from(
        new Set([
          ...(link ? [normalizeExistingUrl(link)] : []),
          ...existingUrls.slice(1).map(normalizeExistingUrl),
        ]),
      );
      return compact({
        name,
        description: stringValue(offering?.description) || undefined,
        category: stringValue(offering?.offeringType) || undefined,
        existing_urls: urls,
      }) as JobOffering;
    })
    .filter((offering): offering is JobOffering => Boolean(offering));
}

function mapDifferentiatorsForWrite(values: BusinessInfoFormData): string[] {
  return Array.isArray(values.differentiators)
    ? values.differentiators
        .map((item) => stringValue(item.differentiator))
        .filter(Boolean)
    : String(values.usps ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function mapLocationsForWrite(
  value: BusinessInfoFormData["detailedLocations"],
): JobLocation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((location, index) => {
      const streetAddress = stringValue(location.streetAddress);
      const city = stringValue(location.city);
      const name =
        stringValue((location as Record<string, unknown>).name) ||
        city ||
        streetAddress ||
        `Location ${index + 1}`;
      const hasContent = Object.values(location).some((entry) =>
        Boolean(stringValue(entry)),
      );
      if (!hasContent) return null;

      return compact({
        name,
        street_address: streetAddress || undefined,
        city: city || undefined,
        state: stringValue(location.state) || undefined,
        postal_code: stringValue(location.zip) || undefined,
        country: stringValue(location.country) || undefined,
        phone: stringValue(location.phone) || undefined,
        email: stringValue(location.email) || undefined,
        map_url: stringValue(location.mapLink) || undefined,
        hours: (() => {
          const raw = stringValue(location.hours);
          if (!raw) return undefined;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
              ? parsed.map((hour) => ({
                  dayOfWeek: String(hour.dayOfWeek ?? ""),
                  opens: String(hour.opens ?? ""),
                  closes: String(hour.closes ?? ""),
                }))
              : undefined;
          } catch {
            return undefined;
          }
        })(),
        primary:
          stringValue(location.primaryFlag).toLowerCase() === "true" ||
          stringValue(location.primaryFlag).toLowerCase() === "yes",
      }) as JobLocation;
    })
    .filter((location): location is JobLocation => Boolean(location));
}

export function buildJobWriteFields(
  values: BusinessInfoFormData,
  locationOptions: LocationOption[] = [],
): JobWriteFields {
  const primaryLocation = parsePrimaryLocationForPayload(
    values.primaryLocation,
    locationOptions,
  );
  const country = normalizeProfileCountry(primaryLocation.Country);
  const serviceAreaType = values.serviceAreaType as ServiceAreaType | undefined;
  const foundingYear = stringValue(values.foundingDate);
  const serviceAreaDetails = new Map(
    (values.serviceAreaDetails ?? []).map((item) => [
      item.name.trim().toLowerCase(),
      item,
    ]),
  );
  const averageOrderValue =
    values.averageOrderValue === "" ||
    values.averageOrderValue === null ||
    values.averageOrderValue === undefined
      ? null
      : Number(values.averageOrderValue);

  return compact({
    business_name: stringValue(values.businessName),
    business_url: normalizeWebsiteUrl(cleanWebsiteUrl(values.website)),
    location: formatPrimaryLocationApiValue(primaryLocation),
    country,
    service_area_type: serviceAreaType,
    user_defined_business_description:
      stringValue(values.businessDescription) || null,
    primary_category: stringValue(values.primaryCategory) || null,
    secondary_category: stringValue(values.secondaryCategory) || null,
    categories_tagged: stringArray(values.categoriesTagged),
    offerings: mapOfferingsForWrite(values.offeringsList),
    differentiators: mapDifferentiatorsForWrite(values),
    customer_types: stringArray(values.customerTypes),
    ctas: (values.ctas ?? [])
      .map((cta) => ({
        text: stringValue(cta.buttonText),
        url: stringValue(cta.url),
      }))
      .filter((cta) => Boolean(cta.text)),
    brand_terms: stringArray(values.brandTerms),
    web_brand_voice: stringArray(values.brandToneWeb),
    social_brand_voice: stringArray(values.brandToneSocial),
    recurring_flag: stringValue(values.recurringFlag) || null,
    aov: Number.isFinite(averageOrderValue) ? averageOrderValue : null,
    ltv: values.lifetimeValue || null,
    competitors: (values.competitors ?? [])
      .map((item) => cleanWebsiteUrl(item.url))
      .filter(Boolean),
    service_areas: stringArray(values.serviceAreas).map((name, index) => {
      const existing = serviceAreaDetails.get(name.toLowerCase());
      return {
        name,
        kind: existing?.kind ?? serviceAreaKind(serviceAreaType),
        rank: existing?.rank ?? index + 1,
      };
    }),
    locations: mapLocationsForWrite(values.detailedLocations),
    year_founded: foundingYear ? Number(foundingYear) : null,
    logo_url: stringValue(values.logoUrl) || null,
    support_email: stringValue(values.supportEmail) || null,
    comms_email: stringValue(values.commsEmail) || null,
    primary_phone: stringValue(values.primaryPhone) || null,
    additional_phones: stringArray(values.additionalPhones),
    social_profiles: (values.socialProfiles ?? [])
      .map((item) => stringValue(item.url))
      .filter(Boolean),
    directory_profiles: (values.directoryProfiles ?? [])
      .map((item) => stringValue(item.url))
      .filter(Boolean),
    licenses: stringArray(values.licensesCompliance),
    awards: stringArray(values.awardsCertifications),
    key_people: (values.stakeholders ?? [])
      .map((person) => ({
        name: stringValue(person.name),
        role: stringValue(person.role) || undefined,
        title: stringValue(person.title) || undefined,
      }))
      .filter((person) => Boolean(person.name)),
  }) as JobWriteFields;
}

export function selectCombinedJobFields(
  fields: JobWriteFields,
): JobWriteFields {
  const {
    business_name,
    business_url,
    country,
    location,
    service_area_type,
    offerings,
    competitors,
  } = fields;
  return {
    business_name,
    business_url,
    country,
    location,
    service_area_type,
    offerings,
    competitors,
  };
}

export function buildCreateJobRequest(
  businessId: string,
  values: BusinessInfoFormData,
  locationOptions: LocationOption[] = [],
): CreateJobRequest {
  return {
    ...selectCombinedJobFields(buildJobWriteFields(values, locationOptions)),
    business_id: businessId,
  };
}

export function buildUpdateJobRequest(
  values: BusinessInfoFormData,
  locationOptions: LocationOption[] = [],
  mode: "minimal" | "full" = "full",
  options: { includePrimaryCategory?: boolean } = {},
): UpdateJobRequest {
  const fields = buildJobWriteFields(values, locationOptions);
  const request = mode === "minimal" ? selectCombinedJobFields(fields) : fields;
  if (options.includePrimaryCategory)
    request.primary_category = fields.primary_category;
  delete request.business_url;
  delete request.location;
  delete request.country;
  delete request.service_area_type;
  return request;
}

export function mapJobToFormValues(job: JobResponse): BusinessInfoFormData {
  const serve = job.serve;
  const sell = job.sell;
  const serviceAreas = normalizeJobServiceAreas(
    job.service_areas,
    job.service_area_type,
  );

  return {
    website: cleanWebsiteUrl(job.business_url ?? ""),
    businessName: job.business_name ?? "",
    primaryCategory: job.primary_category ?? "",
    secondaryCategory: job.secondary_category ?? "",
    categoriesTagged: job.categories_tagged ?? [],
    foundingDate:
      job.year_founded === null || job.year_founded === undefined
        ? ""
        : String(job.year_founded),
    logoUrl: job.logo_url ?? "",
    businessDescription: job.user_defined_business_description ?? "",
    primaryLocation: job.location ?? "",
    serviceAreaType: job.service_area_type ?? "city_local",
    serviceAreas: serviceAreas.map((item) => item.name),
    serviceAreaDetails: serviceAreas,
    serviceType:
      serve === "local"
        ? "physical"
        : serve === "both"
          ? "both"
          : serve === "online"
            ? "online"
            : "",
    lifetimeValue: job.ltv === "high" || job.ltv === "low" ? job.ltv : "",
    averageOrderValue: job.aov === null || job.aov === undefined ? "" : job.aov,
    recurringFlag: job.recurring_flag ?? "",
    customerTypes: (job.customer_types ?? []).filter(
      (value): value is "b2b" | "b2c" => value === "b2b" || value === "b2c",
    ),
    offerings:
      sell === "products" || sell === "services" || sell === "both" ? sell : "",
    offeringsList: mapOfferingsFromApi(job.offerings),
    usps: stringArray(job.differentiators).join(", "),
    differentiators: mapDifferentiatorsFromApi(job.differentiators),
    ctas: (job.ctas ?? []).map((cta) => ({
      buttonText: cta.text,
      url: cta.url,
    })),
    brandTerms: stringArray(job.brand_terms),
    stakeholders: (job.key_people ?? []).map((person) => ({
      name: person.name,
      role: person.role ?? "",
      title: person.title ?? "",
    })),
    locations: (job.locations ?? []).map((location) => ({
      name: location.name,
      address: location.street_address ?? "",
      timezone: "",
    })),
    detailedLocations: (job.locations ?? []).map((location) => ({
      name: location.name,
      streetAddress: location.street_address ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      zip: location.postal_code ?? "",
      country: location.country ?? "",
      phone: location.phone ?? "",
      email: location.email ?? "",
      mapLink: location.map_url ?? "",
      hours: location.hours ? JSON.stringify(location.hours) : "",
      primaryFlag: location.primary ? "true" : "",
    })),
    keyPeople: (job.key_people ?? []).map((person) => ({
      name: person.name,
      role: person.role ?? "",
      title: person.title ?? "",
    })),
    licensesCompliance: stringArray(job.licenses),
    awardsCertifications: stringArray(job.awards),
    socialProfiles: (job.social_profiles ?? []).map((url) => ({ url })),
    directoryProfiles: (job.directory_profiles ?? []).map((url) => ({ url })),
    supportEmail: job.support_email ?? "",
    commsEmail: job.comms_email ?? "",
    primaryPhone: job.primary_phone ?? "",
    additionalPhones: job.additional_phones ?? [],
    competitors: (job.competitors ?? []).map((url) => ({ url })),
    brandToneSocial: job.social_brand_voice ?? [],
    brandToneWeb: job.web_brand_voice ?? [],
  };
}

export function mergeJobAndNodeFormValues(
  job: JobResponse,
  nodeValues: BusinessInfoFormData,
): BusinessInfoFormData {
  const jobValues = mapJobToFormValues(job);

  return {
    ...jobValues,
    calendarEvents: nodeValues.calendarEvents,
    businessName: stringValue(job.business_name) || nodeValues.businessName,
    website: stringValue(job.business_url)
      ? jobValues.website
      : nodeValues.website,
    primaryLocation: stringValue(job.location)
      ? jobValues.primaryLocation
      : nodeValues.primaryLocation,
    serviceAreaType: stringValue(job.service_area_type)
      ? jobValues.serviceAreaType
      : nodeValues.serviceAreaType,
  };
}

export function mapJobToReadOnlyDetails(
  job: JobResponse | null | undefined,
): ProfileReadOnlyDetails {
  return {
    market: job?.serve ?? null,
    sellType: job?.sell ?? null,
    segment: job?.segment ?? null,
    generatedDescription: stringValue(job?.business_description),
    generatedDetailedDescription: stringValue(
      job?.business_detailed_description,
    ),
    naicsContext: stringValue(job?.naics_embedded_text),
  };
}

export function mergeJobAndFormForNodeProfile(
  job: JobResponse,
  submittedValues: BusinessInfoFormData,
  existingNodeValues: BusinessInfoFormData,
): BusinessInfoFormData {
  return {
    ...mapJobToFormValues(job),
    ...submittedValues,
    serviceType: submittedValues.serviceType || existingNodeValues.serviceType,
    offerings: submittedValues.offerings || existingNodeValues.offerings,
  };
}

export function getRequiredJobFieldState(
  job: JobResponse | null | undefined,
): RequiredJobFieldState {
  return {
    businessName: Boolean(stringValue(job?.business_name)),
    website: isValidWebsiteUrl(stringValue(job?.business_url)),
    offerings: Boolean(
      job?.offerings?.some((offering) => Boolean(stringValue(offering.name))),
    ),
    country: Boolean(stringValue(job?.country)),
    location: Boolean(stringValue(job?.location)),
    serviceAreaType: Boolean(stringValue(job?.service_area_type)),
  };
}

export function isJobIncomplete(job: JobResponse | null | undefined): boolean {
  return Object.values(getRequiredJobFieldState(job)).some(
    (isPresent) => !isPresent,
  );
}
