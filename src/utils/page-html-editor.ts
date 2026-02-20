export interface EditableTextNodeRef {
  id: string;
  path: number[];
}

export interface EditableHtmlModel {
  previewHtml: string;
  textNodeIndex: EditableTextNodeRef[];
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
  const targetNodes: Text[] = [];

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

  return {
    previewHtml: doc.body.innerHTML,
    textNodeIndex: refs,
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

export function extractPlainTextFromHtml(html: string): string {
  const doc = parseHtml(html || "");
  return (doc.body.textContent || "").trim();
}

export function canonicalizeHtml(html: string): string {
  return String(html || "").replace(/\r\n/g, "\n").trim();
}
