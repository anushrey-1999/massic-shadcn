const MASSIC_BLOG_PAGE_CSS_PUBLIC_PATH = "/massic-blog-page.css";

const cssTextCache = new Map<string, string>();
const cssTextPromiseCache = new Map<string, Promise<string>>();
const DEFAULT_MASSIC_PREVIEW_SCOPE = ".massic-html-preview";

function hasMassicContentClass(html: string): boolean {
  return /class\s*=\s*["'][^"']*\bmassic-content\b[^"']*["']/i.test(html);
}

async function getPublicCssText(path: string): Promise<string> {
  const cached = cssTextCache.get(path);
  if (typeof cached === "string") return cached;

  const existingPromise = cssTextPromiseCache.get(path);
  if (existingPromise) return existingPromise;

  const nextPromise = fetch(path, { method: "GET" })
    .then(async (response) => {
      if (!response.ok) return "";
      return response.text();
    })
    .then((css) => {
      const normalized = typeof css === "string" ? css.trim() : "";
      cssTextCache.set(path, normalized);
      return normalized;
    })
    .catch(() => {
      cssTextCache.set(path, "");
      return "";
    })
    .finally(() => {
      cssTextPromiseCache.delete(path);
    });

  cssTextPromiseCache.set(path, nextPromise);
  return nextPromise;
}

export async function getMassicBlogPageCssText(): Promise<string> {
  return getPublicCssText(MASSIC_BLOG_PAGE_CSS_PUBLIC_PATH);
}

export async function getMassicCssText(): Promise<string> {
  return getMassicBlogPageCssText();
}

export async function getMassicBlogCssText(): Promise<string> {
  return getMassicBlogPageCssText();
}


function splitSelectorList(selectorText: string): string[] {
  const selectors: string[] = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < selectorText.length; i += 1) {
    const char = selectorText[i];
    const previous = selectorText[i - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === "," && parenDepth === 0 && bracketDepth === 0) {
      selectors.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function scopeMassicPreviewSelector(selector: string, scopeSelector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith(scopeSelector)) return trimmed;
  if (trimmed.includes(":root")) {
    return trimmed.replace(/:root\b/g, `${scopeSelector} .massic-content`);
  }
  return `${scopeSelector} ${trimmed}`;
}

function scopeSelectorList(selectorText: string, scopeSelector: string): string {
  return splitSelectorList(selectorText)
    .map((selector) => scopeMassicPreviewSelector(selector, scopeSelector))
    .join(",\n");
}

function findMatchingBrace(css: string, openBraceIndex: number): number {
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = openBraceIndex; i < css.length; i += 1) {
    const char = css[i];
    const previous = css[i - 1];

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function splitLeadingCssPrelude(prelude: string): { leading: string; rulePrelude: string } {
  let index = 0;

  while (index < prelude.length) {
    const char = prelude[index];
    const next = prelude[index + 1];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      const commentEnd = prelude.indexOf("*/", index + 2);
      if (commentEnd === -1) break;
      index = commentEnd + 2;
      continue;
    }

    break;
  }

  return {
    leading: prelude.slice(0, index),
    rulePrelude: prelude.slice(index),
  };
}

function scopeCssRules(css: string, scopeSelector: string): string {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    const openBraceIndex = css.indexOf("{", cursor);
    if (openBraceIndex === -1) {
      output += css.slice(cursor);
      break;
    }

    const closeBraceIndex = findMatchingBrace(css, openBraceIndex);
    if (closeBraceIndex === -1) {
      output += css.slice(cursor);
      break;
    }

    const preludeStart = css.lastIndexOf("}", openBraceIndex - 1) + 1;
    output += css.slice(cursor, preludeStart);

    const prelude = css.slice(preludeStart, openBraceIndex);
    const body = css.slice(openBraceIndex + 1, closeBraceIndex);
    const { leading, rulePrelude } = splitLeadingCssPrelude(prelude);
    const trimmedPrelude = rulePrelude.trim();
    output += leading;

    if (trimmedPrelude.startsWith("@")) {
      const atRuleName = trimmedPrelude.match(/^@([\w-]+)/)?.[1]?.toLowerCase() || "";
      const shouldScopeNestedRules = !["font-face", "keyframes", "-webkit-keyframes", "import"].includes(atRuleName);
      output += `${rulePrelude}{${shouldScopeNestedRules ? scopeCssRules(body, scopeSelector) : body}}`;
    } else {
      output += `${scopeSelectorList(rulePrelude, scopeSelector)}{${body}}`;
    }

    cursor = closeBraceIndex + 1;
  }

  return output;
}

export function scopeMassicPreviewCss(css: string, scopeSelector = DEFAULT_MASSIC_PREVIEW_SCOPE): string {
  const raw = String(css || "").trim();
  const scope = String(scopeSelector || "").trim();
  if (!raw || !scope) return raw;
  return scopeCssRules(raw, scope);
}

export function buildStyledMassicHtml(
  html: string,
  options?: {
    baseCss?: string;
  }
): string {
  const raw = String(html || "").trim();
  if (!raw) return "";

  const wrappedHtml = hasMassicContentClass(raw) ? raw : `<div class="massic-content">${raw}</div>`;
  const styleParts: string[] = [];

  if (options?.baseCss && options.baseCss.trim()) {
    styleParts.push(options.baseCss.trim());
  }

  if (!styleParts.length) {
    return wrappedHtml;
  }

  return `<style type="text/css">${styleParts.join("\n")}</style>${wrappedHtml}`;
}
