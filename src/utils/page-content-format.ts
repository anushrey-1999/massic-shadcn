export type PageContentFormat = "html" | "markdown";

const MASSIC_CONTENT_WRAPPER_REGEX =
  /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bmassic-content\b[^"']*["'][^>]*>/i;

export function detectPageContentFormat(content: string): PageContentFormat {
  const value = String(content || "").trim();
  if (!value) return "markdown";

  // Product rule: treat as HTML only when massic-content wrapper exists.
  if (MASSIC_CONTENT_WRAPPER_REGEX.test(value)) {
    return "html";
  }

  // Safety default for any non-wrapped/ambiguous payload.
  return "markdown";
}
