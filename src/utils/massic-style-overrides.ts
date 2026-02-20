export type WpNormalizedProfile = {
  colors?: Record<string, unknown>;
  typography?: Record<string, unknown>;
};

const COLOR_TOKEN_TO_VAR: Record<string, string> = {
  primary: "--massic-primary",
  text: "--massic-text",
  mutedText: "--massic-muted",
  background: "--massic-bg",
  surface: "--massic-surface",
  buttonText: "--massic-primary-contrast",
};

function pickNestedValue(input: unknown, path: string[]): unknown {
  let current: unknown = input;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function asTrimmedString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function isSafeTokenValue(value: string): boolean {
  // Prevent variable injection and malformed values.
  return !/[{};]/.test(value);
}

function supportsCssValue(property: string, value: string): boolean {
  if (!isSafeTokenValue(value)) return false;

  if (typeof window !== "undefined" && typeof window.CSS !== "undefined" && typeof window.CSS.supports === "function") {
    return window.CSS.supports(property, value);
  }

  // Server fallback: permissive format check.
  return value.length > 0 && value.length < 256;
}

function readNormalizedProfile(input: unknown): WpNormalizedProfile | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;

  if (source.normalized_profile && typeof source.normalized_profile === "object") {
    return source.normalized_profile as WpNormalizedProfile;
  }

  if (source.normalizedProfile && typeof source.normalizedProfile === "object") {
    return source.normalizedProfile as WpNormalizedProfile;
  }

  if (source.profile && typeof source.profile === "object") {
    return source.profile as WpNormalizedProfile;
  }

  return source as WpNormalizedProfile;
}

export function buildMassicCssVariableOverrides(normalizedProfileInput: unknown): Record<string, string> {
  const normalizedProfile = readNormalizedProfile(normalizedProfileInput);
  if (!normalizedProfile) return {};

  const overrides: Record<string, string> = {};
  const colors = normalizedProfile.colors || {};

  for (const [tokenKey, cssVar] of Object.entries(COLOR_TOKEN_TO_VAR)) {
    const raw = asTrimmedString(colors[tokenKey]);
    if (!raw) continue;
    if (!supportsCssValue("color", raw)) continue;
    overrides[cssVar] = raw;
  }

  const typographyMappings: Array<{ path: string[]; cssVar: string; cssProperty: string }> = [
    { path: ["typography", "bodyFontFamily"], cssVar: "--massic-font-sans", cssProperty: "font-family" },
    { path: ["typography", "headingFontFamily"], cssVar: "--massic-font-heading", cssProperty: "font-family" },
    { path: ["typography", "baseFontSize"], cssVar: "--massic-text-base", cssProperty: "font-size" },
    { path: ["typography", "baseLineHeight"], cssVar: "--massic-line", cssProperty: "line-height" },
    { path: ["typography", "h1", "size"], cssVar: "--massic-h1", cssProperty: "font-size" },
    { path: ["typography", "h2", "size"], cssVar: "--massic-h2", cssProperty: "font-size" },
    { path: ["typography", "h3", "size"], cssVar: "--massic-h3", cssProperty: "font-size" },
  ];

  for (const mapping of typographyMappings) {
    const raw = asTrimmedString(pickNestedValue(normalizedProfile, mapping.path));
    if (!raw) continue;
    if (!supportsCssValue(mapping.cssProperty, raw)) continue;
    overrides[mapping.cssVar] = raw;
  }

  return overrides;
}
