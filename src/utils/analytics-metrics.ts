export const CHART_LINE_KEYS = ["impressions", "clicks", "sessions", "goals"] as const;

export type AnalyticsMetricKey = (typeof CHART_LINE_KEYS)[number];

/**
 * Stroke colors for the organic performance chart. The toolbar legend reads
 * from the same map so the swatch a user toggles always matches the plotted
 * line.
 */
export const CHART_SERIES_COLORS: Record<AnalyticsMetricKey, string> = {
  impressions: "#6b7280",
  clicks: "#2563eb",
  sessions: "#ea580c",
  goals: "#059669",
};

export const ANALYTICS_METRIC_LABELS: Record<AnalyticsMetricKey, string> = {
  impressions: "Impressions",
  clicks: "Clicks",
  sessions: "Sessions",
  goals: "Goals",
};

/** Search Console has no data on the All tab, so only GA4 metrics are plotted. */
export const ALL_TAB_METRIC_KEYS: readonly AnalyticsMetricKey[] = ["sessions", "goals"];

/** Shared rendering settings taken from the All / Organic overview chart. */
export const ANALYTICS_CHART_STYLE = {
  margin: { top: 12, right: 8, left: 8, bottom: 0 },
  containerClassName: "h-full w-full flex-col justify-end items-stretch aspect-auto",
  tick: { fontSize: 12, fill: "#9ca3af" },
  tickMargin: 8,
  gridStroke: "#e5e7eb",
  gridDasharray: "3 3",
  strokeWidth: 1,
} as const;
