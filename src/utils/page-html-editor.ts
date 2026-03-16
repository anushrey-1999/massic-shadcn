export interface EditableTextNodeRef {
  id: string;
  path: number[];
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
}

export interface EditableSpacingRef extends EditableSpacingValue {
  id: string;
  path: number[];
  tagName: string;
  className: string;
}

export interface EditableHtmlModel {
  previewHtml: string;
  textNodeIndex: EditableTextNodeRef[];
  linkIndex: EditableLinkRef[];
  spacingIndex: EditableSpacingRef[];
}

const FORBIDDEN_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
  "svg",
  "math",
]);

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
]);
const NON_EDITABLE_TAGS = new Set(["code", "pre"]);
const SPACING_CONTAINER_TAGS = new Set(["section", "article", "div"]);
const SPACING_MASSIC_CLASS_PATTERN = /\bmassic-[a-z0-9_-]+\b/i;
const SPACING_CLASS_NAME_PATTERN = /^massic-sp-(?:mt|mb)-(?:none|xs|s|m|l|xl|px-\d{1,3}|nx-\d{1,3})$/;
const SPACING_CLASS_PREFIX_BY_KEY: Record<keyof EditableSpacingValue, string> = {
  outsideTop: "massic-sp-mt-",
  outsideBottom: "massic-sp-mb-",
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

export function parseEditableSpacingValueFromClassName(classNameInput: string): EditableSpacingValue {
  const classNames = String(classNameInput || "")
    .split(/\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
  const classSet = new Set(classNames);

  const resolveToken = (prefix: string): EditableSpacingToken | null => {
    for (const scale of EDITABLE_SPACING_SCALE_VALUES) {
      if (classSet.has(`${prefix}${scale}`)) {
        return scale;
      }
    }
    for (const className of classNames) {
      if (!className.startsWith(`${prefix}px-`) && !className.startsWith(`${prefix}nx-`)) continue;
      const token = normalizeSpacingToken(className.slice(prefix.length));
      if (!token || !token.startsWith("num:")) continue;
      return token;
    }
    return null;
  };

  return {
    outsideTop: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideTop),
    outsideBottom: resolveToken(SPACING_CLASS_PREFIX_BY_KEY.outsideBottom),
  };
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

export function mergeSpacingUtilityClasses(
  classNameInput: string,
  spacingEdit: Partial<EditableSpacingValue> | null | undefined
): string {
  const normalizedEdit = normalizeEditableSpacingEdit(spacingEdit);
  const classNames = splitClassNames(classNameInput).filter((className) => !SPACING_CLASS_NAME_PATTERN.test(className));

  for (const key of Object.keys(SPACING_CLASS_PREFIX_BY_KEY) as Array<keyof EditableSpacingValue>) {
    if (!Object.prototype.hasOwnProperty.call(normalizedEdit, key)) continue;
    const token = normalizedEdit[key];
    if (!token) continue;
    if (SPACING_SCALE_SET.has(token)) {
      classNames.push(`${SPACING_CLASS_PREFIX_BY_KEY[key]}${token}`);
      continue;
    }
    const spacingPx = parseSpacingNumberToken(token);
    if (spacingPx == null) continue;
    if (spacingPx < 0) {
      classNames.push(`${SPACING_CLASS_PREFIX_BY_KEY[key]}nx-${Math.abs(spacingPx)}`);
      continue;
    }
    classNames.push(`${SPACING_CLASS_PREFIX_BY_KEY[key]}px-${spacingPx}`);
  }

  return Array.from(new Set(classNames)).join(" ").trim();
}

function hasMassicClassName(classNameInput: string): boolean {
  return SPACING_MASSIC_CLASS_PATTERN.test(String(classNameInput || ""));
}

function isSpacingContainerTarget(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (!SPACING_CONTAINER_TAGS.has(tagName)) return false;
  if (tagName === "div" && element.classList.contains("massic-content")) return false;
  if (element.hasAttribute("data-massic-text-id")) return false;
  if (element.hasAttribute("data-massic-link-id")) return false;
  if (element.classList.contains("massic-text-editable")) return false;

  const text = (element.textContent || "").replace(/\u00A0/g, " ").trim();
  if (element.childElementCount === 0 && !text) return false;

  return true;
}

function sanitizeAttributes(element: Element) {
  const attrs = Array.from(element.attributes);

  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith("on") || name === "style") {
      element.removeAttribute(attr.name);
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
    if (FORBIDDEN_TAGS.has(element.tagName.toLowerCase())) {
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

export function buildEditableHtmlModel(sanitizedHtml: string): EditableHtmlModel {
  const doc = parseHtml(sanitizedHtml);
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const refs: EditableTextNodeRef[] = [];
  const linkRefs: EditableLinkRef[] = [];
  const spacingRefs: EditableSpacingRef[] = [];
  const targetNodes: Text[] = [];
  const links = Array.from(doc.body.querySelectorAll("a"));

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parentTag = node.parentElement?.tagName.toLowerCase() || "";
    if (NON_EDITABLE_TAGS.has(parentTag)) continue;
    if (!hasNonWhitespaceText(node)) continue;
    targetNodes.push(node);
  }

  targetNodes.forEach((node, index) => {
    const id = `txt-${index}`;
    const path = buildNodePath(doc.body, node);
    refs.push({ id, path });

    const span = doc.createElement("span");
    span.setAttribute("data-massic-text-id", id);
    span.setAttribute("data-massic-editable", "true");
    span.setAttribute("contenteditable", "plaintext-only");
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

  const spacingTargets = Array.from(doc.body.querySelectorAll("section,article,div"))
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
    const spacingValue = parseEditableSpacingValueFromClassName(className);

    spacingRefs.push({
      id,
      path,
      tagName: target.tagName.toLowerCase(),
      className,
      ...spacingValue,
    });

    target.setAttribute("data-massic-spacing-id", id);
    target.setAttribute("data-massic-spacing-target", "true");
  });

  return {
    previewHtml: doc.body.innerHTML,
    textNodeIndex: refs,
    linkIndex: linkRefs,
    spacingIndex: spacingRefs,
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

    const nextClassName = mergeSpacingUtilityClasses(String(element.getAttribute("class") || ""), edit);
    if (!nextClassName) {
      element.removeAttribute("class");
      continue;
    }
    element.setAttribute("class", nextClassName);
  }

  return doc.body.innerHTML;
}

export function extractPlainTextFromHtml(html: string): string {
  const doc = parseHtml(html || "");
  return (doc.body.textContent || "").trim();
}

export function canonicalizeHtml(html: string): string {
  return String(html || "").replace(/\r\n/g, "\n").trim();
}
