/**
 * Helper function to ensure we always have an array
 * @param value - The value to check
 * @returns An array, or empty array if value is not an array
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Helper function to parse array data that might come in different formats:
 * 1. Direct array: [{...}]
 * 2. Object with JSON string: { value: "[{...}]" }
 * 
 * @param value - The value to parse (can be array, object with value property, or null/undefined)
 * @returns An array of parsed items, or empty array if parsing fails
 */
export function parseArrayField<T>(value: any): T[] {
  if (!value) return [];
  
  // If it's already an array, return it
  if (Array.isArray(value)) return value;
  
  // If it's an object with a "value" property, try to parse it
  if (typeof value === "object" && value !== null && "value" in value) {
    try {
      const parsed = typeof value.value === "string" 
        ? JSON.parse(value.value) 
        : value.value;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to parse array field from JSON string:", error);
      return [];
    }
  }
  
  return [];
}

/**
 * Cleans website URL by removing "sc-domain:" prefix if present
 * Converts "sc-domain:example.com" to "example.com"
 * @param url - The website URL to clean
 * @returns The cleaned website URL
 */
export function cleanWebsiteUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  
  // Remove "sc-domain:" prefix if present (case-insensitive)
  const cleaned = url.replace(/^sc-domain:/i, "").trim();
  return cleaned;
}

/**
 * Normalizes a website URL to a standard format
 * Accepts URLs with or without protocol, with or without www
 * Preserves www if present, but doesn't add it if missing
 * Examples:
 * - "example.com" -> "https://example.com"
 * - "www.example.com" -> "https://www.example.com"
 * - "http://example.com" -> "https://example.com"
 * - "https://www.example.com" -> "https://www.example.com"
 * @param url - The website URL to normalize
 * @returns The normalized website URL with https:// protocol
 */
export function normalizeWebsiteUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  
  let cleaned = url.trim();
  
  // Remove "sc-domain:" prefix if present
  cleaned = cleaned.replace(/^sc-domain:/i, "");
  
  // Remove leading/trailing whitespace again
  cleaned = cleaned.trim();
  
  if (!cleaned) return "";
  
  // Remove protocol if present (http:// or https://)
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  
  // Remove trailing slash and any path/query/hash
  cleaned = cleaned.split("/")[0];
  cleaned = cleaned.split("?")[0];
  cleaned = cleaned.split("#")[0];
  
  // Remove trailing slash if still present
  cleaned = cleaned.replace(/\/$/, "");
  
  // Add https:// protocol (preserves www if it was there)
  return `https://${cleaned}`;
}

/**
 * Validates if a string is a valid website URL format
 * Accepts URLs with or without protocol, with or without www
 * @param url - The URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidWebsiteUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  let testUrl = url.trim();
  
  // Remove "sc-domain:" prefix if present
  testUrl = testUrl.replace(/^sc-domain:/i, "");
  testUrl = testUrl.trim();
  
  if (!testUrl) return false;
  
  // Remove protocol if present (http://, https://)
  testUrl = testUrl.replace(/^https?:\/\//i, "");
  
  // Remove www. prefix if present (we'll validate the domain without it)
  testUrl = testUrl.replace(/^www\./i, "");
  
  // Remove trailing slash and path
  testUrl = testUrl.split("/")[0];
  testUrl = testUrl.split("?")[0]; // Remove query params
  testUrl = testUrl.split("#")[0]; // Remove hash
  
  // Basic domain validation: should have at least one dot and valid characters
  // Matches: example.com, subdomain.example.com, example.co.uk
  // Allows: letters, numbers, dots, hyphens
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  
  return domainPattern.test(testUrl);
}

/**
 * Normalizes a domain for use with favicon services (e.g., Google's favicon API)
 * Extracts just the clean domain name by removing protocols, prefixes, and paths
 * Examples:
 * - "sc-domain:vertaccount.com" -> "vertaccount.com"
 * - "https://www.example.com/path" -> "example.com"
 * - "www.example.com" -> "example.com"
 * @param input - The website URL or domain to normalize
 * @returns The normalized domain name without protocol, www, or paths
 */
export function normalizeDomainForFavicon(input: string | undefined): string {
  if (!input) return '';
  const raw = input.trim();
  if (!raw) return '';
  
  // Remove "sc-domain:" prefix if present
  let cleaned = raw.replace(/^sc-domain:/i, '');
  
  try {
    // Try to parse as URL to extract hostname
    const withProto = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
    const url = new URL(withProto);
    return url.hostname.replace(/^www\./, '');
  } catch {
    // Fallback: manual cleaning
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split('#')[0];
    return cleaned || raw;
  }
}

/**
 * Simple hash function for object comparison
 * Much faster than JSON.stringify for change detection
 * @param obj - The object to hash
 * @returns A hash string representation
 */
export function hashObject(obj: any): string {
  if (obj === null || obj === undefined) return String(obj);
  
  // For primitives, return string representation
  if (typeof obj !== "object") return String(obj);
  
  // For arrays, hash each element
  if (Array.isArray(obj)) {
    return `[${obj.map(item => hashObject(item)).join(",")}]`;
  }
  
  // For objects, hash keys and values in sorted order
  const keys = Object.keys(obj).sort();
  const hashParts = keys.map(key => `${key}:${hashObject(obj[key])}`);
  return `{${hashParts.join(",")}}`;
}
