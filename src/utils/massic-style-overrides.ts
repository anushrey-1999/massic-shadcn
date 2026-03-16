export type WpNormalizedProfile = {
  colors?: Record<string, unknown>;
  typography?: Record<string, unknown>;
};

export const MASSIC_STYLE_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "link",
  "text",
  "mutedText",
  "background",
  "surface",
  "buttonBg",
  "buttonText",
] as const;

export type MassicStyleColorKey = typeof MASSIC_STYLE_COLOR_KEYS[number];
export const MASSIC_STYLE_TYPOGRAPHY_KEYS = [
  "bodyFontFamily",
  "headingFontFamily",
  "baseFontSize",
  "baseLineHeight",
  "h1Size",
  "h2Size",
  "h3Size",
] as const;
export type MassicStyleTypographyKey = typeof MASSIC_STYLE_TYPOGRAPHY_KEYS[number];

const TYPOGRAPHY_OVERRIDE_VALUE_TYPES: Record<MassicStyleTypographyKey, "fontFamily" | "size" | "lineHeight"> = {
  bodyFontFamily: "fontFamily",
  headingFontFamily: "fontFamily",
  baseFontSize: "size",
  baseLineHeight: "lineHeight",
  h1Size: "size",
  h2Size: "size",
  h3Size: "size",
};

const COLOR_TOKEN_TO_VAR: Record<string, string> = {
  primary: "--massic-primary",
  secondary: "--massic-secondary",
  accent: "--massic-accent",
  link: "--massic-link",
  text: "--massic-text",
  mutedText: "--massic-muted",
  background: "--massic-bg",
  surface: "--massic-surface",
  buttonBg: "--massic-button-bg",
  buttonText: "--massic-button-text",
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

function normalizeHexColor(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}

function normalizeSize(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt)$/i.test(raw) ? raw : null;
}

function normalizeLineHeight(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  if (/^(?:\d+|\d*\.\d+)$/.test(raw)) return raw;
  return /^(?:\d+|\d*\.\d+)(?:px|rem|em|%)$/i.test(raw) ? raw : null;
}

function normalizeFontFamily(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return raw.length <= 180 && /^[a-zA-Z0-9\s,"'\-]+$/.test(raw) ? raw : null;
}

function normalizeTypographyValue(
  value: unknown,
  valueType: "fontFamily" | "size" | "lineHeight"
): string | null {
  if (valueType === "fontFamily") return normalizeFontFamily(value);
  if (valueType === "lineHeight") return normalizeLineHeight(value);
  return normalizeSize(value);
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

export function normalizeMassicStyleColorOverrides(input: unknown): { colors: Partial<Record<MassicStyleColorKey, string>> } {
  const source = (input && typeof input === "object") ? (input as Record<string, unknown>) : {};
  const colorsSource =
    source.colors && typeof source.colors === "object"
      ? (source.colors as Record<string, unknown>)
      : source;

  const colors: Partial<Record<MassicStyleColorKey, string>> = {};
  for (const key of MASSIC_STYLE_COLOR_KEYS) {
    const normalized = normalizeHexColor(colorsSource[key]);
    if (normalized) {
      colors[key] = normalized;
    }
  }

  return { colors };
}

export function normalizeMassicStyleTypographyOverrides(
  input: unknown
): { typography: Partial<Record<MassicStyleTypographyKey, string>> } {
  const source = (input && typeof input === "object") ? (input as Record<string, unknown>) : {};
  const typographySource =
    source.typography && typeof source.typography === "object"
      ? (source.typography as Record<string, unknown>)
      : source;

  const typography: Partial<Record<MassicStyleTypographyKey, string>> = {};
  for (const key of MASSIC_STYLE_TYPOGRAPHY_KEYS) {
    const normalized = normalizeTypographyValue(typographySource[key], TYPOGRAPHY_OVERRIDE_VALUE_TYPES[key]);
    if (normalized) {
      typography[key] = normalized;
    }
  }

  return { typography };
}

export function normalizeMassicStyleOverrides(input: unknown): {
  colors: Partial<Record<MassicStyleColorKey, string>>;
  typography: Partial<Record<MassicStyleTypographyKey, string>>;
} {
  return {
    ...normalizeMassicStyleColorOverrides(input),
    ...normalizeMassicStyleTypographyOverrides(input),
  };
}

export function applyMassicStyleColorOverrides(
  profileInput: unknown,
  overridesInput: unknown
): WpNormalizedProfile | null {
  return applyMassicStyleOverrides(profileInput, overridesInput);
}

export function applyMassicStyleOverrides(
  profileInput: unknown,
  overridesInput: unknown
): WpNormalizedProfile | null {
  const baseProfile = readNormalizedProfile(profileInput);
  if (!baseProfile) return null;

  const normalizedOverrides = normalizeMassicStyleOverrides(overridesInput);
  const overrideColors = normalizedOverrides.colors;
  const overrideTypography = normalizedOverrides.typography;
  if (!Object.keys(overrideColors).length && !Object.keys(overrideTypography).length) {
    return baseProfile;
  }

  const baseTypography =
    baseProfile.typography && typeof baseProfile.typography === "object"
      ? (baseProfile.typography as Record<string, unknown>)
      : {};

  const mergedTypography: Record<string, unknown> = { ...baseTypography };
  if (overrideTypography.bodyFontFamily) {
    mergedTypography.bodyFontFamily = overrideTypography.bodyFontFamily;
  }
  if (overrideTypography.headingFontFamily) {
    mergedTypography.headingFontFamily = overrideTypography.headingFontFamily;
  }
  if (overrideTypography.baseFontSize) {
    mergedTypography.baseFontSize = overrideTypography.baseFontSize;
  }
  if (overrideTypography.baseLineHeight) {
    mergedTypography.baseLineHeight = overrideTypography.baseLineHeight;
  }
  if (overrideTypography.h1Size) {
    const h1 = baseTypography.h1 && typeof baseTypography.h1 === "object" ? (baseTypography.h1 as Record<string, unknown>) : {};
    mergedTypography.h1 = { ...h1, size: overrideTypography.h1Size };
  }
  if (overrideTypography.h2Size) {
    const h2 = baseTypography.h2 && typeof baseTypography.h2 === "object" ? (baseTypography.h2 as Record<string, unknown>) : {};
    mergedTypography.h2 = { ...h2, size: overrideTypography.h2Size };
  }
  if (overrideTypography.h3Size) {
    const h3 = baseTypography.h3 && typeof baseTypography.h3 === "object" ? (baseTypography.h3 as Record<string, unknown>) : {};
    mergedTypography.h3 = { ...h3, size: overrideTypography.h3Size };
  }

  return {
    ...baseProfile,
    colors: {
      ...(baseProfile.colors || {}),
      ...overrideColors,
    },
    typography: mergedTypography,
  };
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
