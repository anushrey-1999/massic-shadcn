const STYLE_PROPERTIES = [
  "box-sizing", "display", "position", "inset", "z-index",
  "margin", "padding", "border-top", "border-right", "border-bottom", "border-left",
  "border-radius", "background-color", "color", "opacity",
  "font-family", "font-size", "font-style", "font-weight", "line-height", "letter-spacing",
  "text-align", "text-decoration", "text-underline-offset", "text-transform",
  "overflow-wrap", "white-space", "list-style-type",
  "justify-content", "align-items", "align-self", "row-gap", "column-gap",
  "flex-direction", "flex-wrap", "flex-shrink", "flex-grow",
  "grid-row", "grid-column", "overflow-x", "overflow-y", "vertical-align",
  "border-collapse", "border-spacing", "object-fit",
];

function copyDimensions(source: Element, target: HTMLElement, computed: CSSStyleDeclaration) {
  const isMedia = source.matches("img, video, svg");
  const authored = source.computedStyleMap?.();
  for (const key of ["width", "height", "max-width", "max-height", "min-width", "min-height"]) {
    const value = authored?.get(key)?.toString() ??
      (isMedia || key.startsWith("max-") || key.startsWith("min-") ? computed.getPropertyValue(key) : "");
    if (value && value !== "auto" && value !== "none") target.style.setProperty(key, value);
  }
  if (isMedia && !target.style.maxWidth) target.style.maxWidth = "100%";
}

function copyGridColumns(source: Element, target: HTMLElement, computed: CSSStyleDeclaration) {
  if (computed.display !== "grid") return;
  const classes = Array.from(source.classList);
  const responsive = classes.find((name) => name.startsWith("sm:grid-cols-"));
  if (responsive) {
    const template = responsive.slice("sm:grid-cols-".length);
    const columns = template.startsWith("[") ? template.split("_").length : Number(template);
    if (Number.isInteger(columns) && columns > 1) {
      const gap = Number.parseFloat(computed.columnGap) || 0;
      // Fit the same number of tracks at full width and wrap within a narrow CMS column.
      const track = `max(12rem, calc((100% - ${gap * (columns - 1)}px) / ${columns}))`;
      target.style.gridTemplateColumns = `repeat(auto-fit, minmax(min(100%, ${track}), 1fr))`;
    }
    return;
  }

  const fixed = classes.find((name) => name.startsWith("grid-cols-["));
  if (fixed) target.style.gridTemplateColumns = fixed.slice("grid-cols-[".length, -1).replaceAll("_", " ");
}

export function websiteArchitectureHtml(source: HTMLElement) {
  const copy = source.cloneNode(true) as HTMLElement;
  const scope = `massic-page-${crypto.getRandomValues(new Uint32Array(2)).join("-")}`;
  const cssClasses = new Map<string, string>();
  const originals = [source, ...source.querySelectorAll("*")];
  const clones = [copy, ...copy.querySelectorAll("*")];

  originals.forEach((original, index) => {
    const clone = clones[index];
    if (clone.matches("script, style, link, iframe, object, embed")) {
      clone.remove();
      return;
    }
    if (!(clone instanceof HTMLElement)) {
      clone.remove();
      return;
    }

    const computed = getComputedStyle(original);
    for (const property of STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) clone.style.setProperty(property, value);
    }
    copyDimensions(original, clone, computed);
    copyGridColumns(original, clone, computed);
    if (clone === copy) {
      clone.style.width = "100%";
      clone.style.maxWidth = "56rem";
      clone.style.fontFamily = "Geist, system-ui, sans-serif";
    }
    const declarations = clone.style.cssText;
    let className = cssClasses.get(declarations);
    if (!className) {
      className = `mwa-${cssClasses.size + 1}`;
      cssClasses.set(declarations, className);
    }
    for (const name of clone.getAttributeNames()) {
      if (name === "style" || name.startsWith("data-") || name.startsWith("on")) clone.removeAttribute(name);
    }
    clone.className = className;
  });

  copy.classList.add(scope);
  const css = Array.from(cssClasses, ([declarations, className]) =>
    `.${scope}.${className}, .${scope} .${className} { ${declarations} }`
  ).join("\n");
  return `<style>\n${css.replaceAll("<", "\\3c ")}\n</style>\n${copy.outerHTML}`;
}
