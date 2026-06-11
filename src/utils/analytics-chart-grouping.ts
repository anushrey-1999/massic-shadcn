import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type AnalyticsGroupBy = "day" | "week" | "month";

export interface AnalyticsChartPointLike {
  date: string;
  dateKey?: string;
  impressions: number;
  clicks: number;
  sessions?: number;
  goals?: number;
}

export interface AnalyticsChartRange {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface GroupedAnalyticsChartPoint extends AnalyticsChartPointLike {
  bucketKey: string;
  bucketStart: string;
  bucketEnd: string;
  rangeLabel: string;
  rangeContextLabel: string;
  grouping: AnalyticsGroupBy;
}

const GROUPING_ORDER: AnalyticsGroupBy[] = ["day", "week", "month"];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function formatCompactDate(date: Date): string {
  return format(date, "MMM d");
}

function formatExtendedDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

function formatRangeLabel(start: Date, end: Date): string {
  const sameYear = format(start, "yyyy") === format(end, "yyyy");
  const sameMonth = format(start, "yyyy-MM") === format(end, "yyyy-MM");

  if (sameMonth) {
    return `${format(start, "MMM d")} - ${format(end, "d")}`;
  }

  if (sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  }

  return `${formatExtendedDate(start)} - ${formatExtendedDate(end)}`;
}

function buildBucket(date: Date, grouping: AnalyticsGroupBy, intervalStart: Date, intervalEnd: Date) {
  if (grouping === "day") {
    return {
      key: format(date, "yyyy-MM-dd"),
      start: date,
      end: date,
    };
  }

  const rawStart =
    grouping === "week"
      ? startOfWeek(date, { weekStartsOn: 1 })
      : startOfMonth(date);
  const rawEnd =
    grouping === "week"
      ? endOfWeek(date, { weekStartsOn: 1 })
      : endOfMonth(date);

  return {
    key: format(rawStart, grouping === "week" ? "RRRR-'W'II" : "yyyy-MM"),
    start: maxDate([rawStart, intervalStart]),
    end: minDate([rawEnd, intervalEnd]),
  };
}

function buildRangeContextLabel(grouping: AnalyticsGroupBy, start: Date, end: Date): string {
  if (grouping === "day") {
    return format(start, "EEEE · yyyy");
  }

  if (grouping === "week") {
    const yearLabel =
      format(start, "yyyy") === format(end, "yyyy")
        ? format(start, "yyyy")
        : `${format(start, "yyyy")} - ${format(end, "yyyy")}`;
    return `${format(start, "EEE")} - ${format(end, "EEE")} · ${yearLabel}`;
  }

  return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
}

function buildDisplayLabel(grouping: AnalyticsGroupBy, start: Date): string {
  if (grouping === "day") return formatCompactDate(start);
  if (grouping === "week") return formatCompactDate(start);
  return format(start, "MMM");
}

export function getFallbackAnalyticsGrouping(
  desired: AnalyticsGroupBy,
  available: AnalyticsGroupBy[]
): AnalyticsGroupBy {
  if (available.includes(desired)) return desired;

  const desiredIndex = GROUPING_ORDER.indexOf(desired);

  for (let index = desiredIndex - 1; index >= 0; index -= 1) {
    const candidate = GROUPING_ORDER[index];
    if (available.includes(candidate)) return candidate;
  }

  return "day";
}

export function getAvailableAnalyticsGroupings(
  rangeStart?: string | null,
  rangeEnd?: string | null
): AnalyticsGroupBy[] {
  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);

  if (!start || !end) return ["day"];

  const days = eachDayOfInterval({ start, end });
  const available: AnalyticsGroupBy[] = ["day"];

  for (const grouping of ["week", "month"] as const) {
    const bucketKeys = new Set(
      days.map((date) => buildBucket(date, grouping, start, end).key)
    );

    if (bucketKeys.size >= 4) {
      available.push(grouping);
    }
  }

  return available;
}

export function groupAnalyticsChartData<T extends AnalyticsChartPointLike>(
  points: T[],
  grouping: AnalyticsGroupBy,
  rangeStart?: string | null,
  rangeEnd?: string | null
): GroupedAnalyticsChartPoint[] {
  if (!points.length) return [];

  const fallbackStart = parseDate(points[0]?.dateKey ?? null);
  const fallbackEnd = parseDate(points[points.length - 1]?.dateKey ?? null);
  const intervalStart = parseDate(rangeStart) ?? fallbackStart;
  const intervalEnd = parseDate(rangeEnd) ?? fallbackEnd;

  if (!intervalStart || !intervalEnd) {
    return points.map((point) => ({
      ...point,
      bucketKey: point.dateKey ?? point.date,
      bucketStart: point.dateKey ?? "",
      bucketEnd: point.dateKey ?? "",
      rangeLabel: point.date,
      rangeContextLabel: "",
      grouping: "day",
    }));
  }

  const grouped = new Map<string, GroupedAnalyticsChartPoint>();

  for (const point of points) {
    const date = parseDate(point.dateKey ?? null);
    if (!date) continue;

    const bucket = buildBucket(date, grouping, intervalStart, intervalEnd);
    const existing = grouped.get(bucket.key);

    if (!existing) {
      grouped.set(bucket.key, {
        ...point,
        date: buildDisplayLabel(grouping, bucket.start),
        dateKey: bucket.key,
        bucketKey: bucket.key,
        bucketStart: format(bucket.start, "yyyy-MM-dd"),
        bucketEnd: format(bucket.end, "yyyy-MM-dd"),
        rangeLabel:
          grouping === "month"
            ? format(bucket.start, "MMM yyyy")
            : grouping === "day"
              ? formatCompactDate(bucket.start)
              : formatRangeLabel(bucket.start, bucket.end),
        rangeContextLabel: buildRangeContextLabel(grouping, bucket.start, bucket.end),
        grouping,
        impressions: point.impressions ?? 0,
        clicks: point.clicks ?? 0,
        sessions: point.sessions ?? 0,
        goals: point.goals ?? 0,
      });
      continue;
    }

    existing.impressions += point.impressions ?? 0;
    existing.clicks += point.clicks ?? 0;
    existing.sessions = (existing.sessions ?? 0) + (point.sessions ?? 0);
    existing.goals = (existing.goals ?? 0) + (point.goals ?? 0);
  }

  return Array.from(grouped.values()).sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}
