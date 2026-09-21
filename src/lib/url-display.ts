const TRAILING_URL_PUNCTUATION = /[),.;:!?]+$/;
const ABSOLUTE_URL_IN_TEXT = /\/?https?:\/\/[^\s<>"']+/gi;

interface UrlDisplayPathOptions {
  ensureLeadingSlash?: boolean;
}

/**
 * Returns the readable route portion of an HTTP(S) URL while leaving route-only
 * values and non-URL labels unchanged.
 */
export function getUrlDisplayPath(
  value: string,
  { ensureLeadingSlash = false }: UrlDisplayPathOptions = {},
): string {
  if (!value) return value;

  const trimmedValue = value.trim();
  const urlCandidate = trimmedValue.replace(/^\/(?=https?:\/\/)/i, "");

  try {
    const parsedUrl = new URL(urlCandidate);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/";
    }
  } catch {
    // Route-only values and non-URL labels are already suitable for display.
  }

  return ensureLeadingSlash && !value.startsWith("/") ? `/${value}` : value;
}

/** Returns a page route with a friendly label for the site root. */
export function getPageDisplayLabel(value: string): string {
  const route = getUrlDisplayPath(value);
  return route === "/" ? "Homepage" : route;
}

/** Replaces HTTP(S) URLs embedded in prose with their route-only equivalents. */
export function replaceUrlsWithDisplayPaths(text: string): string {
  return text.replace(ABSOLUTE_URL_IN_TEXT, (match) => {
    const trailingPunctuation = match.match(TRAILING_URL_PUNCTUATION)?.[0] || "";
    const url = trailingPunctuation
      ? match.slice(0, -trailingPunctuation.length)
      : match;

    return `${getUrlDisplayPath(url)}${trailingPunctuation}`;
  });
}
