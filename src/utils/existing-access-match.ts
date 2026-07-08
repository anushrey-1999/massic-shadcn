import { fuzzy } from "fast-fuzzy";
import type {
  FetchBusinessesResponse,
  GA4Property,
  GBPLocation,
} from "@/hooks/use-linked-businesses";
import type { Product } from "@/types/access-request";

export interface ExistingAccessDetail {
  name: string;
  subLabel: string | null;
  emailId: string | null;
}

export interface ExistingAccessMatch {
  product: "gsc" | "ga4" | "gbp";
  details: ExistingAccessDetail[];
}

// Ported 1:1 from seedseo.services.main/src/services/businesses/linkedBusinesses.service.js
// so an existing-access check here agrees with the Linked Business table / access-link matching.

function approximatelyEquals(source: string, target: string, threshold = 0.6): boolean {
  return fuzzy(source, target) >= threshold;
}

function getHostName(uri: URL): string {
  try {
    const siteUrl = uri.hostname || uri.pathname;
    let siteName = siteUrl
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\.com$/, "");

    if (uri.hostname) {
      siteName = siteName.replace(uri.pathname, "");
    }

    return siteName;
  } catch {
    return uri.toString();
  }
}

function toUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function matches(a: string, b: string): boolean {
  return a === b || a.startsWith(b) || b.startsWith(a) || approximatelyEquals(a, b);
}

function normalizeGa4DisplayName(str: string | undefined): string | undefined {
  return str
    ?.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/ - ga4/i, "");
}

function fuzzyMatchGa4({
  allGa4,
  hostName,
  displayName,
}: {
  allGa4: GA4Property[];
  hostName: string;
  displayName: string;
}): GA4Property[] {
  const hostNameLower = hostName.toLowerCase();
  const matched: GA4Property[] = [];

  for (const ga4Property of allGa4) {
    const accountNameLower = (ga4Property.accountName || "").toLowerCase();
    let isMatched = false;

    if (matches(accountNameLower, displayName.toLowerCase()) || matches(accountNameLower, hostNameLower)) {
      isMatched = true;
    }

    const propertyName = (ga4Property.displayName || "").toLowerCase();
    const normalizedDisplayName = normalizeGa4DisplayName(ga4Property.displayName) || "";

    let propertyHostName: string | null = null;
    const url = toUrl(propertyName);
    if (url) propertyHostName = getHostName(url).toLowerCase();

    if (
      matches(hostNameLower, propertyName) ||
      matches(hostNameLower, normalizedDisplayName) ||
      (propertyHostName && matches(hostNameLower, propertyHostName))
    ) {
      isMatched = true;
    }

    if (isMatched) matched.push(ga4Property);
  }

  return matched;
}

function fuzzyMatchGbp({
  allGbp,
  hostName,
  displayName,
}: {
  allGbp: GBPLocation[];
  hostName: string;
  displayName: string;
}): GBPLocation[] {
  const hostNameLower = hostName.toLowerCase();
  const matched: GBPLocation[] = [];

  for (const gbp of allGbp) {
    const gbpTitle = (gbp.title || "").toLowerCase();
    let gbpHostName: string | null = null;
    const url = gbp.websiteUri ? toUrl(gbp.websiteUri) : null;
    if (url) gbpHostName = getHostName(url).toLowerCase();

    if (
      matches(hostNameLower, gbpTitle) ||
      matches(displayName.toLowerCase(), gbpTitle) ||
      (gbpHostName && matches(hostNameLower, gbpHostName))
    ) {
      matched.push(gbp);
    }
  }

  return matched;
}

export function findExistingAccess(
  websiteUrl: string,
  data: FetchBusinessesResponse | undefined,
  products: Product[]
): ExistingAccessMatch[] {
  if (!data) return [];
  const productSet = new Set(products);
  if (productSet.size === 0) return [];

  const trimmed = websiteUrl.trim();
  if (!trimmed) return [];

  const normalizedInput = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const inputUrl = toUrl(normalizedInput);
  if (!inputUrl) return [];

  const hostName = getHostName(inputUrl);
  const displayName = normalizedInput.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const gscDetails = new Map<string, ExistingAccessDetail>();
  const ga4Details = new Map<string, ExistingAccessDetail>();
  const gbpDetails = new Map<string, ExistingAccessDetail>();

  const matchingBusinesses = (data.businesses || []).filter((business) => {
    const siteUrl = toUrl(business.siteUrl);
    return Boolean(siteUrl && getHostName(siteUrl) === hostName);
  });

  // GSC: same-site match against sites we can already see, mirroring the
  // exact-hostname anchor comparison the backend uses (no fuzz — GSC siteUrl
  // is a literal URL/domain-property, not a free-text name).
  for (const business of matchingBusinesses) {
    if (productSet.has("gsc")) {
      gscDetails.set(business.siteUrl, {
        name: business.siteUrl,
        subLabel: null,
        emailId: business.emailId ?? null,
      });
    }

    if (productSet.has("ga4")) {
      const bundledGa4 = business.matchedGa4Multiple?.length
        ? business.matchedGa4Multiple
        : business.matchedGa4
          ? [business.matchedGa4]
          : [];
      for (const property of bundledGa4) {
        ga4Details.set(property.propertyId, {
          name: property.propertyDisplayName || property.displayName,
          subLabel: property.accountName || null,
          emailId: business.emailId ?? null,
        });
      }
    }

    if (productSet.has("gbp")) {
      for (const location of business.matchedGbp || []) {
        gbpDetails.set(location.locationId, {
          name: location.title,
          subLabel: location.websiteUri || null,
          emailId: business.emailId ?? null,
        });
      }
    }
  }

  // GA4: fuzzy match against every known property (account name, property
  // name, or a hostname parsed out of the property name), not just ones
  // already anchored to a matching GSC site.
  if (productSet.has("ga4")) {
    for (const property of fuzzyMatchGa4({ allGa4: data.allGA4 || [], hostName, displayName })) {
      if (ga4Details.has(property.propertyId)) continue;
      ga4Details.set(property.propertyId, {
        name: property.propertyDisplayName || property.displayName,
        subLabel: property.accountName || null,
        emailId: null,
      });
    }
  }

  // GBP: fuzzy match against every known location's title/website, not just
  // a literal websiteUri hostname match.
  if (productSet.has("gbp")) {
    for (const location of fuzzyMatchGbp({ allGbp: data.allGBP || [], hostName, displayName })) {
      if (gbpDetails.has(location.locationId)) continue;
      gbpDetails.set(location.locationId, {
        name: location.title,
        subLabel: location.websiteUri || null,
        emailId: null,
      });
    }
  }

  const result: ExistingAccessMatch[] = [];
  if (gscDetails.size > 0) result.push({ product: "gsc", details: Array.from(gscDetails.values()) });
  if (ga4Details.size > 0) result.push({ product: "ga4", details: Array.from(ga4Details.values()) });
  if (gbpDetails.size > 0) result.push({ product: "gbp", details: Array.from(gbpDetails.values()) });
  return result;
}
