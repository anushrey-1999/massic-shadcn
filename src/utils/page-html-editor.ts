export interface EditableTextNodeRef {
  id: string;
  path: number[];
  ownerPath: number[];
  tagName: string;
  label: string;
}

export interface EditableTextStyleValue {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: "left" | "center" | "right";
  lineHeight: string;
  letterSpacing: string;
}

export interface EditableTextBlockInfo {
  id: string;
  label: string;
  text: string;
  style: EditableTextStyleValue;
}

export interface EditableLinkRef {
  id: string;
  path: number[];
  href: string;
  label?: string;
}

export const EDITABLE_SPACING_SCALE_VALUES = ["none", "xs", "s", "m", "l", "xl"] as const;
export type EditableSpacingScale = typeof EDITABLE_SPACING_SCALE_VALUES[number];
export const EDITABLE_SPACING_PX_MIN = -200;
export const EDITABLE_SPACING_PX_MAX = 200;
export type EditableSpacingCustomPx = `num:${number}`;
export type EditableSpacingToken = EditableSpacingScale | EditableSpacingCustomPx;

export interface EditableSpacingValue {
  outsideTop: EditableSpacingToken | null;
  outsideBottom: EditableSpacingToken | null;
  outsideLeft: EditableSpacingToken | null;
  outsideRight: EditableSpacingToken | null;
}

export interface EditableSpacingRef extends EditableSpacingValue {
  id: string;
  path: number[];
  tagName: string;
  className: string;
  nodeKind: "block" | "layout";
}

export interface EditableSectionRef {
  id: string;
  tagName: string;
  className: string;
  label: string;
}

export type ImageAlignment = "left" | "center" | "right";

export interface ParsedVideoUrl {
  provider: "youtube" | "vimeo";
  videoId: string;
  embedUrl: string;
}

interface EditableLayoutNodeBase {
  id: string;
  path: number[];
  tagName: string;
  className: string;
}

export interface EditableLayoutNode extends EditableLayoutNodeBase {
  kind: "layout";
  slotIds: string[];
}

export interface EditableSlotNode extends EditableLayoutNodeBase {
  kind: "slot";
  side: "left" | "right";
  layoutId: string;
  isEmpty: boolean;
}

export interface EditableBlockNode extends EditableLayoutNodeBase {
  kind: "block";
  parentLayoutId: string | null;
  parentSlotId: string | null;
}

export interface LayoutValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EditableHtmlModel {
  previewHtml: string;
  textNodeIndex: EditableTextNodeRef[];
  linkIndex: EditableLinkRef[];
  spacingIndex: EditableSpacingRef[];
  sectionIndex: EditableSectionRef[];
  layoutIndex: EditableLayoutNode[];
  slotIndex: EditableSlotNode[];
  blockIndex: EditableBlockNode[];
}

const FORBIDDEN_TAGS = new Set([
  "script",
  "style",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
  "svg",
  "math",
]);

const SAFE_IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
]);

function isSafeIframe(element: Element): boolean {
  const src = String(element.getAttribute("src") || "").trim();
  if (!src) return false;
  try {
    const url = new URL(src);
    return SAFE_IFRAME_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const URL_ATTRS = new Set(["href", "src", "xlink:href", "poster", "action", "formaction"]);
const SAFE_ATTRS = new Set([
  "class",
  "id",
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "role",
  "width",
  "height",
  "colspan",
  "rowspan",
  "scope",
  "cellpadding",
  "cellspacing",
  "align",
  "valign",
  "loading",
  "decoding",
  "srcset",
  "sizes",
  "frameborder",
  "allow",
  "allowfullscreen",
  "style",
]);

const SAFE_STYLE_PROPS = new Set([
  "margin-top", "margin-bottom", "margin-left", "margin-right",
  "padding-top", "padding-bottom", "padding-left", "padding-right",
  "margin", "padding",
  "text-align", "vertical-align",
  "border-radius",
  "width", "max-width",
  "line-height", "letter-spacing",
  "font-weight", "font-style", "text-decoration",
]);
const UNSAFE_STYLE_VALUE_PATTERN = /expression|url\s*\(|javascript:|behavior|-moz-binding|@import/i;

function sanitizeStyleAttr(raw: string): string {
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
  const safe: string[] = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx < 1) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const val = part.slice(colonIdx + 1).trim();
    if (!SAFE_STYLE_PROPS.has(prop)) continue;
    if (UNSAFE_STYLE_VALUE_PATTERN.test(val)) continue;
    safe.push(`${prop}: ${val}`);
  }
  return safe.join("; ");
}
const NON_EDITABLE_TAGS = new Set(["code", "pre"]);
const EDITABLE_TEXT_BLOCK_TAGS = new Set([
  "p",
  "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "li",
  "summary",
  "details",
]);
const EDITABLE_ELEMENT_TAGS = new Set([
  "section", "article", "div",
  "p", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "details", "summary",
  "img", "iframe",
]);
const MEDIA_ELEMENT_TAGS = new Set(["img", "iframe"]);
const EDITABLE_ELEMENT_SELECTOR = [
  "section", "article", "div",
  "p", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "details", "summary",
  "img", "iframe",
].join(",");
const SPACING_MASSIC_CLASS_PATTERN = /\bmassic-[a-z0-9_-]+\b/i;
const SPACING_CLASS_NAME_PATTERN = /^massic-sp-(?:mt|mb|ml|mr)-(?:none|xs|s|m|l|xl|px-\d{1,3}|nx-\d{1,3})$/;
const CANONICAL_LAYOUT_CLASS = "massic-layout";
const CANONICAL_LAYOUT_GRID_CLASS = "massic-grid";
const CANONICAL_LAYOUT_TWO_COL_CLASS = "cols-2";
const CANONICAL_SLOT_CLASS = "massic-slot";
const CANONICAL_SLOT_LEFT_CLASS = "massic-slot-left";
const CANONICAL_SLOT_RIGHT_CLASS = "massic-slot-right";
const SPACING_CLASS_PREFIX_BY_KEY: Record<keyof EditableSpacingValue, string> = {
  outsideTop: "massic-sp-mt-",
  outsideBottom: "massic-sp-mb-",
  outsideLeft: "massic-sp-ml-",
  outsideRight: "massic-sp-mr-",
};
const SPACING_SCALE_SET = new Set<string>(EDITABLE_SPACING_SCALE_VALUES);

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html || "", "text/html");
}

function isSafeUrl(value: string): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  if (
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("//")
  ) {
    return true;
  }

  const lowered = normalized.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("data:") || lowered.startsWith("vbscript:")) {
    return false;
  }

  return /^(https?:|mailto:|tel:)/i.test(normalized);
}

export function normalizeEditableLinkHref(value: string): string {
  return String(value || "").trim();
}

export function isSafeEditableLinkHref(value: string): boolean {
  return isSafeUrl(normalizeEditableLinkHref(value));
}

function hasNonWhitespaceText(node: Text): boolean {
  return (node.textContent || "").replace(/\u00A0/g, " ").trim().length > 0;
}

function buildNodePath(root: Node, node: Node): number[] {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    path.unshift(index);
    current = parent;
  }
  return path;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node | null = root;
  for (const index of path) {
    if (!current || !current.childNodes || index < 0 || index >= current.childNodes.length) {
      return null;
    }
    current = current.childNodes[index];
  }
  return current;
}

function clampSpacingPx(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < EDITABLE_SPACING_PX_MIN) return EDITABLE_SPACING_PX_MIN;
  if (rounded > EDITABLE_SPACING_PX_MAX) return EDITABLE_SPACING_PX_MAX;
  return rounded;
}

function parseSpacingPx(value: string): number | null {
  const match = /^px-(\d{1,3})$/.exec(value);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > EDITABLE_SPACING_PX_MAX) return null;
  return parsed;
}

function parseSpacingNegativePx(value: string): number | null {
  const match = /^nx-(\d{1,3})$/.exec(value);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  const negative = parsed * -1;
  if (negative < EDITABLE_SPACING_PX_MIN) return null;
  return negative;
}

function parseSpacingNumberToken(value: EditableSpacingToken): number | null {
  if (!value || typeof value !== "string" || !value.startsWith("num:")) return null;
  const parsed = Number(value.slice(4));
  if (!Number.isFinite(parsed)) return null;
  return clampSpacingPx(parsed);
}

function normalizeSpacingToken(value: unknown): EditableSpacingToken | null {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (SPACING_SCALE_SET.has(normalized)) {
    return normalized as EditableSpacingScale;
  }

  if (/^num:-?\d{1,3}$/.test(normalized)) {
    const parsed = Number(normalized.slice(4));
    if (!Number.isFinite(parsed)) return null;
    return `num:${clampSpacingPx(parsed)}`;
  }

  const parsedPx = parseSpacingPx(normalized);
  if (parsedPx != null) {
    return `num:${clampSpacingPx(parsedPx)}`;
  }

  const parsedNegativePx = parseSpacingNegativePx(normalized);
  if (parsedNegativePx != null) {
    return `num:${clampSpacingPx(parsedNegativePx)}`;
  }

  if (/^-?\d{1,3}$/.test(normalized)) {
    return `num:${clampSpacingPx(Number(normalized))}`;
  }

  return null;
}

const SPACING_STYLE_PROP_BY_KEY: Record<keyof EditableSpacingValue, string> = {
  outsideTop: "margin-top",
  outsideBottom: "margin-bottom",
  outsideLeft: "margin-left",
  outsideRight: "margin-right",
};

function parseInlineStylePx(styleStr: string, prop: string): number | null {
  const pattern = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\s*px`, "i");
  const match = pattern.exec(styleStr);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? clampSpacingPx(n) : null;
}

export function parseEditableSpacingValue(classNameInput: string, styleInput?: string): EditableSpacingValue {
  const classNames = String(classNameInput || "").split(/\s+/).map((n) => n.trim()).filter(Boolean);
  const classSet = new Set(classNames);
  const styleStr = String(styleInput || "");

  const resolveToken = (prefix: string, styleProp: string): EditableSpacingToken | null => {
    const inlinePx = parseInlineStylePx(styleStr, styleProp);
    if (inlinePx != null) return `num:${inlinePx}`;

    for (const scale of EDITABLE_SPACING_SCALE_VALUES) {
      if (classSet.has(`${prefix}${scale}`)) return scale;
    }
    for (const cn of classNames) {
      if (!cn.startsWith(`${prefix}px-`) && !cn.startsWith(`${prefix}nx-`)) continue;
      const token = normalizeSpacingToken(cn.slice(prefix.length));
      if (token?.startsWith("num:")) return token;
    }
    return null;
  };

  return {
    outsideTop: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideTop, "margin-top"),
    outsideBottom: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideBottom, "margin-bottom"),
    outsideLeft: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideLeft, "margin-left"),
    outsideRight: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideRight, "margin-right"),
  };
}

/** @deprecated Use parseEditableSpacingValue instead */
export function parseEditableSpacingValueFromClassName(classNameInput: string): EditableSpacingValue {
  return parseEditableSpacingValue(classNameInput);
}

export function buildSpacingStyleString(spacing: Partial<EditableSpacingValue> | null | undefined): string {
  if (!spacing) return "";
  const parts: string[] = [];
  for (const key of Object.keys(SPACING_STYLE_PROP_BY_KEY) as Array<keyof EditableSpacingValue>) {
    const token = spacing[key];
    if (!token) continue;
    const px = parseSpacingNumberToken(token);
    if (px == null) continue;
    parts.push(`${SPACING_STYLE_PROP_BY_KEY[key]}: ${px}px`);
  }
  return parts.join("; ");
}

function stripSpacingFromClassName(classNameInput: string): string {
  return splitClassNames(classNameInput).filter((c) => !SPACING_CLASS_NAME_PATTERN.test(c)).join(" ").trim();
}

function mergeStyleStrings(existingStyle: string, spacingStyle: string): string {
  const spacingProps = new Set(
    Object.values(SPACING_STYLE_PROP_BY_KEY)
  );
  const existing = existingStyle
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((part) => {
      const colonIdx = part.indexOf(":");
      if (colonIdx < 1) return true;
      const prop = part.slice(0, colonIdx).trim().toLowerCase();
      return !spacingProps.has(prop);
    });
  const spacingParts = spacingStyle.split(";").map((s) => s.trim()).filter(Boolean);
  return [...existing, ...spacingParts].join("; ");
}

function normalizeEditableSpacingEdit(input: Partial<EditableSpacingValue> | null | undefined): Partial<EditableSpacingValue> {
  if (!input || typeof input !== "object") return {};

  const normalized: Partial<EditableSpacingValue> = {};
  for (const key of Object.keys(SPACING_CLASS_PREFIX_BY_KEY) as Array<keyof EditableSpacingValue>) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const raw = (input as Record<string, unknown>)[key];
    if (raw == null || String(raw).trim() === "") {
      normalized[key] = null;
      continue;
    }
    const token = normalizeSpacingToken(raw);
    if (token) {
      normalized[key] = token;
    }
  }
  return normalized;
}

function splitClassNames(classNameInput: string): string[] {
  return String(classNameInput || "")
    .split(/\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

const SECTION_LABEL_MAP: Record<string, string> = {
  "massic-hero": "Hero",
  "massic-hero-media": "Hero Media",
  "massic-cta-band": "CTA",
  "massic-cta": "CTA",
  "massic-stats": "Stats",
  "massic-faq": "FAQ",
  "massic-prose": "Content",
  "massic-testimonial": "Testimonials",
  "massic-logo-bar": "Logo Bar",
  "massic-breadcrumb": "Breadcrumb",
  "massic-author": "Author",
  "massic-comparison-table": "Comparison",
  "massic-alert": "Alert",
};

function findMassicContentRoot(doc: Document): Element {
  return doc.body.querySelector(".massic-content") || doc.body;
}

function getSectionLabel(element: Element): string {
  const classes = splitClassNames(element.getAttribute("class") || "");
  for (const cls of classes) {
    if (SECTION_LABEL_MAP[cls]) return SECTION_LABEL_MAP[cls];
  }
  if (classes.some((c) => c === "massic-section")) return "Section";
  if (classes.some((c) => c.startsWith("massic-surface"))) return "Section";
  const tagName = element.tagName.toLowerCase();
  if (tagName === "section") return "Section";
  if (tagName === "article") return "Article";
  if (tagName === "hr") return "Divider";
  return "Block";
}

function getTextBlockLabel(tagName: string): string {
  const normalized = String(tagName || "").toLowerCase();
  if (normalized === "a") return "Link";
  if (normalized === "p") return "Paragraph";
  if (/^h[1-6]$/.test(normalized)) return "Heading";
  if (normalized === "li") return "List Item";
  if (normalized === "blockquote") return "Quote";
  if (normalized === "summary") return "Summary";
  if (normalized === "details") return "Details";
  return normalized === "div" ? "Text Block" : normalized;
}

function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

function isCanonicalLayoutElement(element: Element): boolean {
  return hasClass(element, CANONICAL_LAYOUT_CLASS);
}

function isCanonicalSlotElement(element: Element): boolean {
  return hasClass(element, CANONICAL_SLOT_CLASS);
}

function getCanonicalSlotSide(element: Element): "left" | "right" {
  return hasClass(element, CANONICAL_SLOT_RIGHT_CLASS) ? "right" : "left";
}

function isLegacySplitLayoutElement(element: Element): boolean {
  return (
    element.tagName.toLowerCase() === "div" &&
    (hasClass(element, CANONICAL_LAYOUT_GRID_CLASS) || hasClass(element, "massic-split")) &&
    !hasClass(element, CANONICAL_LAYOUT_CLASS)
  );
}

function isAnonymousLayoutWrapper(element: Element): boolean {
  if (element.tagName.toLowerCase() !== "div") return false;
  if (element.attributes.length > 0) return false;
  return true;
}

function hasMeaningfulChildContent(element: Element): boolean {
  if (element.children.length > 0) return true;
  return Array.from(element.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return String(node.textContent || "").replace(/\u00A0/g, " ").trim().length > 0;
    }
    return false;
  });
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function getEditableTextOwnerElement(element: Element | null): HTMLElement | null {
  let current = element;
  while (current) {
    if (EDITABLE_TEXT_BLOCK_TAGS.has(current.tagName.toLowerCase())) {
      return current as HTMLElement;
    }
    if (
      current.tagName.toLowerCase() === "a"
      && current.hasAttribute("data-massic-editable-link")
    ) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

function normalizeTextAlignValue(value: string): "left" | "center" | "right" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "center") return "center";
  if (normalized === "right") return "right";
  return "left";
}

function readEditableTextStyleFromElement(element: HTMLElement): EditableTextStyleValue {
  const textDecoration = String(
    element.style.textDecorationLine || element.style.textDecoration || ""
  ).toLowerCase();

  return {
    bold: element.style.fontWeight === "700" || element.style.fontWeight === "bold",
    italic: element.style.fontStyle === "italic",
    underline: textDecoration.includes("underline"),
    strike: textDecoration.includes("line-through"),
    align: normalizeTextAlignValue(element.style.textAlign),
    lineHeight: element.style.lineHeight || "",
    letterSpacing: element.style.letterSpacing || "",
  };
}

function writeEditableTextStyleToElement(element: HTMLElement, style: Partial<EditableTextStyleValue>) {
  if (style.bold !== undefined) {
    if (style.bold) {
      element.style.setProperty("font-weight", "700");
    } else {
      element.style.removeProperty("font-weight");
    }
  }

  if (style.italic !== undefined) {
    if (style.italic) {
      element.style.setProperty("font-style", "italic");
    } else {
      element.style.removeProperty("font-style");
    }
  }

  if (style.align !== undefined) {
    if (style.align && style.align !== "left") {
      element.style.setProperty("text-align", style.align);
    } else {
      element.style.removeProperty("text-align");
    }
  }

  if (style.lineHeight !== undefined) {
    if (style.lineHeight.trim()) {
      element.style.setProperty("line-height", style.lineHeight.trim());
    } else {
      element.style.removeProperty("line-height");
    }
  }

  if (style.letterSpacing !== undefined) {
    if (style.letterSpacing.trim()) {
      element.style.setProperty("letter-spacing", style.letterSpacing.trim());
    } else {
      element.style.removeProperty("letter-spacing");
    }
  }

  if (style.underline !== undefined || style.strike !== undefined) {
    const current = readEditableTextStyleFromElement(element);
    const underline = style.underline ?? current.underline;
    const strike = style.strike ?? current.strike;
    const parts: string[] = [];
    if (underline) parts.push("underline");
    if (strike) parts.push("line-through");
    if (parts.length) {
      element.style.setProperty("text-decoration", parts.join(" "));
    } else {
      element.style.removeProperty("text-decoration");
      element.style.removeProperty("text-decoration-line");
    }
  }
}

function ensureCanonicalLayoutClasses(element: Element) {
  element.classList.add(CANONICAL_LAYOUT_CLASS);
}

function createCanonicalSlot(doc: Document, side: "left" | "right"): HTMLDivElement {
  const slot = doc.createElement("div");
  slot.classList.add(CANONICAL_SLOT_CLASS);
  slot.classList.add(side === "left" ? CANONICAL_SLOT_LEFT_CLASS : CANONICAL_SLOT_RIGHT_CLASS);
  return slot;
}

function normalizeSingleLayoutElement(layout: Element) {
  if (!isCanonicalLayoutElement(layout)) return;

  ensureCanonicalLayoutClasses(layout);

  const directChildren = Array.from(layout.children);
  if (!directChildren.length) {
    return;
  }

  const alreadyCanonical = directChildren.every(isCanonicalSlotElement);
  if (!alreadyCanonical) {
    const slots = directChildren.map((child, index) => {
      const slot = createCanonicalSlot(
        layout.ownerDocument,
        index === 1 ? "right" : "left"
      );
      slot.appendChild(child);
      return slot;
    });
    layout.replaceChildren(...slots);
  }

  const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
  slots.forEach((slot, index) => {
    slot.classList.add(CANONICAL_SLOT_CLASS);
    if (index < 2) {
      slot.classList.remove(CANONICAL_SLOT_LEFT_CLASS, CANONICAL_SLOT_RIGHT_CLASS);
      slot.classList.add(index === 1 ? CANONICAL_SLOT_RIGHT_CLASS : CANONICAL_SLOT_LEFT_CLASS);
    }

    while (slot.children.length === 1 && isAnonymousLayoutWrapper(slot.children[0]!)) {
      unwrapElement(slot.children[0]!);
    }
  });
}

const SPACING_PX_CLASS_RE = /^massic-sp-(mt|mb|ml|mr)-(px-(\d{1,3})|nx-(\d{1,3}))$/;
const SPACING_SCALE_CLASS_RE = /^massic-sp-(mt|mb|ml|mr)-(none|xs|s|m|l|xl)$/;
const SPACING_PY_SCALE_CLASS_RE = /^massic-sp-py-(none|xs|s|m|l|xl)$/;
const SPACING_DIR_TO_PROP: Record<string, string> = { mt: "margin-top", mb: "margin-bottom", ml: "margin-left", mr: "margin-right" };
const SPACING_SCALE_PX: Record<string, number> = { none: 0, xs: 8, s: 12, m: 16, l: 24, xl: 32 };

function migrateSpacingClassesToInlineStyles(doc: Document) {
  const allElements = Array.from(doc.body.querySelectorAll("[class]"));
  for (const el of allElements) {
    const classNames = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    const keep: string[] = [];
    const inlineOverrides: Record<string, string> = {};

    for (const cn of classNames) {
      const pxMatch = SPACING_PX_CLASS_RE.exec(cn);
      if (pxMatch) {
        const dir = pxMatch[1];
        const prop = SPACING_DIR_TO_PROP[dir];
        if (prop) {
          const positivePx = pxMatch[3];
          const negativePx = pxMatch[4];
          const px = positivePx != null ? Number(positivePx) : -(Number(negativePx));
          inlineOverrides[prop] = `${px}px`;
        }
        continue;
      }
      const scaleMatch = SPACING_SCALE_CLASS_RE.exec(cn);
      if (scaleMatch) {
        const dir = scaleMatch[1];
        const scaleName = scaleMatch[2];
        const prop = SPACING_DIR_TO_PROP[dir];
        if (prop && scaleName in SPACING_SCALE_PX) {
          inlineOverrides[prop] = `${SPACING_SCALE_PX[scaleName]}px`;
        }
        continue;
      }
      const pyMatch = SPACING_PY_SCALE_CLASS_RE.exec(cn);
      if (pyMatch) {
        const scaleName = pyMatch[1];
        if (scaleName in SPACING_SCALE_PX) {
          const px = SPACING_SCALE_PX[scaleName];
          inlineOverrides["padding-top"] = `${px}px`;
          inlineOverrides["padding-bottom"] = `${px}px`;
        }
        continue;
      }
      keep.push(cn);
    }

    if (Object.keys(inlineOverrides).length === 0) continue;

    if (keep.length > 0) {
      el.setAttribute("class", keep.join(" "));
    } else {
      el.removeAttribute("class");
    }

    const existingStyle = (el.getAttribute("style") || "").split(";").map((s) => s.trim()).filter(Boolean);
    const overrideProps = new Set(Object.keys(inlineOverrides));
    const filteredExisting = existingStyle.filter((decl) => {
      const prop = decl.slice(0, decl.indexOf(":")).trim();
      return !overrideProps.has(prop);
    });
    for (const [prop, val] of Object.entries(inlineOverrides)) {
      if (val === "0px") continue;
      filteredExisting.push(`${prop}: ${val}`);
    }
    if (filteredExisting.length > 0) {
      el.setAttribute("style", filteredExisting.join("; "));
    } else {
      el.removeAttribute("style");
    }
  }
}

function normalizeLayoutDocument(doc: Document) {
  const contentRoot = findMassicContentRoot(doc);

  migrateSpacingClassesToInlineStyles(doc);

  Array.from(contentRoot.querySelectorAll(`.${CANONICAL_SLOT_CLASS}`)).forEach((slot) => {
    const parent = slot.parentElement;
    if (!parent || !isCanonicalLayoutElement(parent)) {
      if (hasMeaningfulChildContent(slot)) {
        unwrapElement(slot);
      } else {
        slot.remove();
      }
    }
  });

  const layouts = Array.from(contentRoot.querySelectorAll(`.${CANONICAL_LAYOUT_CLASS}`));
  layouts.forEach((layout) => normalizeSingleLayoutElement(layout));
}

export function upgradeLegacySplitLayouts(sourceHtml: string): string {
  if (!sourceHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const contentRoot = findMassicContentRoot(doc);

  Array.from(contentRoot.querySelectorAll("div")).forEach((element) => {
    if (!isLegacySplitLayoutElement(element)) return;
    ensureCanonicalLayoutClasses(element);
  });

  normalizeLayoutDocument(doc);
  return doc.body.innerHTML;
}

export function normalizeLayoutHtml(sourceHtml: string): string {
  if (!sourceHtml) return sourceHtml || "";
  const upgraded = upgradeLegacySplitLayouts(sourceHtml);
  const doc = parseHtml(upgraded);
  normalizeLayoutDocument(doc);
  return doc.body.innerHTML;
}

function serializeNormalizedHtml(doc: Document): string {
  normalizeLayoutDocument(doc);
  return doc.body.innerHTML;
}

export function validatePublishableLayoutHtml(sourceHtml: string): LayoutValidationResult {
  if (!sourceHtml) {
    return { isValid: true, errors: [] };
  }

  const normalized = normalizeLayoutHtml(sourceHtml);
  const doc = parseHtml(normalized);
  const contentRoot = findMassicContentRoot(doc);
  const errors: string[] = [];

  Array.from(contentRoot.querySelectorAll(`.${CANONICAL_SLOT_CLASS}`)).forEach((slot) => {
    if (!slot.parentElement || !isCanonicalLayoutElement(slot.parentElement)) {
      errors.push("Found an orphan layout slot outside a canonical two-column layout.");
    }
  });

  Array.from(contentRoot.querySelectorAll(`.${CANONICAL_LAYOUT_CLASS}`)).forEach((layout) => {
    const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
    if (!slots.length) {
      errors.push("A layout wrapper is missing its editable slots.");
      return;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function parseSectionIndex(sectionId: string): number {
  const match = /^sec-(\d+)$/.exec(sectionId);
  if (!match) return -1;
  return Number(match[1]);
}

function escapeHtmlAttr(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** @deprecated Kept for backward compat; new code should use inline styles via buildSpacingStyleString */
export function mergeSpacingUtilityClasses(
  classNameInput: string,
  spacingEdit: Partial<EditableSpacingValue> | null | undefined
): string {
  return stripSpacingFromClassName(classNameInput);
}

function hasMassicClassName(classNameInput: string): boolean {
  return SPACING_MASSIC_CLASS_PATTERN.test(String(classNameInput || ""));
}

function isSpacingContainerTarget(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (!EDITABLE_ELEMENT_TAGS.has(tagName)) return false;
  if (tagName === "div" && element.classList.contains("massic-content")) return false;
  if (isCanonicalSlotElement(element)) return false;
  if (element.hasAttribute("data-massic-text-id")) return false;
  if (element.hasAttribute("data-massic-link-id")) return false;
  if (element.classList.contains("massic-text-editable")) return false;
  if (element.closest("[data-massic-text-id]")) return false;

  if (MEDIA_ELEMENT_TAGS.has(tagName)) {
    return true;
  }

  const text = (element.textContent || "").replace(/\u00A0/g, " ").trim();
  if (element.childElementCount === 0 && !text) return false;

  return true;
}

function sanitizeAttributes(element: Element) {
  const attrs = Array.from(element.attributes);

  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith("on")) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (name === "style") {
      const sanitized = sanitizeStyleAttr(value);
      if (sanitized) {
        element.setAttribute("style", sanitized);
      } else {
        element.removeAttribute("style");
      }
      continue;
    }

    if (URL_ATTRS.has(name) && !isSafeUrl(value)) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (!SAFE_ATTRS.has(name) && !name.startsWith("data-") && !name.startsWith("aria-")) {
      element.removeAttribute(attr.name);
    }
  }

  const target = element.getAttribute("target");
  if (target && target.toLowerCase() === "_blank") {
    const relValues = new Set(
      String(element.getAttribute("rel") || "")
        .split(/\s+/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
    );
    relValues.add("noopener");
    relValues.add("noreferrer");
    element.setAttribute("rel", Array.from(relValues).join(" "));
  }
}

function sanitizeNodeTree(root: ParentNode) {
  const ownerDocument = root.ownerDocument;
  if (!ownerDocument) return;
  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    const tagName = element.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tagName)) {
      toRemove.push(element);
      continue;
    }
    if (tagName === "iframe" && !isSafeIframe(element)) {
      toRemove.push(element);
      continue;
    }
    sanitizeAttributes(element);
  }

  toRemove.forEach((element) => element.remove());
}

export function sanitizePageHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const doc = parseHtml(html);
  sanitizeNodeTree(doc.body);
  return doc.body.innerHTML;
}

const GRID_COL_MAP: Record<string, string> = {
  "cols-2": "repeat(2, minmax(0, 1fr))",
  "cols-3": "repeat(3, minmax(0, 1fr))",
  "cols-4": "repeat(4, minmax(0, 1fr))",
};

function applyInlineGridStyles(element: Element) {
  const cls = element.classList;
  if (!cls.contains(CANONICAL_LAYOUT_GRID_CLASS) && !cls.contains("massic-grid")) return;

  const existingStyle = element.getAttribute("style") || "";
  const parts: string[] = existingStyle
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("display") && !s.startsWith("grid-template-columns") && !s.startsWith("gap"));

  parts.push("display: grid");
  parts.push("gap: var(--massic-s5, 20px)");

  for (const [clsName, colVal] of Object.entries(GRID_COL_MAP)) {
    if (cls.contains(clsName)) {
      parts.push(`grid-template-columns: ${colVal}`);
      break;
    }
  }

  element.setAttribute("style", parts.join("; "));

  const children = Array.from(element.children);
  children.forEach((child) => {
    const childStyle = child.getAttribute("style") || "";
    const childParts = childStyle
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("min-width"));
    childParts.push("min-width: 0");
    child.setAttribute("style", childParts.join("; "));
  });
}

function applyInlineSplitStyles(element: Element) {
  if (!element.classList.contains("massic-split")) return;
  const existingStyle = element.getAttribute("style") || "";
  const parts: string[] = existingStyle
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("display") && !s.startsWith("grid-template-columns") && !s.startsWith("gap") && !s.startsWith("align-items"));

  parts.push("display: grid");
  parts.push("gap: var(--massic-s6, 24px)");
  parts.push("align-items: center");
  parts.push("grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr)");
  element.setAttribute("style", parts.join("; "));
}

export function buildEditableHtmlModel(sanitizedHtml: string): EditableHtmlModel {
  const doc = parseHtml(normalizeLayoutHtml(sanitizedHtml));
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const refs: EditableTextNodeRef[] = [];
  const linkRefs: EditableLinkRef[] = [];
  const spacingRefs: EditableSpacingRef[] = [];
  const layoutRefs: EditableLayoutNode[] = [];
  const slotRefs: EditableSlotNode[] = [];
  const blockRefs: EditableBlockNode[] = [];
  const targetNodes: Text[] = [];
  const links = Array.from(doc.body.querySelectorAll("a"));

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parentTag = node.parentElement?.tagName.toLowerCase() || "";
    if (NON_EDITABLE_TAGS.has(parentTag)) continue;
    if (!getEditableTextOwnerElement(node.parentElement)) continue;
    if (!hasNonWhitespaceText(node)) continue;
    targetNodes.push(node);
  }

  targetNodes.forEach((node, index) => {
    const owner = getEditableTextOwnerElement(node.parentElement);
    if (!owner) return;
    const id = `txt-${index}`;
    const path = buildNodePath(doc.body, node);
    const ownerPath = buildNodePath(doc.body, owner);
    const tagName = owner.tagName.toLowerCase();
    const label = getTextBlockLabel(tagName);
    refs.push({ id, path, ownerPath, tagName, label });

    const span = doc.createElement("span");
    span.setAttribute("data-massic-text-id", id);
    span.setAttribute("data-massic-editable", "true");
    span.setAttribute("data-massic-text-label", label);
    span.setAttribute("title", `Edit ${label.toLowerCase()}`);
    span.className = "massic-text-editable";
    span.textContent = node.textContent || "";
    node.parentNode?.replaceChild(span, node);
  });

  links.forEach((link, index) => {
    const id = `lnk-${index}`;
    const path = buildNodePath(doc.body, link);
    const href = String(link.getAttribute("href") || "").trim();
    const label = (link.textContent || "").replace(/\u00A0/g, " ").trim();

    linkRefs.push({
      id,
      path,
      href,
      ...(label ? { label } : {}),
    });

    link.setAttribute("data-massic-link-id", id);
    link.setAttribute("data-massic-editable-link", "true");
    link.setAttribute("title", "Click to edit link");
  });

  const spacingTargets = Array.from(doc.body.querySelectorAll(EDITABLE_ELEMENT_SELECTOR))
    .filter(isSpacingContainerTarget)
    .map((element, index) => ({
      element,
      index,
      hasMassicClass: hasMassicClassName(String(element.getAttribute("class") || "")),
    }))
    .sort((left, right) => {
      if (left.hasMassicClass !== right.hasMassicClass) {
        return left.hasMassicClass ? -1 : 1;
      }
      return left.index - right.index;
    })
    .map((item) => item.element);

  spacingTargets.forEach((target, index) => {
    const id = `spc-${index}`;
    const path = buildNodePath(doc.body, target);
    const className = String(target.getAttribute("class") || "").trim();
    const styleStr = String(target.getAttribute("style") || "").trim();
    const spacingValue = parseEditableSpacingValue(className, styleStr);
    const nodeKind: EditableSpacingRef["nodeKind"] = isCanonicalLayoutElement(target) ? "layout" : "block";

    spacingRefs.push({
      id,
      path,
      tagName: target.tagName.toLowerCase(),
      className,
      nodeKind,
      ...spacingValue,
    });

    target.setAttribute("data-massic-spacing-id", id);
    target.setAttribute("data-massic-spacing-target", "true");
    if (target.tagName.toLowerCase() === "img") {
      target.setAttribute("data-massic-media-editable", "img");
      target.setAttribute("data-massic-edit-hint", "Click to edit image");
    } else if (
      target.tagName.toLowerCase() === "iframe" ||
      (target.tagName.toLowerCase() === "div" && target.classList.contains("massic-video-wrap"))
    ) {
      const iframe = target.tagName.toLowerCase() === "iframe"
        ? target
        : target.querySelector("iframe");
      if (iframe) {
        iframe.setAttribute("loading", "eager");
      }
      target.setAttribute("data-massic-media-editable", "iframe");
      target.setAttribute("data-massic-edit-hint", "Click to edit video");
    }
  });

  const layouts = Array.from(doc.body.querySelectorAll(`.${CANONICAL_LAYOUT_CLASS}`))
    .filter(isCanonicalLayoutElement);

  layouts.forEach((layout, index) => {
    const id = `lay-${index}`;
    const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
    layoutRefs.push({
      id,
      kind: "layout",
      path: buildNodePath(doc.body, layout),
      tagName: layout.tagName.toLowerCase(),
      className: String(layout.getAttribute("class") || "").trim(),
      slotIds: slots.map((_, slotIndex) => `slot-${index}-${slotIndex}`),
    });
    layout.setAttribute("data-massic-layout-id", id);
    applyInlineGridStyles(layout);
  });

  layouts.forEach((layout, layoutIndex) => {
    const layoutId = `lay-${layoutIndex}`;
    const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
    slots.forEach((slot, slotIndex) => {
      const id = `slot-${layoutIndex}-${slotIndex}`;
      const side = getCanonicalSlotSide(slot);
      const isEmpty = !hasMeaningfulChildContent(slot);
      slotRefs.push({
        id,
        kind: "slot",
        side,
        layoutId,
        isEmpty,
        path: buildNodePath(doc.body, slot),
        tagName: slot.tagName.toLowerCase(),
        className: String(slot.getAttribute("class") || "").trim(),
      });
      slot.setAttribute("data-massic-slot-id", id);
      slot.setAttribute("data-massic-slot-side", side);
      if (isEmpty) {
        slot.setAttribute("data-massic-slot-empty", "true");
      }
    });
  });

  const nonCanonicalGrids = Array.from(doc.body.querySelectorAll(".massic-grid, .massic-split"))
    .filter((el) => !isCanonicalLayoutElement(el));
  for (const el of nonCanonicalGrids) {
    if (el.classList.contains("massic-split")) {
      applyInlineSplitStyles(el);
    } else {
      applyInlineGridStyles(el);
    }
  }

  spacingTargets
    .filter((target) => !isCanonicalLayoutElement(target))
    .forEach((target, blockIndex) => {
      const parentSlot = target.closest(`.${CANONICAL_SLOT_CLASS}`) as Element | null;
      const parentLayout = target.closest(`.${CANONICAL_LAYOUT_CLASS}`) as Element | null;
      blockRefs.push({
        id: `blk-${blockIndex}`,
        kind: "block",
        path: buildNodePath(doc.body, target),
        tagName: target.tagName.toLowerCase(),
        className: String(target.getAttribute("class") || "").trim(),
        parentLayoutId: parentLayout?.getAttribute("data-massic-layout-id") || null,
        parentSlotId: parentSlot?.getAttribute("data-massic-slot-id") || null,
      });
    });

  const contentRoot = findMassicContentRoot(doc);
  const sectionElements = Array.from(contentRoot.children);
  const sectionRefs: EditableSectionRef[] = [];

  sectionElements.forEach((element, index) => {
    const id = `sec-${index}`;
    const className = String(element.getAttribute("class") || "").trim();
    sectionRefs.push({
      id,
      tagName: element.tagName.toLowerCase(),
      className,
      label: getSectionLabel(element),
    });
    element.setAttribute("data-massic-section-id", id);
  });

  return {
    previewHtml: doc.body.innerHTML,
    textNodeIndex: refs,
    linkIndex: linkRefs,
    spacingIndex: spacingRefs,
    sectionIndex: sectionRefs,
    layoutIndex: layoutRefs,
    slotIndex: slotRefs,
    blockIndex: blockRefs,
  };
}

export function applyTextEditsToHtml(
  sourceHtml: string,
  textNodeIndex: EditableTextNodeRef[],
  edits: Record<string, string>
): string {
  if (!sourceHtml || !textNodeIndex.length) return sourceHtml || "";

  const doc = parseHtml(sourceHtml);
  for (const ref of textNodeIndex) {
    if (!Object.prototype.hasOwnProperty.call(edits, ref.id)) continue;
    const nextText = String(edits[ref.id] ?? "");
    const node = getNodeByPath(doc.body, ref.path);
    if (!node || node.nodeType !== Node.TEXT_NODE) continue;
    node.textContent = nextText;
  }

  return doc.body.innerHTML;
}

export function getTextBlockInfoFromElement(target: HTMLElement): EditableTextBlockInfo | null {
  const textEl = target.closest("[data-massic-text-id]") as HTMLElement | null;
  if (!textEl) return null;
  const owner = getEditableTextOwnerElement(textEl.parentElement);
  if (!owner) return null;
  const id = textEl.dataset.massicTextId || "";
  if (!id) return null;

  return {
    id,
    label: textEl.dataset.massicTextLabel || getTextBlockLabel(owner.tagName.toLowerCase()),
    text: textEl.textContent || "",
    style: readEditableTextStyleFromElement(owner),
  };
}

export function updateTextBlockByTextId(
  sourceHtml: string,
  textNodeIndex: EditableTextNodeRef[],
  textId: string,
  updates: {
    text?: string;
    style?: Partial<EditableTextStyleValue>;
  }
): string {
  if (!sourceHtml || !textId) return sourceHtml;
  const ref = textNodeIndex.find((item) => item.id === textId);
  if (!ref) return sourceHtml;

  const doc = parseHtml(sourceHtml);
  const textNode = getNodeByPath(doc.body, ref.path);
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return sourceHtml;
  }

  if (updates.text !== undefined) {
    textNode.textContent = updates.text;
  }

  const ownerNode = getNodeByPath(doc.body, ref.ownerPath);
  if (ownerNode && ownerNode.nodeType === Node.ELEMENT_NODE && updates.style) {
    writeEditableTextStyleToElement(ownerNode as HTMLElement, updates.style);
  }

  return serializeNormalizedHtml(doc);
}

export function applyLinkEditsToHtml(
  sourceHtml: string,
  linkIndex: EditableLinkRef[],
  edits: Record<string, string>
): string {
  if (!sourceHtml || !linkIndex.length) return sourceHtml || "";

  const doc = parseHtml(sourceHtml);
  for (const ref of linkIndex) {
    if (!Object.prototype.hasOwnProperty.call(edits, ref.id)) continue;

    const nextHref = normalizeEditableLinkHref(String(edits[ref.id] ?? ""));
    const node = getNodeByPath(doc.body, ref.path);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    if (element.tagName.toLowerCase() !== "a") continue;

    if (!nextHref) {
      element.removeAttribute("href");
      continue;
    }

    if (!isSafeUrl(nextHref)) {
      continue;
    }

    element.setAttribute("href", nextHref);
  }

  return doc.body.innerHTML;
}

export function applyLinkLabelEditsToHtml(
  sourceHtml: string,
  linkIndex: EditableLinkRef[],
  edits: Record<string, string>
): string {
  if (!sourceHtml || !linkIndex.length) return sourceHtml || "";

  const doc = parseHtml(sourceHtml);
  for (const ref of linkIndex) {
    if (!Object.prototype.hasOwnProperty.call(edits, ref.id)) continue;

    const nextLabel = String(edits[ref.id] ?? "").replace(/\u00A0/g, " ").trim();
    const node = getNodeByPath(doc.body, ref.path);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    if (element.tagName.toLowerCase() !== "a") continue;

    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    if (textNodes.length === 0) {
      element.appendChild(doc.createTextNode(nextLabel));
      continue;
    }

    textNodes[0].textContent = nextLabel;
    for (let index = 1; index < textNodes.length; index += 1) {
      textNodes[index].textContent = "";
    }
  }

  return doc.body.innerHTML;
}

export function applySpacingEditsToHtml(
  sourceHtml: string,
  spacingIndex: EditableSpacingRef[],
  edits: Record<string, Partial<EditableSpacingValue> | null | undefined>
): string {
  if (!sourceHtml || !spacingIndex.length) return sourceHtml || "";

  const doc = parseHtml(sourceHtml);
  for (const ref of spacingIndex) {
    if (!Object.prototype.hasOwnProperty.call(edits, ref.id)) continue;

    const edit = normalizeEditableSpacingEdit(edits[ref.id]);
    const node = getNodeByPath(doc.body, ref.path);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    if (element.tagName.toLowerCase() !== ref.tagName.toLowerCase()) continue;

    const cleanedClass = stripSpacingFromClassName(String(element.getAttribute("class") || ""));
    if (cleanedClass) {
      element.setAttribute("class", cleanedClass);
    } else {
      element.removeAttribute("class");
    }

    const spacingStyle = buildSpacingStyleString(edit);
    const existingStyle = String(element.getAttribute("style") || "");
    const merged = mergeStyleStrings(existingStyle, spacingStyle);
    if (merged) {
      element.setAttribute("style", merged);
    } else {
      element.removeAttribute("style");
    }
  }

  return doc.body.innerHTML;
}

export function moveSectionInHtml(
  sourceHtml: string,
  sectionId: string,
  direction: "up" | "down"
): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const root = findMassicContentRoot(doc);
  const children = Array.from(root.children);
  const index = parseSectionIndex(sectionId);
  if (index < 0 || index >= children.length) return sourceHtml;

  const target = children[index];
  if (direction === "up" && index > 0) {
    root.insertBefore(target, children[index - 1]);
  } else if (direction === "down" && index < children.length - 1) {
    const after = children[index + 1].nextSibling;
    root.insertBefore(target, after);
  }

  return serializeNormalizedHtml(doc);
}

export function deleteSectionFromHtml(
  sourceHtml: string,
  sectionId: string
): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const root = findMassicContentRoot(doc);
  const children = Array.from(root.children);
  const index = parseSectionIndex(sectionId);
  if (index < 0 || index >= children.length) return sourceHtml;

  root.removeChild(children[index]);
  return serializeNormalizedHtml(doc);
}

export function duplicateSectionInHtml(
  sourceHtml: string,
  sectionId: string
): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const root = findMassicContentRoot(doc);
  const children = Array.from(root.children);
  const index = parseSectionIndex(sectionId);
  if (index < 0 || index >= children.length) return sourceHtml;

  const clone = children[index].cloneNode(true) as Element;
  const nextSibling = children[index].nextSibling;
  root.insertBefore(clone, nextSibling);
  return serializeNormalizedHtml(doc);
}

export function insertBlockInHtml(
  sourceHtml: string,
  anchorSectionId: string | null,
  position: "before" | "after",
  blockHtml: string
): string {
  if (!sourceHtml || !blockHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const root = findMassicContentRoot(doc);

  const blockDoc = parseHtml(blockHtml);
  const newElements = Array.from(blockDoc.body.children);
  if (!newElements.length) return sourceHtml;

  if (!anchorSectionId) {
    for (const el of newElements) {
      root.appendChild(doc.adoptNode(el));
    }
    return serializeNormalizedHtml(doc);
  }

  const children = Array.from(root.children);
  const index = parseSectionIndex(anchorSectionId);
  if (index < 0 || index >= children.length) {
    for (const el of newElements) {
      root.appendChild(doc.adoptNode(el));
    }
    return serializeNormalizedHtml(doc);
  }

  const anchor = children[index];
  if (position === "before") {
    for (const el of newElements) {
      root.insertBefore(doc.adoptNode(el), anchor);
    }
  } else {
    const nextSibling = anchor.nextSibling;
    for (const el of newElements) {
      root.insertBefore(doc.adoptNode(el), nextSibling);
    }
  }

  return serializeNormalizedHtml(doc);
}

export function buildImageBlockHtml(
  src: string,
  alt?: string,
  alignment?: ImageAlignment
): string {
  const safeSrc = String(src || "").trim();
  if (!safeSrc || !isSafeUrl(safeSrc)) return "";

  const safeAlt = escapeHtmlAttr(alt || "");
  const containerClasses =
    alignment === "left" ? "massic-container" : "massic-container massic-center";

  return `<section class="massic-section"><div class="${containerClasses}"><img src="${safeSrc}" alt="${safeAlt}" loading="lazy" decoding="async" /></div></section>`;
}

export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  const normalized = String(url || "").trim();
  if (!normalized) return null;

  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = pattern.exec(normalized);
    if (match) {
      return {
        provider: "youtube",
        videoId: match[1],
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      };
    }
  }

  const vimeoMatch = /vimeo\.com\/(?:video\/)?(\d+)/.exec(normalized);
  if (vimeoMatch) {
    return {
      provider: "vimeo",
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return null;
}

export function buildVideoEmbedHtml(url: string): string {
  const parsed = parseVideoUrl(url);
  if (!parsed) return "";

  const escapedSrc = escapeHtmlAttr(parsed.embedUrl);
  return [
    `<section class="massic-section">`,
    `<div class="massic-container massic-center">`,
    `<div class="massic-video-wrap">`,
    `<iframe src="${escapedSrc}" width="100%" height="400" frameborder="0" `,
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" `,
    `allowfullscreen loading="eager" title="Embedded video"></iframe>`,
    `</div></div></section>`,
  ].join("");
}

export function buildTextSectionHtml(): string {
  return `<section class="massic-section"><div class="massic-container massic-stack"><p>New section — click to edit text.</p></div></section>`;
}

export function buildDividerHtml(): string {
  return `<hr class="massic-divider" />`;
}

export function extractPlainTextFromHtml(html: string): string {
  const doc = parseHtml(html || "");
  return (doc.body.textContent || "").trim();
}

export function canonicalizeHtml(html: string): string {
  return String(html || "").replace(/\r\n/g, "\n").trim();
}

// ---------------------------------------------------------------------------
//  Element-level operations (operate on any spacing-targeted element by its ID)
// ---------------------------------------------------------------------------

function parseSpacingIndex(spacingId: string): number {
  const match = /^spc-(\d+)$/.exec(spacingId);
  return match ? Number(match[1]) : -1;
}

function parseSlotIndex(slotId: string): [number, number] | null {
  const match = /^slot-(\d+)-(\d+)$/.exec(slotId);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function parseLayoutIndex(layoutId: string): number {
  const match = /^lay-(\d+)$/.exec(layoutId);
  return match ? Number(match[1]) : -1;
}

function findSpacingTargetElement(doc: Document, spacingId: string): Element | null {
  const idx = parseSpacingIndex(spacingId);
  if (idx < 0) return null;

  const allTargets = Array.from(doc.body.querySelectorAll(EDITABLE_ELEMENT_SELECTOR))
    .filter(isSpacingContainerTarget)
    .map((element, i) => ({
      element,
      i,
      hasMassicClass: hasMassicClassName(String(element.getAttribute("class") || "")),
    }))
    .sort((a, b) => {
      if (a.hasMassicClass !== b.hasMassicClass) return a.hasMassicClass ? -1 : 1;
      return a.i - b.i;
    });

  return allTargets[idx]?.element ?? null;
}

function findLayoutElement(doc: Document, layoutId: string): Element | null {
  const idx = parseLayoutIndex(layoutId);
  if (idx < 0) return null;
  const layouts = Array.from(doc.body.querySelectorAll(`.${CANONICAL_LAYOUT_CLASS}`))
    .filter(isCanonicalLayoutElement);
  return layouts[idx] ?? null;
}

function findSlotElement(doc: Document, slotId: string): Element | null {
  const parsed = parseSlotIndex(slotId);
  if (!parsed) return null;
  const [layoutIndex, slotIndex] = parsed;
  const layout = findLayoutElement(doc, `lay-${layoutIndex}`);
  if (!layout) return null;
  const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
  return slots[slotIndex] ?? null;
}

function collapseSingleEmptyTwoSlotLayout(layout: Element) {
  if (!isCanonicalLayoutElement(layout) || !layout.parentNode) return;
  const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
  if (slots.length !== 2) return;

  const [firstSlot, secondSlot] = slots;
  const firstHasContent = hasMeaningfulChildContent(firstSlot);
  const secondHasContent = hasMeaningfulChildContent(secondSlot);
  if (firstHasContent === secondHasContent) return;

  const survivingSlot = firstHasContent ? firstSlot : secondSlot;
  while (survivingSlot.firstChild) {
    layout.parentNode.insertBefore(survivingSlot.firstChild, layout);
  }
  layout.remove();
}

export interface ElementSiblingInfo {
  isFirst: boolean;
  isLast: boolean;
  siblingCount: number;
  isEmpty: boolean;
}

export function getElementSiblingInfo(sourceHtml: string, spacingId: string): ElementSiblingInfo {
  const fallback: ElementSiblingInfo = { isFirst: true, isLast: true, siblingCount: 1, isEmpty: false };
  if (!sourceHtml || !spacingId) return fallback;

  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return fallback;

  const siblings = Array.from(el.parentElement.children).filter(
    (c) => c.nodeType === Node.ELEMENT_NODE
  );
  const idx = siblings.indexOf(el);
  const text = (el.textContent || "").replace(/\u00A0/g, " ").trim();
  const isEmpty = el.childElementCount === 0 && !text;

  return {
    isFirst: idx === 0,
    isLast: idx === siblings.length - 1,
    siblingCount: siblings.length,
    isEmpty,
  };
}

export function deleteElementBySpacingId(sourceHtml: string, spacingId: string): string {
  return deleteBlockAndNormalize(sourceHtml, spacingId);
}

export function deleteBlockAndNormalize(sourceHtml: string, spacingId: string): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return sourceHtml;
  if (isCanonicalLayoutElement(el)) return sourceHtml;
  const parentLayout = el.closest(`.${CANONICAL_LAYOUT_CLASS}`) as Element | null;
  el.parentElement.removeChild(el);
  if (parentLayout) {
    collapseSingleEmptyTwoSlotLayout(parentLayout);
  }
  return serializeNormalizedHtml(doc);
}

export function deleteSlotById(sourceHtml: string, slotId: string): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const slot = findSlotElement(doc, slotId);
  if (!slot || !slot.parentElement) return sourceHtml;
  const layout = slot.parentElement;
  slot.remove();

  const remainingSlots = Array.from(layout.children).filter(isCanonicalSlotElement);
  if (!remainingSlots.length) {
    layout.remove();
    return serializeNormalizedHtml(doc);
  }

  if (remainingSlots.length === 1 && layout.parentNode) {
    const survivingSlot = remainingSlots[0]!;
    while (survivingSlot.firstChild) {
      layout.parentNode.insertBefore(survivingSlot.firstChild, layout);
    }
    layout.remove();
    return serializeNormalizedHtml(doc);
  }

  return serializeNormalizedHtml(doc);
}

export function duplicateElementBySpacingId(sourceHtml: string, spacingId: string): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return sourceHtml;
  if (isCanonicalLayoutElement(el)) return sourceHtml;
  const clone = el.cloneNode(true) as Element;
  el.parentElement.insertBefore(clone, el.nextSibling);
  return serializeNormalizedHtml(doc);
}

export function moveElementBySpacingId(
  sourceHtml: string,
  spacingId: string,
  direction: "up" | "down"
): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return sourceHtml;
  if (isCanonicalLayoutElement(el)) return sourceHtml;

  const parent = el.parentElement;
  const siblings = Array.from(parent.children);
  const idx = siblings.indexOf(el);

  if (direction === "up" && idx > 0) {
    parent.insertBefore(el, siblings[idx - 1]);
  } else if (direction === "down" && idx < siblings.length - 1) {
    parent.insertBefore(el, siblings[idx + 1].nextSibling);
  }

  return serializeNormalizedHtml(doc);
}

function unwrapSectionContainer(blockHtml: string): string {
  const doc = parseHtml(blockHtml);
  const section = doc.body.querySelector("section.massic-section");
  if (!section) return blockHtml;
  const container = section.querySelector(".massic-container");
  if (container) return container.innerHTML;
  return section.innerHTML;
}

export function insertInsideElementBySpacingId(
  sourceHtml: string,
  spacingId: string,
  position: "start" | "end",
  blockHtml: string
): string {
  if (!sourceHtml || !blockHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el) return sourceHtml;

  const innerHtml = unwrapSectionContainer(blockHtml);
  const frag = parseHtml(innerHtml);
  const newElements = Array.from(frag.body.children);
  if (!newElements.length) return sourceHtml;

  if (position === "start") {
    const first = el.firstChild;
    for (const child of newElements) {
      el.insertBefore(doc.adoptNode(child), first);
    }
  } else {
    for (const child of newElements) {
      el.appendChild(doc.adoptNode(child));
    }
  }

  return serializeNormalizedHtml(doc);
}

export function insertAdjacentToElementBySpacingId(
  sourceHtml: string,
  spacingId: string,
  position: "before" | "after",
  blockHtml: string
): string {
  if (!sourceHtml || !blockHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return sourceHtml;

  const innerHtml = unwrapSectionContainer(blockHtml);
  const frag = parseHtml(innerHtml);
  const newElements = Array.from(frag.body.children);
  if (!newElements.length) return sourceHtml;

  const parent = el.parentElement;
  if (position === "before") {
    for (const child of newElements) {
      parent.insertBefore(doc.adoptNode(child), el);
    }
  } else {
    const nextSib = el.nextSibling;
    for (const child of newElements) {
      parent.insertBefore(doc.adoptNode(child), nextSib);
    }
  }

  return serializeNormalizedHtml(doc);
}

export function insertBlockIntoSlot(
  sourceHtml: string,
  slotId: string,
  blockHtml: string,
  position: "start" | "end" = "end"
): string {
  if (!sourceHtml || !blockHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const slot = findSlotElement(doc, slotId);
  if (!slot) return sourceHtml;

  const innerHtml = unwrapSectionContainer(blockHtml);
  const frag = parseHtml(innerHtml);
  const newChildren = Array.from(frag.body.children);
  if (!newChildren.length) return sourceHtml;

  if (position === "start") {
    const first = slot.firstChild;
    for (const child of newChildren) {
      slot.insertBefore(doc.adoptNode(child), first);
    }
  } else {
    for (const child of newChildren) {
      slot.appendChild(doc.adoptNode(child));
    }
  }

  return serializeNormalizedHtml(doc);
}

export function collapseLayoutBySpacingId(sourceHtml: string, spacingId: string): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const layout = findSpacingTargetElement(doc, spacingId);
  if (!layout || !isCanonicalLayoutElement(layout) || !layout.parentNode) return sourceHtml;

  const slots = Array.from(layout.children).filter(isCanonicalSlotElement);
  for (const slot of slots) {
    while (slot.firstChild) {
      layout.parentNode.insertBefore(slot.firstChild, layout);
    }
  }
  layout.remove();
  return serializeNormalizedHtml(doc);
}

// ---------------------------------------------------------------------------
//  Wrap element with a sibling in a canonical 2-column layout (Insert Left / Right)
// ---------------------------------------------------------------------------

export function wrapBlockInTwoColumnLayout(
  sourceHtml: string,
  spacingId: string,
  insertSide: "left" | "right",
  newContentHtml: string
): string {
  if (!sourceHtml || !newContentHtml) return sourceHtml || "";
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el || !el.parentElement) return sourceHtml;
  if (isCanonicalLayoutElement(el)) return sourceHtml;

  const innerHtml = unwrapSectionContainer(newContentHtml);
  const frag = parseHtml(innerHtml);
  const newChildren = Array.from(frag.body.children);
  if (!newChildren.length) return sourceHtml;

  const layout = doc.createElement("div");
  ensureCanonicalLayoutClasses(layout);
  layout.classList.add(CANONICAL_LAYOUT_GRID_CLASS, CANONICAL_LAYOUT_TWO_COL_CLASS);
  const existingSlot = createCanonicalSlot(doc, insertSide === "left" ? "right" : "left");
  const newSlot = createCanonicalSlot(doc, insertSide);

  for (const child of newChildren) {
    newSlot.appendChild(doc.adoptNode(child));
  }

  const parent = el.parentElement;
  const nextSibling = el.nextSibling;

  parent.removeChild(el);
  existingSlot.appendChild(el);

  if (insertSide === "left") {
    layout.appendChild(newSlot);
    layout.appendChild(existingSlot);
  } else {
    layout.appendChild(existingSlot);
    layout.appendChild(newSlot);
  }

  parent.insertBefore(layout, nextSibling);
  return serializeNormalizedHtml(doc);
}

export function wrapElementWithSiblingGrid(
  sourceHtml: string,
  spacingId: string,
  insertSide: "left" | "right",
  newContentHtml: string
): string {
  return wrapBlockInTwoColumnLayout(sourceHtml, spacingId, insertSide, newContentHtml);
}

// ---------------------------------------------------------------------------
//  Media (image / iframe) operations within elements
// ---------------------------------------------------------------------------

export interface MediaElementInfo {
  type: "img" | "iframe";
  src: string;
  alt: string;
  width: string;
  mediaIndex: number;
}

export function getMediaInfoFromElement(
  containerEl: HTMLElement,
  clickTarget: HTMLElement
): MediaElementInfo | null {
  const imgEl = clickTarget.tagName === "IMG"
    ? (clickTarget as HTMLImageElement)
    : clickTarget.closest("img") as HTMLImageElement | null;

  if (imgEl) {
    const allImgs = containerEl.tagName === "IMG"
      ? [containerEl]
      : Array.from(containerEl.querySelectorAll("img"));
    const idx = allImgs.indexOf(imgEl);
    return {
      type: "img",
      src: imgEl.getAttribute("src") || "",
      alt: imgEl.getAttribute("alt") || "",
      width: imgEl.style.width || imgEl.getAttribute("width") || "",
      mediaIndex: idx >= 0 ? idx : 0,
    };
  }

  const videoWrap = clickTarget.closest(".massic-video-wrap");
  const iframeEl = clickTarget.tagName === "IFRAME"
    ? (clickTarget as HTMLIFrameElement)
    : (videoWrap?.querySelector("iframe") as HTMLIFrameElement | null)
    ?? (clickTarget.closest("iframe") as HTMLIFrameElement | null);

  if (iframeEl) {
    const allIframes = containerEl.tagName === "IFRAME"
      ? [containerEl]
      : Array.from(containerEl.querySelectorAll("iframe"));
    const idx = allIframes.indexOf(iframeEl);
    return {
      type: "iframe",
      src: iframeEl.getAttribute("src") || "",
      alt: iframeEl.getAttribute("title") || "",
      width: iframeEl.style.width || iframeEl.getAttribute("width") || "",
      mediaIndex: idx >= 0 ? idx : 0,
    };
  }

  return null;
}

export function updateMediaInElementBySpacingId(
  sourceHtml: string,
  spacingId: string,
  mediaIndex: number,
  mediaType: "img" | "iframe",
  updates: { src?: string; alt?: string; width?: string }
): string {
  if (!sourceHtml) return sourceHtml;
  const doc = parseHtml(sourceHtml);
  const el = findSpacingTargetElement(doc, spacingId);
  if (!el) return sourceHtml;

  const mediaElements = el.tagName.toLowerCase() === mediaType
    ? [el]
    : Array.from(el.querySelectorAll(mediaType));
  const media = mediaElements[mediaIndex] as HTMLElement | undefined;
  if (!media) return sourceHtml;

  if (updates.src !== undefined) {
    const nextSrc = mediaType === "iframe"
      ? (parseVideoUrl(updates.src)?.embedUrl || String(updates.src || "").trim())
      : String(updates.src || "").trim();
    media.setAttribute("src", nextSrc);
    if (mediaType === "iframe") {
      media.setAttribute("loading", "eager");
    }
  }
  if (updates.alt !== undefined) {
    if (mediaType === "img") {
      media.setAttribute("alt", updates.alt);
    } else {
      media.setAttribute("title", updates.alt);
    }
  }
  if (updates.width !== undefined) {
    const w = updates.width;
    if (w) {
      media.removeAttribute("width");
      media.style.width = w;
      media.style.maxWidth = w;
    } else {
      media.removeAttribute("width");
      media.style.removeProperty("width");
      media.style.removeProperty("max-width");
    }
  }

  return serializeNormalizedHtml(doc);
}
