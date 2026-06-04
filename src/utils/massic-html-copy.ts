const MASSIC_BLOG_PAGE_CSS_PUBLIC_PATH = "/massic-blog-page.css";

const cssTextCache = new Map<string, string>();
const cssTextPromiseCache = new Map<string, Promise<string>>();

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

function buildCssVarOverrideBlock(cssVarOverrides?: Record<string, string>): string {
  if (!cssVarOverrides || !Object.keys(cssVarOverrides).length) return "";

  const declarations = Object.entries(cssVarOverrides)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");

  return `.massic-content { ${declarations} }`;
}

export function buildStyledMassicHtml(
  html: string,
  options?: {
    baseCss?: string;
    cssVarOverrides?: Record<string, string>;
  }
): string {
  const raw = String(html || "").trim();
  if (!raw) return "";

  const wrappedHtml = hasMassicContentClass(raw) ? raw : `<div class="massic-content">${raw}</div>`;
  const styleParts: string[] = [];

  if (options?.baseCss && options.baseCss.trim()) {
    styleParts.push(options.baseCss.trim());
  }

  const overrideBlock = buildCssVarOverrideBlock(options?.cssVarOverrides);
  if (overrideBlock) {
    styleParts.push(overrideBlock);
  }

  if (!styleParts.length) {
    return wrappedHtml;
  }

  return `<style type="text/css">${styleParts.join("\n")}</style>${wrappedHtml}`;
}
