// Exported HTML must render with a stock Tailwind v4 build on the customer's site, so app theme
// tokens become palette classes and parent-targeting variants are moved onto the elements.
const TOKEN_CLASSES: Record<string, string> = {
  "text-foreground": "text-neutral-900",
  "text-muted-foreground": "text-neutral-600",
  "text-primary-foreground": "text-white",
  "text-background": "text-white",
  "bg-background": "bg-white",
  "bg-foreground": "bg-neutral-900",
  "bg-primary": "bg-neutral-900",
  "bg-muted": "bg-neutral-100",
  "bg-muted-foreground": "bg-neutral-500",
  "border-border": "border-neutral-200",
  "border-foreground": "border-neutral-900",
  "divide-border": "divide-neutral-200",
  "outline-ring": "outline-neutral-400",
  "ring-ring": "ring-neutral-400",
};

// Viewport `sm` (40rem) becomes a container query so grids follow the CMS column width.
const VARIANT_CLASSES: Record<string, string> = { sm: "@2xl" };

const DEFAULT_BORDER_COLOR = "border-neutral-200";
const DEFAULT_DIVIDE_COLOR = "divide-neutral-200";
const BORDER_WIDTH = /^border(-[xytrblse])?(-\d+)?$/;
const BORDER_STYLE = /^border-(solid|dashed|dotted|double|hidden|none|collapse|separate)$/;
const DIVIDE_WIDTH = /^divide-[xy](-\d+)?$/;
const DIVIDE_STYLE = /^divide-(solid|dashed|dotted|double|hidden|none|[xy](-\d+|-reverse)?)$/;
const DESCENDANT_VARIANT = /^\[&_([a-z][a-z0-9]*)\]$/;
const APP_TOKEN = /^(bg|text|border|divide|outline|ring|fill|stroke)-(background|foreground|muted|muted-foreground|primary|primary-foreground|secondary|secondary-foreground|accent|accent-foreground|card|popover|border|input|ring|destructive)$/;

const REMOVED_ELEMENTS = "script, style, link, iframe, object, embed";
const KEPT_ATTRIBUTES = new Set([
  "class", "style", "href", "src", "alt", "title", "target", "rel", "loading", "referrerpolicy",
  "controls", "preload", "type", "placeholder", "disabled", "colspan", "rowspan", "start",
]);

function splitVariants(token: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < token.length; index++) {
    const char = token[index];
    if (char === "[") depth++;
    else if (char === "]") depth--;
    else if (char === ":" && depth === 0) {
      parts.push(token.slice(start, index));
      start = index + 1;
    }
  }
  return { variants: parts, utility: token.slice(start) };
}

function joinVariants(variants: string[], utility: string) {
  return [...variants, utility].join(":");
}

function translateUtility(utility: string) {
  const slash = utility.indexOf("/");
  const base = slash === -1 ? utility : utility.slice(0, slash);
  const mapped = TOKEN_CLASSES[base];
  return mapped ? mapped + (slash === -1 ? "" : utility.slice(slash)) : utility;
}

function moveDescendantVariants(element: Element, tokens: string[]) {
  return tokens.filter((token) => {
    const { variants, utility } = splitVariants(token);
    const index = variants.findIndex((variant) => DESCENDANT_VARIANT.test(variant));
    if (index === -1) return true;
    const tag = variants[index].match(DESCENDANT_VARIANT)![1];
    const moved = joinVariants(variants.filter((_, position) => position !== index), utility);
    element.querySelectorAll(tag).forEach((descendant) => descendant.classList.add(moved));
    return false;
  });
}

function withDefaultColors(tokens: string[]) {
  const utilities = tokens.map((token) => splitVariants(token).utility);
  const has = (test: (utility: string) => boolean) => utilities.some(test);
  const result = [...tokens];
  if (has((utility) => BORDER_WIDTH.test(utility)) &&
    !has((utility) => utility.startsWith("border-") && !BORDER_WIDTH.test(utility) && !BORDER_STYLE.test(utility))) {
    result.push(DEFAULT_BORDER_COLOR);
  }
  if (has((utility) => DIVIDE_WIDTH.test(utility)) &&
    !has((utility) => utility.startsWith("divide-") && !DIVIDE_STYLE.test(utility))) {
    result.push(DEFAULT_DIVIDE_COLOR);
  }
  return result;
}

function translateClasses(element: Element) {
  const tokens = (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  const translated = withDefaultColors(moveDescendantVariants(element, tokens).map((token) => {
    const { variants, utility } = splitVariants(token);
    return joinVariants(variants.map((variant) => VARIANT_CLASSES[variant] ?? variant), translateUtility(utility));
  }));
  const unique = Array.from(new Set(translated));
  if (unique.length) element.setAttribute("class", unique.join(" "));
  else element.removeAttribute("class");
  return unique;
}

function cleanAttributes(element: Element) {
  for (const name of element.getAttributeNames()) {
    if (!KEPT_ATTRIBUTES.has(name) && !name.startsWith("aria-")) element.removeAttribute(name);
  }
}

function warnOnLeftoverClasses(classes: Set<string>) {
  if (process.env.NODE_ENV === "production") return;
  const leftovers = Array.from(classes).filter((token) => {
    const { utility } = splitVariants(token);
    return token.includes("[") || APP_TOKEN.test(utility.split("/")[0]);
  });
  if (leftovers.length) {
    console.warn("Website architecture export has classes a stock Tailwind build can't render:", leftovers);
  }
}

export function websiteArchitectureHtml(source: HTMLElement) {
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(REMOVED_ELEMENTS).forEach((element) => element.remove());
  copy.querySelectorAll("*").forEach((element) => {
    if (!(element instanceof HTMLElement)) element.remove();
  });

  const classes = new Set<string>();
  // Document order guarantees parents push descendant-variant classes before their children are translated.
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    translateClasses(element).forEach((token) => classes.add(token));
    cleanAttributes(element);
  }
  warnOnLeftoverClasses(classes);
  return copy.outerHTML;
}
