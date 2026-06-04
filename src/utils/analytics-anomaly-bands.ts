import { format } from "date-fns";

/** A single anomaly day with the analysis (as-of) date that surfaced it. */
export interface AnomalyDay {
  date: string;
  asOfDate: string;
}

/** A maximal run of consecutive-calendar-day anomalies. */
export interface AnomalyRun {
  startDate: string;
  endDate: string;
  /** Analysis (as-of) date of the last day in the run. */
  lastAsOfDate: string;
  length: number;
}

function isDateKey(value: string | null | undefined): value is string {
  return Boolean(value) && /^\d{4}-\d{2}-\d{2}$/.test(value as string);
}

function shiftDateKey(dateKey: string, days: number): string | null {
  if (!isDateKey(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/**
 * Groups anomaly days into maximal runs of consecutive calendar days.
 * Days are sorted and de-duplicated; a gap of one or more days breaks a run.
 */
export function groupConsecutiveAnomalyDays(days: AnomalyDay[]): AnomalyRun[] {
  const byDate = new Map<string, AnomalyDay>();
  for (const day of days) {
    if (!isDateKey(day.date)) continue;
    byDate.set(day.date, day);
  }

  const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const runs: AnomalyRun[] = [];

  let current: { startDay: AnomalyDay; endDay: AnomalyDay } | null = null;

  for (const day of sorted) {
    if (!current) {
      current = { startDay: day, endDay: day };
      continue;
    }

    const expectedNext = shiftDateKey(current.endDay.date, 1);
    if (expectedNext === day.date) {
      current.endDay = day;
      continue;
    }

    runs.push(toRun(current));
    current = { startDay: day, endDay: day };
  }

  if (current) runs.push(toRun(current));

  return runs;
}

function toRun(current: { startDay: AnomalyDay; endDay: AnomalyDay }): AnomalyRun {
  const start = new Date(`${current.startDay.date}T00:00:00`);
  const end = new Date(`${current.endDay.date}T00:00:00`);
  const length =
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  return {
    startDate: current.startDay.date,
    endDate: current.endDay.date,
    lastAsOfDate: current.endDay.asOfDate,
    length,
  };
}

function formatBandDate(dateKey: string): string {
  if (!isDateKey(dateKey)) return dateKey;
  try {
    return format(new Date(`${dateKey}T00:00:00`), "MMM d");
  } catch {
    return dateKey;
  }
}

/** Hover label for a band, e.g. "Goal anomaly · Mar 1 – Mar 9 (9 days)". */
export function formatAnomalyBandTitle(run: AnomalyRun, seriesLabel: string): string {
  const range = `${formatBandDate(run.startDate)} – ${formatBandDate(run.endDate)}`;
  return `${seriesLabel} · ${range} (${run.length} days)`;
}
