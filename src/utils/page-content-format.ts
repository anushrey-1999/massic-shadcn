export type PageContentFormat = "html" | "markdown";

const MASSIC_CONTENT_WRAPPER_REGEX =
  /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bmassic-content\b[^"']*["'][^>]*>/i;
const MASSIC_CLASS_REGEX = /\bclass\s*=\s*["'][^"']*\bmassic-[a-z0-9-]+\b[^"']*["']/i;

export function detectPageContentFormat(content: string): PageContentFormat {
  const value = String(content || "").trim();
  if (!value) return "markdown";

  // Product rule: HTML view only for massic-content wrapped payload.
  if (MASSIC_CONTENT_WRAPPER_REGEX.test(value)) {
    return "html";
  }

  // Merge/backward-compatible signal: HTML payload using massic classes, but missing wrapper.
  if (MASSIC_CLASS_REGEX.test(value)) {
    return "html";
  }

  // Safety default for all non-wrapped/ambiguous payloads.
  return "markdown";
}

export function hasMassicContentWrapper(content: string): boolean {
  return MASSIC_CONTENT_WRAPPER_REGEX.test(String(content || ""));
}

export function ensureMassicContentWrapper(content: string): string {
  const value = String(content || "");
  if (!value.trim()) return "";
  if (hasMassicContentWrapper(value)) return value;
  return `<div class="massic-content">${value}</div>`;
}
