import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownUp,
  BarChart3,
  Eye,
  Loader2,
  MousePointerClick,
  Percent,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_SERIES_COLORS } from "@/utils/analytics-metrics";
import type {
  MonitoringAttention,
  MonitoringContextEvidence,
  MonitoringEligibility,
  MonitoringGoal,
  MonitoringLifecycle,
  MonitoringNotificationKind,
  MonitoringSeverity,
} from "@/hooks/use-monitoring";

/**
 * Shared vocabulary for the monitoring sheet: how each engine state is named and coloured,
 * how a UTC date is rendered, and how a metric key becomes something a human can read.
 */

// ─── Attention ──────────────────────────────────────────────────────────────

export const ATTENTION_LABEL: Record<MonitoringAttention, string> = {
  HEALTHY: "Healthy",
  IMPROVING: "Improving",
  WATCH: "Watch",
  INVESTIGATE: "Investigate",
  NO_SIGNAL: "No signal",
  PAUSED: "Paused",
};

export const ATTENTION_ACCENT: Record<MonitoringAttention, string> = {
  HEALTHY: "#639922",
  IMPROVING: "#2E6A56",
  WATCH: "#EF9F27",
  INVESTIGATE: "#E24B4A",
  NO_SIGNAL: "#B4B2A9",
  PAUSED: "#8E8BA3",
};

const ATTENTION_PILL_CLASS: Record<MonitoringAttention, string> = {
  HEALTHY: "bg-[#EEF6E4] text-[#4C7A18]",
  IMPROVING: "bg-[#E6F2EC] text-[#2E6A56]",
  WATCH: "bg-[#FFF3E2] text-[#B9741A]",
  INVESTIGATE: "bg-[#FDECEC] text-[#C03937]",
  NO_SIGNAL: "bg-[#F2F1EE] text-[#7E7B73]",
  PAUSED: "bg-[#F1F0F5] text-[#6B6880]",
};

/** What each state is actually claiming, for the one-line explanation under the pill. */
export const ATTENTION_MEANING: Record<MonitoringAttention, string> = {
  HEALTHY: "Performing in line with what the engine expects",
  IMPROVING: "Running above expectation",
  WATCH: "Something moved, not yet confirmed",
  INVESTIGATE: "A confirmed change worth acting on",
  NO_SIGNAL: "Too little data to judge",
  PAUSED: "Monitoring is paused, days are excluded",
};

/**
 * A business with no state row has never been evaluated, which the engine deliberately does
 * not write as `NO_SIGNAL`. Rendering it as healthy would be a lie, so it gets its own pill.
 */
export function AttentionPill({
  attention,
  streakLength,
  className,
}: {
  attention: MonitoringAttention | null;
  streakLength?: number | null;
  className?: string;
}) {
  if (!attention) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F2F1EE] px-2.5 py-1 text-[11px] font-medium leading-none text-[#7E7B73]",
          className,
        )}
      >
        <span className="h-2 w-2 shrink-0 rounded-full border border-[#B4B2A9]" />
        Not evaluated
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        ATTENTION_PILL_CLASS[attention],
        className,
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: ATTENTION_ACCENT[attention] ?? "#B4B2A9" }}
      />
      {ATTENTION_LABEL[attention] ?? attention}
      {streakLength ? ` · ${streakLength}d` : null}
    </span>
  );
}

// ─── Severity and lifecycle ─────────────────────────────────────────────────

const SEVERITY_ACCENT: Record<MonitoringSeverity, string> = {
  INFO: "#B4B2A9",
  MEDIUM: "#EF9F27",
  HIGH: "#E2733F",
  CRITICAL: "#E24B4A",
};

export const SEVERITY_LABEL: Record<MonitoringSeverity, string> = {
  INFO: "Info",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export function SeverityDot({
  severity,
  className,
}: {
  severity: MonitoringSeverity | null;
  className?: string;
}) {
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: SEVERITY_ACCENT[severity ?? "INFO"] }}
      title={severity ? `${SEVERITY_LABEL[severity]} severity` : undefined}
    />
  );
}

export const LIFECYCLE_LABEL: Record<MonitoringLifecycle, string> = {
  EMERGING: "Emerging",
  WATCHING: "Watching",
  CONFIRMED: "Confirmed",
  RECOVERING: "Recovering",
  RESOLVED: "Resolved",
  EXPIRED: "Expired",
};

export function LifecyclePill({
  lifecycle,
  className,
}: {
  lifecycle: MonitoringLifecycle | null;
  className?: string;
}) {
  if (!lifecycle) return null;

  const closed = lifecycle === "RESOLVED" || lifecycle === "EXPIRED";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-none",
        closed
          ? "bg-muted text-muted-foreground"
          : "bg-[#F2F1EE] text-general-unofficial-foreground-alt",
        className,
      )}
    >
      {LIFECYCLE_LABEL[lifecycle] ?? lifecycle}
    </span>
  );
}

export const NOTIFICATION_KIND_LABEL: Record<
  MonitoringNotificationKind,
  string
> = {
  INVESTIGATE: "Investigate",
  IMPROVING: "Improving",
  WORSENING: "Worsening",
  RESOLVED: "Resolved",
  NEW_NORMAL: "New normal",
  DATA_ISSUE: "Data issue",
  DIGEST: "Digest",
};

// ─── Eligibility ────────────────────────────────────────────────────────────

/**
 * Why a day did or did not shape the expected range, said plainly.
 *
 * Every one of these is still charted and still judged; the distinction is only whether the
 * day taught the engine what normal looks like. The labels avoid the engine's own vocabulary
 * because this string is read by agency staff, not by whoever wrote the state machine.
 */
export const ELIGIBILITY_LABEL: Record<MonitoringEligibility, string> = {
  ELIGIBLE: "Used to learn what is normal here",
  PROVISIONAL: "Still settling, not final yet",
  MISSING: "No data for this day",
  PRE_BREAK: "Before the baseline was reset",
  MANUAL_EXCLUDED: "Marked closed or paused",
  DATA_QUALITY_EXCLUDED: "Held back, the data looked unreliable",
  TEMP_SHOCK_EXCLUDED: "One-off spike, held back",
  INCIDENT_EXCLUDED: "Part of an open alert",
};

// ─── Dates ──────────────────────────────────────────────────────────────────

/**
 * Renders an engine date as the calendar day it is.
 *
 * The engine keys every row on a UTC date; a business timezone only decides when its run
 * fires. Parsing `YYYY-MM-DD` through the local timezone would put the whole sheet a day out
 * for anyone west of UTC, so the parts are read directly.
 */
export function formatMonitoringDate(
  value: string | null | undefined,
  options: { withYear?: boolean } = {},
): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(options.withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Timestamps are real instants, unlike the date columns, so these render in local time. */
export function formatMonitoringTimestamp(
  value: string | null | undefined,
): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const then = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.round((today - then) / 86_400_000);
}

// ─── Metric names ───────────────────────────────────────────────────────────

const SOURCE_METRIC_LABEL: Record<string, string> = {
  sessions: "Sessions",
  organic_impressions: "Organic impressions",
  organic_clicks: "Organic clicks",
  organic_ctr: "Organic CTR",
  organic_position: "Organic position",
};

/**
 * Colour and provenance per metric family.
 *
 * The colours are the ones the Organic Performance charts already use for these same series,
 * so sessions are orange and clicks are blue here too rather than every monitoring chart
 * being drawn in one house colour.
 */
export interface MetricVisual {
  color: string;
  kind: string;
  icon: React.ReactNode;
}

/**
 * Colours come from `CHART_SERIES_COLORS`, the same map the Organic Performance chart and its
 * legend read, so a series is the same colour wherever it is plotted. The icons match that
 * chart's legend for the metrics it also carries.
 */
const METRIC_VISUAL: Record<string, MetricVisual> = {
  sessions: {
    color: CHART_SERIES_COLORS.sessions,
    kind: "Google Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  organic_clicks: {
    color: CHART_SERIES_COLORS.clicks,
    kind: "Search Console",
    icon: <MousePointerClick className="h-4 w-4 rotate-90" />,
  },
  organic_impressions: {
    color: CHART_SERIES_COLORS.impressions,
    kind: "Search Console",
    icon: <Eye className="h-4 w-4" />,
  },
  organic_ctr: {
    color: CHART_SERIES_COLORS.impressions,
    kind: "Search Console",
    icon: <Percent className="h-4 w-4" />,
  },
  organic_position: {
    color: CHART_SERIES_COLORS.impressions,
    kind: "Search Console",
    icon: <ArrowDownUp className="h-4 w-4" />,
  },
};

export const GOAL_VISUAL: MetricVisual = {
  color: CHART_SERIES_COLORS.goals,
  kind: "Google Analytics",
  icon: <Target className="h-4 w-4" />,
};

export function metricVisual(metricKey: string): MetricVisual {
  if (metricKey.startsWith("goal:")) return GOAL_VISUAL;

  return (
    METRIC_VISUAL[metricKey] ?? {
      color: CHART_SERIES_COLORS.impressions,
      kind: "Monitored metric",
      icon: <Activity className="h-4 w-4" />,
    }
  );
}

export function isGoalMetric(metricKey: string): boolean {
  return metricKey.startsWith("goal:");
}

/**
 * Turns a metric key into a label.
 *
 * Goals are keyed `goal:<goalId>` rather than by event name, because the event a goal points
 * at can be repointed. That makes the key an opaque id, so the business's goal list is the
 * only thing that can name it.
 */
export function metricLabel(
  metricKey: string,
  goals: MonitoringGoal[] = [],
): string {
  if (SOURCE_METRIC_LABEL[metricKey]) return SOURCE_METRIC_LABEL[metricKey];

  if (metricKey.startsWith("goal:")) {
    const goalId = metricKey.slice("goal:".length);
    const goal = goals.find((candidate) => candidate.goalId === goalId);
    if (goal) return goal.name || goal.ga4KeyEventName;

    // A metric can outlive its goal: the engine keeps evaluating a series whose goal has since
    // been disabled. Without the id fragment every one of those rows would read just "Goal".
    return `Goal · ${goalId.slice(0, 8)}`;
  }

  return metricKey.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// ─── Context evidence ───────────────────────────────────────────────────────

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  HOLIDAY: "Holiday",
  SEASONAL_PERIOD: "Stated season",
  WEATHER: "Weather",
  DISASTER: "Disaster",
  EVENT: "Local event",
  CAMPAIGN: "Campaign",
};

/**
 * One readable line per evidence item.
 *
 * The array is deliberately heterogeneous — a cohort statement, a holiday, a storm and a
 * campaign all arrive in it — so each known shape is named rather than stringified.
 */
export function evidenceLabel(item: MonitoringContextEvidence): string {
  if (item.classification) {
    const scope = [item.location, item.category_plural]
      .filter(Boolean)
      .join(" ");
    const size =
      typeof item.member_count === "number"
        ? `${item.member_count} compared`
        : null;
    return [item.classification.replace(/_/g, " "), scope, size]
      .filter(Boolean)
      .join(" · ");
  }

  const kind = item.type ? EVIDENCE_TYPE_LABEL[item.type] ?? item.type : null;
  const period =
    item.start && item.end
      ? `${formatMonitoringDate(item.start)} – ${formatMonitoringDate(item.end)}`
      : item.date
        ? formatMonitoringDate(item.date)
        : null;

  const parts = [kind, item.name, period].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Context";
}

// ─── Numbers ────────────────────────────────────────────────────────────────

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (absolute >= 100) return String(Math.round(value));
  return String(Number(value.toFixed(absolute >= 1 ? 1 : 2)));
}

/** Engine deviations are ratios, so `-0.24` reads as `-24%`. */
export function formatSignedPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  const rounded = Math.round(value * 100);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

// ─── Layout primitives ──────────────────────────────────────────────────────

/**
 * How far from normal a reading is, in words.
 *
 * The engine measures this in standard deviations, and the sheet used to print the number
 * with a sigma. That is exact and unreadable: the people using this are agency staff, not
 * statisticians, and "2.90σ" tells them nothing they can act on. The bands below are the
 * engine's own trigger thresholds, so the wording changes where its judgement changes.
 */
export function unusualness(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;

  const magnitude = Math.abs(value);
  if (magnitude >= 3) return "Far outside normal";
  if (magnitude >= 2) return "Outside normal";
  return "Within normal variation";
}

/**
 * A reading against what was expected of it.
 *
 * Laid out the way the home health signals already present a comparison — value, then the
 * change coloured green or red, then what it is measured against — so the same numbers read
 * the same way wherever they appear.
 */
export function MetricChange({
  actual,
  expected,
  changePct,
  className,
}: {
  actual: number | null | undefined;
  expected: number | null | undefined;
  changePct: number | null | undefined;
  className?: string;
}) {
  const changeColor =
    changePct == null || !Number.isFinite(changePct)
      ? "text-muted-foreground"
      : changePct >= 0
        ? "text-green-600"
        : "text-red-600";

  return (
    <span className={cn("flex items-baseline gap-1.5 tabular-nums", className)}>
      <span className="font-medium text-general-foreground">
        {formatCount(actual)}
      </span>
      <span className={cn("text-[11px] font-medium", changeColor)}>
        {formatSignedPct(changePct)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        vs {formatCount(expected)} expected
      </span>
    </span>
  );
}

/**
 * Section heading. Rows sit under it separated by dividers rather than inside a card, so a
 * long sheet reads as one continuous list instead of a stack of boxes.
 */
export function SectionLabel({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-6 pb-2 pt-5",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase leading-[1.5] tracking-[0.15px] text-muted-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}

export function MonitoringRow({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const shared =
    "w-full border-b border-general-border px-6 py-3 text-left last:border-b-0";

  if (!onClick) {
    return <div className={cn(shared, className)}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(shared, "transition-colors hover:bg-muted/60", className)}
    >
      {children}
    </button>
  );
}

/** Label on the left, value on the right. The workhorse of the detail views. */
export function FactRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-general-border py-2 last:border-b-0",
        className,
      )}
    >
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm text-general-foreground">
        {value}
      </span>
    </div>
  );
}

export function MonitoringLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center">
      <div className="space-y-2 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function MonitoringEmpty({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-general-foreground">{title}</p>
      {description ? (
        <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function MonitoringError({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-general-foreground">
          Unable to load monitoring
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {message || "Something went wrong. Try again in a moment."}
        </p>
      </div>
    </div>
  );
}
