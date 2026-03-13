export type JsonObject = Record<string, unknown>;

export interface PerformanceReportMetric {
  label: string;
  value: string;
  change?: string;
  sublabel?: string;
  direction?: "up" | "down" | "flat";
}

export interface PerformanceReportTable {
  headers: string[];
  rows: string[][];
}

export interface PerformanceReportSection {
  id?: string;
  key?: string;
  title: string;
  narrative?: string;
  insight?: string;
  summary?: string;
  text?: string;
  metrics?: PerformanceReportMetric[];
  table?: PerformanceReportTable;
  raw?: unknown;
}

export type PerformanceReportV2Block =
  | { kind: "meta"; key: string; value: JsonObject }
  | { kind: "headline"; key: string; section: PerformanceReportSection }
  | { kind: "section"; key: string; section: PerformanceReportSection }
  | { kind: "section_list"; key: string; sections: PerformanceReportSection[] }
  | { kind: "unknown"; key: string; value: unknown };

export interface PerformanceReportV2Document {
  raw: JsonObject;
  title: string;
  blocks: PerformanceReportV2Block[];
  meta?: JsonObject;
}

export type ParsedPerformanceReport =
  | { kind: "empty" }
  | { kind: "markdown"; markdown: string }
  | { kind: "v2"; document: PerformanceReportV2Document; raw: JsonObject };

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function titleFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeMetric(input: unknown): PerformanceReportMetric | null {
  if (!isObject(input)) return null;

  const label = toDisplayString(input.label || input.name || "").trim();
  const value = toDisplayString(input.value ?? "").trim();

  if (!label && !value) return null;

  const rawDirection = toDisplayString(input.direction || "").toLowerCase();
  let direction: PerformanceReportMetric["direction"] = "flat";
  if (rawDirection === "up" || rawDirection === "increase" || rawDirection === "positive") {
    direction = "up";
  } else if (rawDirection === "down" || rawDirection === "decrease" || rawDirection === "negative") {
    direction = "down";
  }

  return {
    label: label || "Metric",
    value: value || "-",
    change: toDisplayString(input.change || "").trim() || undefined,
    sublabel: toDisplayString(input.sublabel || input.sub_label || "").trim() || undefined,
    direction,
  };
}

function normalizeTable(input: unknown): PerformanceReportTable | undefined {
  if (!isObject(input)) return undefined;

  const headers = Array.isArray(input.headers)
    ? input.headers.map((header) => toDisplayString(header)).filter(Boolean)
    : [];

  const rows = Array.isArray(input.rows)
    ? input.rows
        .map((row) => {
          if (!Array.isArray(row)) return null;
          return row.map((cell) => toDisplayString(cell));
        })
        .filter((row): row is string[] => Array.isArray(row))
    : [];

  if (!headers.length && !rows.length) return undefined;

  return { headers, rows };
}

function normalizeSection(input: unknown, fallbackTitle: string, key?: string): PerformanceReportSection | null {
  if (!isObject(input)) return null;

  const metrics = Array.isArray(input.metrics)
    ? input.metrics.map(normalizeMetric).filter((metric): metric is PerformanceReportMetric => !!metric)
    : undefined;

  const section: PerformanceReportSection = {
    id: toDisplayString(input.id || "").trim() || undefined,
    key,
    title: toDisplayString(input.title || fallbackTitle || titleFromKey(key || "section")).trim() || fallbackTitle,
    narrative: toDisplayString(input.narrative || "").trim() || undefined,
    insight: toDisplayString(input.insight || "").trim() || undefined,
    summary: toDisplayString(input.summary || "").trim() || undefined,
    text: toDisplayString(input.text || "").trim() || undefined,
    metrics,
    table: normalizeTable(input.table),
    raw: input,
  };

  const hasContent =
    !!section.narrative ||
    !!section.insight ||
    !!section.summary ||
    !!section.text ||
    !!(section.metrics && section.metrics.length > 0) ||
    !!section.table;

  if (!hasContent && !section.title) return null;

  return section;
}

function normalizeSectionList(input: unknown, key: string): PerformanceReportSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => normalizeSection(item, `${titleFromKey(key)} ${index + 1}`, key))
    .filter((section): section is PerformanceReportSection => !!section);
}

function deriveReportTitle(meta: JsonObject | undefined): string {
  if (!meta) return "Performance Report";

  const clientName = toDisplayString(meta.client_name || meta.clientName || "").trim();
  const period = toDisplayString(meta.period || "").trim();

  if (clientName && period) return `${clientName} ${period} Performance Report`;
  if (clientName) return `${clientName} Performance Report`;
  return "Performance Report";
}

function normalizeTopLevelEntries(payload: JsonObject): Array<[string, unknown]> {
  return Object.entries(payload);
}

export function parsePerformanceReport(payload: unknown): ParsedPerformanceReport {
  if (payload === null || payload === undefined) {
    return { kind: "empty" };
  }

  if (isObject(payload)) {
    const document = normalizePerformanceReportDocument(payload);
    return { kind: "v2", document, raw: payload };
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return { kind: "empty" };

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (isObject(parsed)) {
          const document = normalizePerformanceReportDocument(parsed);
          return { kind: "v2", document, raw: parsed };
        }
      } catch {
        // Keep markdown fallback.
      }
    }

    return { kind: "markdown", markdown: payload };
  }

  return { kind: "markdown", markdown: toDisplayString(payload) };
}

export function normalizePerformanceReportDocument(payload: JsonObject): PerformanceReportV2Document {
  const blocks: PerformanceReportV2Block[] = [];
  const entries = normalizeTopLevelEntries(payload);
  for (const [key, value] of entries) {
    if (key === "meta" && isObject(value)) {
      blocks.push({ kind: "meta", key, value });
      continue;
    }

    if (key === "headline") {
      const section = normalizeSection(value, "At a Glance", key);
      if (section) {
        if (!section.title) section.title = "At a Glance";
        blocks.push({ kind: "headline", key, section });
      } else {
        blocks.push({ kind: "unknown", key, value });
      }
      continue;
    }

    if (key === "sections" || key === "opportunities") {
      const sections = normalizeSectionList(value, key);
      if (sections.length) {
        blocks.push({ kind: "section_list", key, sections });
      } else {
        blocks.push({ kind: "unknown", key, value });
      }
      continue;
    }

    if (key === "highlight") {
      const section = normalizeSection(value, "This Period's Biggest Win", key);
      if (section) {
        if (!section.title) section.title = "This Period's Biggest Win";
        blocks.push({ kind: "section", key, section });
      } else {
        blocks.push({ kind: "unknown", key, value });
      }
      continue;
    }

    if (isObject(value)) {
      const section = normalizeSection(value, titleFromKey(key), key);
      if (section) {
        blocks.push({ kind: "section", key, section });
      } else {
        blocks.push({ kind: "unknown", key, value });
      }
      continue;
    }

    if (Array.isArray(value)) {
      const sections = normalizeSectionList(value, key);
      if (sections.length) {
        blocks.push({ kind: "section_list", key, sections });
      } else {
        blocks.push({ kind: "unknown", key, value });
      }
      continue;
    }

    blocks.push({ kind: "unknown", key, value });
  }

  const metaBlock = blocks.find((block) => block.kind === "meta") as
    | { kind: "meta"; key: string; value: JsonObject }
    | undefined;

  return {
    raw: payload,
    title: deriveReportTitle(metaBlock?.value),
    blocks,
    meta: metaBlock?.value,
  };
}

export function performanceReportToPlainText(document: PerformanceReportV2Document): string {
  const lines: string[] = [];

  if (document.title) {
    lines.push(document.title, "");
  }

  for (const block of document.blocks) {
    if (block.kind === "meta") {
      continue;
    }

    if (block.kind === "headline") {
      const { section } = block;
      lines.push(section.title || "At a Glance");
      if (section.summary) lines.push(section.summary, "");
      if (section.metrics?.length) {
        for (const metric of section.metrics) {
          const row = [metric.label, metric.value, metric.change, metric.sublabel]
            .filter(Boolean)
            .join(" | ");
          lines.push(row);
        }
        lines.push("");
      }
      continue;
    }

    if (block.kind === "section") {
      lines.push(block.section.title);
      if (block.section.narrative) lines.push(block.section.narrative);
      if (block.section.summary) lines.push(block.section.summary);
      if (block.section.text) lines.push(block.section.text);
      if (block.section.insight) lines.push(`Insight: ${block.section.insight}`);
      if (block.section.table) {
        if (block.section.table.headers.length) {
          lines.push(block.section.table.headers.join(" | "));
        }
        for (const row of block.section.table.rows) {
          lines.push(row.join(" | "));
        }
      }
      lines.push("");
      continue;
    }

    if (block.kind === "section_list") {
      for (const section of block.sections) {
        lines.push(section.title);
        if (section.narrative) lines.push(section.narrative);
        if (section.summary) lines.push(section.summary);
        if (section.text) lines.push(section.text);
        if (section.insight) lines.push(`Insight: ${section.insight}`);
        if (section.table) {
          if (section.table.headers.length) {
            lines.push(section.table.headers.join(" | "));
          }
          for (const row of section.table.rows) {
            lines.push(row.join(" | "));
          }
        }
        lines.push("");
      }
      continue;
    }

    lines.push(`${titleFromKey(block.key)}: ${toDisplayString(block.value)}`);
  }

  return lines.join("\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderNarrativeHtml(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function renderTableHtml(table: PerformanceReportTable): string {
  const head = table.headers.length
    ? `<thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`
    : "";

  const body = `<tbody>${table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<div class=\"pr-v2-table-wrap\"><table class=\"pr-v2-table\">${head}${body}</table></div>`;
}

function renderMetricsHtml(metrics: PerformanceReportMetric[]): string {
  const rows = metrics
    .map((metric) => {
      const directionClass =
        metric.direction === "up"
          ? "is-up"
          : metric.direction === "down"
            ? "is-down"
            : "is-neutral";

      return `
      <tr>
        <td class=\"metric-label\">${escapeHtml(metric.label)}</td>
        <td class=\"metric-value-cell\">
          <div class=\"metric-value\">${escapeHtml(metric.value || "-")}</div>
          ${metric.change ? `<span class=\"metric-change ${directionClass}\">${escapeHtml(metric.change)}</span>` : ""}
        </td>
        <td class=\"metric-compare\">${escapeHtml(metric.sublabel || "vs previous period")}</td>
      </tr>
    `;
    })
    .join("");

  return `<div class=\"pr-v2-table-wrap\"><table class=\"pr-v2-metrics\"><tbody>${rows}</tbody></table></div>`;
}

function renderSectionHtml(section: PerformanceReportSection): string {
  const parts: string[] = [`<section class=\"pr-v2-section\">`, `<h2>${escapeHtml(section.title)}</h2>`];

  const narrative = section.narrative || section.summary || section.text;
  if (narrative) {
    parts.push(`<div class=\"pr-v2-card\">${renderNarrativeHtml(narrative)}</div>`);
  }

  if (section.insight) {
    parts.push(`<p class=\"pr-v2-insight\"><strong>Insight:</strong> ${escapeHtml(section.insight)}</p>`);
  }

  if (section.metrics?.length) {
    parts.push(renderMetricsHtml(section.metrics));
  }

  if (section.table) {
    parts.push(renderTableHtml(section.table));
  }

  parts.push(`</section>`);
  return parts.join("");
}

export function buildPerformanceReportV2BodyHtml(document: PerformanceReportV2Document): string {
  const html: string[] = [
    `<div class=\"pr-v2-root\">`,
    `<h1 class=\"pr-v2-title\">${escapeHtml(document.title || "Performance Report")}</h1>`,
  ];

  for (const block of document.blocks) {
    if (block.kind === "meta") continue;

    if (block.kind === "headline") {
      const section = {
        ...block.section,
        title: block.section.title || "At a Glance",
      };
      html.push(renderSectionHtml(section));
      continue;
    }

    if (block.kind === "section") {
      html.push(renderSectionHtml(block.section));
      continue;
    }

    if (block.kind === "section_list") {
      for (const section of block.sections) {
        html.push(renderSectionHtml(section));
      }
      continue;
    }

    html.push(
      `<section class=\"pr-v2-section\"><h2>${escapeHtml(titleFromKey(block.key))}</h2><div class=\"pr-v2-card\"><pre>${escapeHtml(
        toDisplayString(block.value)
      )}</pre></div></section>`
    );
  }

  html.push(`</div>`);
  return html.join("");
}

export const PERFORMANCE_REPORT_V2_CSS = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 8px;
    background: #FFFFFF;
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .pr-v2-root {
    width: 100%;
    color: #0A0A0A;
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1.4;
  }

  .pr-v2-title {
    font-family: "Geist Mono", "SFMono-Regular", Menlo, monospace;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.4;
    color: #737373;
    margin: 0 0 12px 0;
  }

  .pr-v2-section {
    margin: 0 0 14px 0;
  }

  .pr-v2-section + .pr-v2-section {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #F1F1F1;
  }

  .pr-v2-section h2 {
    margin: 0 0 6px 0;
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: -0.2px;
    font-weight: 600;
    color: #0A0A0A;
  }

  .pr-v2-card {
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 8px;
    background: #FFFFFF;
  }

  .pr-v2-card p {
    margin: 0 0 8px 0;
    color: rgba(0, 0, 0, 0.87);
    font-size: 12px;
    line-height: 1.4;
  }

  .pr-v2-card p:last-child {
    margin-bottom: 0;
  }

  .pr-v2-card pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    font-family: "Geist Mono", "SFMono-Regular", Menlo, monospace;
    color: #0A0A0A;
  }

  .pr-v2-insight {
    margin: 6px 0 0 0;
    color: #404040;
    font-size: 11px;
    line-height: 1.35;
  }

  .pr-v2-table-wrap {
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid #E5E5E5;
    overflow: hidden;
  }

  .pr-v2-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  .pr-v2-metrics {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .pr-v2-table thead tr,
  .pr-v2-table tbody tr,
  .pr-v2-metrics tbody tr {
    border-bottom: 1px solid #E5E5E5;
  }

  .pr-v2-table tbody tr:last-child,
  .pr-v2-metrics tbody tr:last-child {
    border-bottom: none;
  }

  .pr-v2-table th,
  .pr-v2-table td,
  .pr-v2-metrics td {
    padding: 5px 7px;
    font-size: 11px;
    line-height: 1.35;
    color: #0A0A0A;
    vertical-align: top;
    text-align: left;
    word-break: break-word;
  }

  .pr-v2-table th {
    font-weight: 500;
    background: #FAFAFA;
  }

  .pr-v2-metrics td.metric-label {
    width: 52%;
    color: #0A0A0A;
  }

  .pr-v2-metrics td.metric-value-cell {
    width: 18%;
  }

  .pr-v2-metrics td.metric-compare {
    width: 30%;
    color: #737373;
    font-family: "Geist Mono", "SFMono-Regular", Menlo, monospace;
    font-size: 10px;
    white-space: nowrap;
  }

  .metric-value {
    display: inline-block;
    font-size: 14px;
    font-weight: 500;
    color: #0A0A0A;
    margin-right: 4px;
    line-height: 1.2;
  }

  .metric-change {
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
  }

  .metric-change.is-up {
    color: #16A34A;
  }

  .metric-change.is-down {
    color: #DC2626;
  }

  .metric-change.is-neutral {
    color: #737373;
  }
`;
