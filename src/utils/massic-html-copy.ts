const MASSIC_CSS_PUBLIC_PATH = "/wp-css-component-library.css";

let massicCssCache: string | null = null;
let massicCssPromise: Promise<string> | null = null;

function hasMassicContentClass(html: string): boolean {
  return /class\s*=\s*["'][^"']*\bmassic-content\b[^"']*["']/i.test(html);
}

export async function getMassicCssText(): Promise<string> {
  if (massicCssCache !== null) return massicCssCache;
  if (massicCssPromise) return massicCssPromise;

  massicCssPromise = fetch(MASSIC_CSS_PUBLIC_PATH, { method: "GET" })
    .then(async (response) => {
      if (!response.ok) return "";
      return response.text();
    })
    .then((css) => {
      massicCssCache = typeof css === "string" ? css.trim() : "";
      return massicCssCache;
    })
    .catch(() => {
      massicCssCache = "";
      return "";
    })
    .finally(() => {
      massicCssPromise = null;
    });

  return massicCssPromise;
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
