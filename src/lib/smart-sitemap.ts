import { addDays, format, parseISO } from "date-fns";
import { getBucketColor } from "@/lib/gsc-index-bucket";
import { CHART_SERIES_COLORS } from "@/utils/analytics-metrics";
import type {
  FirstSeenSource,
  Ga4Metrics,
  GscMetrics,
  PageCheck,
  PageCheckFilter,
  SeriesPoint,
  SmartSitemapSort,
  SmartSitemapStatus,
  SortOrder,
} from "@/hooks/use-smart-sitemap";

export const EMPTY_VALUE = "–";

export const STATUS_LABELS: Record<SmartSitemapStatus, string> = {
  indexed: "Indexed",
  crawled_not_indexed: "Crawled, not indexed",
  discovered_not_indexed: "Discovered, not indexed",
  excluded: "Excluded",
  error: "Crawl error",
  other: "Other",
  unknown: "Unknown",
  pending: "Pending check",
  mixed: "Mixed",
};

/** Table-cell labels; the dot color and the hover keep the full status. */
const STATUS_SHORT_LABELS: Partial<Record<SmartSitemapStatus, string>> = {
  crawled_not_indexed: "Not indexed",
  discovered_not_indexed: "Not indexed",
  pending: "Pending",
};

export function statusShortLabel(status: string | null | undefined): string {
  return STATUS_SHORT_LABELS[status as SmartSitemapStatus] ?? statusLabel(status);
}

/** Order of the overview status bar: healthy first, then problems, then missing knowledge. */
export const STATUS_ORDER: SmartSitemapStatus[] = [
  "indexed",
  "crawled_not_indexed",
  "discovered_not_indexed",
  "mixed",
  "error",
  "excluded",
  "other",
  "unknown",
  "pending",
];

export function statusColor(status: string | null | undefined): string {
  if (status === "pending") return "var(--general-border-three)";
  if (status === "mixed") return "#f59e0b";
  return getBucketColor(status);
}

/** Where discovery found a page. `short` fits table cells; `label` is used where space allows. */
const DISCOVERY_SOURCES: Record<
  string,
  { short: string; label: string; hint: string }
> = {
  sitemap: {
    short: "Sitemap",
    label: "Sitemap",
    hint: "listed in the site's XML sitemap",
  },
  gsc: {
    short: "GSC",
    label: "Search Console",
    hint: "seen in Google Search Console data",
  },
  ga4: {
    short: "GA4",
    label: "Google Analytics",
    hint: "seen in Google Analytics (GA4) data",
  },
};
const DISCOVERY_SOURCE_ORDER = Object.keys(DISCOVERY_SOURCES);

export interface DiscoverySource {
  id: string;
  short: string;
  label: string;
  hint: string;
}

/** Known sources in a fixed order, then any unrecognized values as stored. */
export function discoverySources(
  sources: readonly string[] | null | undefined,
): DiscoverySource[] {
  const unique = Array.from(new Set(sources ?? []));
  const rank = (id: string) => {
    const index = DISCOVERY_SOURCE_ORDER.indexOf(id);
    return index === -1 ? DISCOVERY_SOURCE_ORDER.length : index;
  };
  return unique
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((id) => ({
      id,
      ...(DISCOVERY_SOURCES[id] ?? {
        short: id,
        label: id,
        hint: "found during site discovery",
      }),
    }));
}

/** Where a page's first-seen date comes from, for the detail header. */
export function firstSeenSource(
  source: FirstSeenSource,
  pageSources: readonly string[],
): { label: string; hint: string } {
  if (source === "gsc")
    return {
      label: "in Search Console",
      hint: "First day this page appears in the Search Console data Massic has stored. Pages older than that data show its start date.",
    };
  if (source === "ga4")
    return {
      label: "in Google Analytics",
      hint: "Search Console has no data for this page, so this is the first day it appears in the Google Analytics data Massic has stored.",
    };
  return {
    label: pageSources.includes("sitemap") ? "in sitemap" : "by Massic",
    hint: "Search Console and Google Analytics have no data for this page, so this is the day Massic first found it.",
  };
}

export function statusLabel(status: string | null | undefined): string {
  return status && status in STATUS_LABELS
    ? STATUS_LABELS[status as SmartSitemapStatus]
    : "Unknown";
}

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const integerFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return EMPTY_VALUE;
  return value >= 10000
    ? compactFormatter.format(value)
    : integerFormatter.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : integerFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : `${(value * 100).toFixed(1)}%`;
}

export function formatPosition(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : value.toFixed(1);
}

export function formatCurrency(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : currencyFormatter.format(value);
}

export function formatDay(
  value: string | null | undefined,
  pattern = "MMM d, yyyy",
): string {
  if (!value) return EMPTY_VALUE;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? EMPTY_VALUE : format(parsed, pattern);
}

export type MetricFormat = "count" | "percent" | "position" | "currency";

export function formatMetric(
  kind: MetricFormat,
  value: number | null | undefined,
): string {
  if (kind === "percent") return formatPercent(value);
  if (kind === "position") return formatPosition(value);
  if (kind === "currency") return formatCurrency(value);
  return formatCompact(value);
}

/** Props for the dashboard's `StatsBadge`: the sign drives green or red. */
export interface MetricChangeBadge {
  value: number;
  unit: "%" | "pp";
  label?: string;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Counts compare by percent and rates by percentage points. Position compares by
 * places with lower being better, so an improvement is positive. Undefined means
 * there is no comparable previous value.
 */
export function metricChangeBadge(
  kind: MetricFormat,
  current: number | null | undefined,
  previous: number | null | undefined,
): MetricChangeBadge | undefined {
  if (current == null || previous == null) return undefined;
  if (kind === "position") {
    const improvement = roundOne(previous - current);
    if (improvement === 0) return { value: 0, unit: "%", label: "0.0" };
    return {
      value: improvement,
      unit: "%",
      label: `${improvement > 0 ? "↑" : "↓"}${Math.abs(improvement).toFixed(1)}`,
    };
  }
  if (kind === "percent")
    return { value: roundOne((current - previous) * 100), unit: "pp" };
  if (previous === 0) return undefined;
  return {
    value: roundOne(((current - previous) / previous) * 100),
    unit: "%",
  };
}

export type ChartMetricKey = Exclude<keyof SeriesPoint, "date">;
export type DetailMetricKey =
  ChartMetricKey | "engagedSessions" | "engagementRate" | "revenue";

export interface DetailMetric {
  key: DetailMetricKey;
  label: string;
  source: "gsc" | "ga4";
  format: MetricFormat;
  /** Present when the daily series carries this metric. */
  color?: string;
}

export const DETAIL_METRICS: Record<DetailMetricKey, DetailMetric> = {
  clicks: {
    key: "clicks",
    label: "Clicks",
    source: "gsc",
    format: "count",
    color: CHART_SERIES_COLORS.clicks,
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    source: "gsc",
    format: "count",
    color: CHART_SERIES_COLORS.impressions,
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    source: "gsc",
    format: "percent",
    color: CHART_SERIES_COLORS.clicks,
  },
  position: {
    key: "position",
    label: "Avg. position",
    source: "gsc",
    format: "position",
    color: CHART_SERIES_COLORS.impressions,
  },
  sessions: {
    key: "sessions",
    label: "Sessions",
    source: "ga4",
    format: "count",
    color: CHART_SERIES_COLORS.sessions,
  },
  keyEvents: {
    key: "keyEvents",
    label: "Key events",
    source: "ga4",
    format: "count",
    color: CHART_SERIES_COLORS.goals,
  },
  engagedSessions: {
    key: "engagedSessions",
    label: "Engaged sessions",
    source: "ga4",
    format: "count",
  },
  engagementRate: {
    key: "engagementRate",
    label: "Engagement rate",
    source: "ga4",
    format: "percent",
  },
  revenue: {
    key: "revenue",
    label: "Revenue",
    source: "ga4",
    format: "currency",
  },
};

/** Lines on the trend chart, in the dashboard's legend order. */
export const CHART_LINE_KEYS = [
  "impressions",
  "clicks",
  "sessions",
  "keyEvents",
] as const;
export type ChartLineKey = (typeof CHART_LINE_KEYS)[number];

export function metricValue(
  key: DetailMetricKey,
  gsc: GscMetrics | null | undefined,
  ga4: Ga4Metrics | null | undefined,
): number | null {
  switch (key) {
    case "clicks":
    case "impressions":
    case "ctr":
    case "position":
      return gsc ? gsc[key] : null;
    case "sessions":
    case "keyEvents":
    case "engagedSessions":
    case "engagementRate":
    case "revenue":
      return ga4 ? ga4[key] : null;
  }
}

/**
 * One point per day of the range. Sources omit days without activity, so counts
 * become zero up to each source's last observed day; rates stay null (no denominator).
 */
export function fillDailySeries(
  series: SeriesPoint[],
  range: { from: string; to: string },
  dataThrough: { gsc: string | null; ga4: string | null },
): SeriesPoint[] {
  const byDate = new Map(series.map((point) => [point.date, point]));
  const days: SeriesPoint[] = [];
  const end = parseISO(range.to);
  for (let day = parseISO(range.from); day <= end; day = addDays(day, 1)) {
    const date = format(day, "yyyy-MM-dd");
    const point = byDate.get(date);
    const gscSeen = dataThrough.gsc != null && date <= dataThrough.gsc;
    const ga4Seen = dataThrough.ga4 != null && date <= dataThrough.ga4;
    days.push({
      date,
      clicks: point?.clicks ?? (gscSeen ? 0 : null),
      impressions: point?.impressions ?? (gscSeen ? 0 : null),
      ctr: point?.ctr ?? null,
      position: point?.position ?? null,
      sessions: point?.sessions ?? (ga4Seen ? 0 : null),
      keyEvents: point?.keyEvents ?? (ga4Seen ? 0 : null),
    });
  }
  return days;
}

/** First click on a column: best position, A–Z path and problems-first status ascend; counts descend. */
export function defaultSortOrder(sort: SmartSitemapSort): SortOrder {
  return sort === "path" ||
    sort === "indexing.status" ||
    sort === "gsc.position"
    ? "asc"
    : "desc";
}

/** Readable form of a stored path; malformed percent-encoding is shown as stored. */
export function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function siteHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    return new URL(
      website.includes("://") ? website : `https://${website}`,
    ).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Tag text, at most 13 characters so the Page status column stays narrow. */
const HTTP_STATUS_TEXT: Record<number, string> = {
  200: "OK",
  301: "Moved",
  302: "Found",
  307: "Redirect",
  308: "Redirect",
  401: "Login",
  403: "Forbidden",
  404: "Not found",
  410: "Gone",
  429: "Limited",
};

/** Full wording for the hover where the tag text is shortened. */
const HTTP_STATUS_DETAIL: Record<number, string> = {
  401: "Unauthorized",
  429: "Too many requests",
  500: "Server error",
  502: "Bad gateway",
  503: "Service unavailable",
  504: "Gateway timeout",
};

export const PAGE_CHECK_FILTER_LABELS: Record<
  PageCheckFilter,
  { label: string; hint: string }
> = {
  ok: { label: "OK", hint: "Loads with a 2xx response" },
  redirected: { label: "Redirects", hint: "Sends visitors to another page" },
  broken: { label: "Broken", hint: "4xx such as 404 or 410, or a redirect to one" },
  server_error: { label: "Server error", hint: "5xx response" },
  unreachable: { label: "Unreachable", hint: "Timed out, failed to connect, or can't be checked" },
  file: { label: "File", hint: "PDF, image or other non-HTML file" },
  unchecked: { label: "Not checked yet", hint: "Waiting for the first check" },
};

/**
 * Tag label and dot color for the latest live check; colors reuse the indexing palette.
 * `detail` is the full wording for the hover when the tag is shortened.
 */
export function pageCheckStatus(check: PageCheck): {
  label: string;
  detail?: string;
  color: string;
} {
  const code = check.statusCode;
  const coded = (fallback: string) => {
    if (!code) return { label: fallback };
    const detail = HTTP_STATUS_DETAIL[code];
    return {
      label: `${code} ${HTTP_STATUS_TEXT[code] ?? "Error"}`,
      detail: detail ? `${code} ${detail}` : HTTP_STATUS_TEXT[code] ? undefined : `${code} ${fallback}`,
    };
  };
  switch (check.outcome) {
    case "ok":
      return { ...coded("OK"), color: statusColor("indexed") };
    case "redirected":
      return { ...coded("Redirect"), color: statusColor("mixed") };
    case "client_error":
      // A 3xx here means the redirect ends on a broken page.
      return code && code < 400
        ? { label: "Bad redirect", detail: "Redirect ends on a broken page", color: statusColor("error") }
        : { ...coded("Client error"), color: statusColor("error") };
    case "server_error":
      return { ...coded("Server error"), color: statusColor("error") };
    case "timeout":
      return { label: "Timed out", color: statusColor("error") };
    case "unreachable":
      return { label: "Unreachable", color: statusColor("error") };
    case "non_html":
      return { label: code ? `${code} File` : "File", detail: "A file, not a web page", color: statusColor("excluded") };
    case "blocked_target":
      return { label: "Not checkable", detail: "This address can't be checked", color: statusColor("excluded") };
    default:
      return { label: "Unknown", color: statusColor("other") };
  }
}

/** Where the page ended up when that differs from the page itself, ignoring a trailing slash. */
export function pageCheckDestination(
  check: PageCheck,
  path: string,
): string | null {
  if (!check.finalUrl) return null;
  if (check.outcome === "redirected") return check.finalUrl;
  try {
    const final = new URL(check.finalUrl);
    const trim = (value: string) => value.replace(/\/+$/, "") || "/";
    return trim(final.pathname) === trim(path) && !final.search
      ? null
      : check.finalUrl;
  } catch {
    return null;
  }
}

export function pageUrl(
  website: string | null | undefined,
  path: string,
): string | null {
  if (!website) return null;
  try {
    return new URL(
      path,
      website.includes("://") ? website : `https://${website}`,
    ).toString();
  } catch {
    return null;
  }
}
