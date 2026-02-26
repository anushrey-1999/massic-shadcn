function extractPathFromPossibleUrl(value: string) {
  const raw = (value || "").trim().replace(/\\/g, "/");
  if (!raw) return "";

  const parsePathname = (input: string) => {
    try {
      const parsed = new URL(input);
      return parsed.pathname || "";
    } catch {
      return null;
    }
  };

  let candidate = raw;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    const fromUrl = parsePathname(raw);
    if (fromUrl !== null) candidate = fromUrl;
  } else if (raw.startsWith("//")) {
    const fromUrl = parsePathname(`https:${raw}`);
    if (fromUrl !== null) candidate = fromUrl;
  } else if (/^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\//i.test(raw)) {
    const fromUrl = parsePathname(`https://${raw}`);
    if (fromUrl !== null) candidate = fromUrl;
  }

  return candidate.replace(/[#?].*$/, "");
}

function sanitizeSlugSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWordpressSlugPath(value: string | null | undefined) {
  const normalized = extractPathFromPossibleUrl(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const segments = normalized
    .split("/")
    .map((segment) => sanitizeSlugSegment(segment))
    .filter(Boolean);

  return segments.join("/");
}

export function normalizeWordpressBlogEditableSlug(value: string | null | undefined) {
  const normalized = normalizeWordpressSlugPath(value || "");
  if (!normalized) return "";

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length > 1 && (segments[0] === "blog" || segments[0] === "blogs")) {
    return segments.slice(1).join("/");
  }

  return segments.join("/");
}

export function wordpressSlugToDisplay(value: string | null | undefined, fallback: string) {
  const normalized = normalizeWordpressSlugPath(value || "");
  if (!normalized) return fallback;
  return `/${normalized}`;
}
