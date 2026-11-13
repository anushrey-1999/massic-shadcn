"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./use-api";

/**
 * Monitoring 1 reads. The server computes every number and writes every sentence, so these
 * hooks only fetch and type the response; the UI renders the strings as they arrive.
 */

// ─── Request ────────────────────────────────────────────────────────────────

/** A server preset key (`14`, `last_week`, …), or a custom range of YYYY-MM-DD dates. Null means the server default. */
export type MonitoringRange =
  | { preset: string }
  | { start: string; end: string }
  | null;

const SCOPE = "all";

function rangeParams(range: MonitoringRange): Record<string, string> {
  if (!range) return { scope: SCOPE };
  if ("preset" in range) return { scope: SCOPE, range: range.preset };
  return { scope: SCOPE, range: "custom", start: range.start, end: range.end };
}

function rangeKey(range: MonitoringRange): string {
  if (!range) return "default";
  return "preset" in range ? `p${range.preset}` : `${range.start}_${range.end}`;
}

// ─── Shared shapes ──────────────────────────────────────────────────────────

export type MonitoringMetric = "impressions" | "clicks" | "sessions" | "goals";
export type MonitoringLineMetric = "impressions" | "clicks" | "sessions";
export type MonitoringDirection = "up" | "down";
export type MonitoringHealthColor = "green" | "amber" | "red" | "gray";
export type MonitoringCardTag =
  | "data_issue"
  | "unusual_drop"
  | "unusual_jump"
  | "declining"
  | "improving";
export type MonitoringCardKind = "data_issue" | "anomaly" | "change";

/** A part of the screen that can fail on its own; `error` carries the retry text. */
export interface MonitoringSection<T> {
  data: T | null;
  error: { message: string; retry: string } | null;
}

export interface MonitoringPoint {
  date: string;
  value: number | null;
}

export interface MonitoringShade {
  cardId: string;
  metric: MonitoringMetric;
  eventName: string | null;
  direction: MonitoringDirection;
  start: string;
  end: string;
  episodeStart: string;
  episodeEnd: string;
  label: string;
  tooltip: string;
}

export interface MonitoringChartWindow {
  metric: MonitoringMetric;
  connected: boolean;
  points: MonitoringPoint[];
  usualPerDay: number | null;
  shading: MonitoringShade[];
}

export interface MonitoringStatus {
  code: "ongoing" | "recovering" | "back_to_usual" | "ended";
  label: string;
  date?: string | null;
}

export interface MonitoringCard {
  id: string;
  kind: MonitoringCardKind;
  tag: MonitoringCardTag;
  tagLabel: string;
  metric: MonitoringMetric | null;
  eventName?: string | null;
  goalName?: string | null;
  colorIndex?: number | null;
  direction?: MonitoringDirection;
  dates: { start: string; end: string };
  status: MonitoringStatus | null;
  title: string;
  subtitle: string;
  mostlyOn?: { page: string; name: string; text: string } | null;
  reason?: string | null;
  mayBeBecause?: string | null;
  comparisonNote?: string | null;
  hidden?: boolean;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export interface MonitoringRangePreset {
  key: string;
  group: "recent" | "calendar";
  label: string;
  start: string;
  end: string;
  dates: string;
  available: boolean;
}

export interface MonitoringRangeModel {
  preset: string | null;
  start: string;
  end: string;
  days: number;
  compareStart: string;
  compareEnd: string;
  label: string;
  compared: string;
  presets: MonitoringRangePreset[];
  customLabel: string;
  customHint: string;
  minDays: number;
  earliestStart: string;
  latestEnd: string;
}

export interface MonitoringPill {
  color: MonitoringHealthColor;
  label: string;
  computedDate: string;
  streak: {
    days: number;
    startDate: string;
    endDate: string;
    isStale: boolean;
    text: string;
  } | null;
  note: string;
}

export interface MonitoringTop {
  pill: MonitoringPill | null;
  headline: { title: string; subtitle: string | null };
}

export interface MonitoringStripDay {
  date: string;
  color: MonitoringHealthColor | null;
  label: string | null;
  tooltip: string;
}

export interface MonitoringGoalDots {
  eventName: string;
  name: string;
  colorIndex: number;
  dates: string[];
}

export interface MonitoringChart {
  start: string;
  end: string;
  compared: { start: string; end: string; label: string };
  defaultLine: MonitoringLineMetric;
  lines: Record<MonitoringLineMetric, MonitoringChartWindow>;
  goalShading: MonitoringShade[];
  healthStrip: MonitoringStripDay[];
  goalDots: { label: string; defaultOn: boolean; goals: MonitoringGoalDots[] };
  comparisonNote: {
    text: string;
    links: Array<{ start: string; end: string; cardId: string; metricLabel: string }>;
  } | null;
  days: Array<{ date: string; note: string }>;
}

export interface MonitoringList {
  heading: string;
  empty: string | null;
  showMore: string | null;
  cards: MonitoringCard[];
}

/** Metrics tab statuses (PRD 10.3), in the order they are checked. */
export type MonitoringMetricStatus =
  | "no_data"
  | "not_enough_history"
  | "too_few"
  | "lower"
  | "higher"
  | "normal";

export interface MonitoringMetricRow {
  key: string;
  name: string;
  metric: MonitoringMetric;
  eventName?: string | null;
  indent?: boolean;
  connected?: boolean;
  notConnected?: string;
  empty?: string;
  total?: number | null;
  status?: MonitoringMetricStatus;
  statusLabel?: string;
  /** "Usually 520 to 610", or null when the range can't be judged. */
  usual?: string | null;
}

export interface MonitoringJudged {
  total: number;
  lo: number | null;
  hi: number | null;
  status: MonitoringMetricStatus;
  statusLabel: string;
}

export interface MonitoringWeekBucket {
  start: string;
  end: string;
  value: number;
  partial: boolean;
}

export interface MonitoringMetricDetail extends MonitoringJudged {
  key: string;
  name: string;
  metric: MonitoringMetric;
  connected: boolean;
  usual: string | null;
  caption: string;
  usualSentence: string | null;
  chart: {
    daily: MonitoringChartWindow;
    weekly: { buckets: MonitoringWeekBucket[]; usualPerWeek: number | null };
    labels: { daily: string; weekly: string; eachDay: string; eachWeek: string };
  };
  quickCheck: {
    title: string;
    head: { dates: string; total: string; usual: string; status: string };
    rows: Array<
      MonitoringJudged & { days: number; label: string; start: string; end: string; usual: string | null }
    >;
  };
}

export interface MonitoringScreen {
  business: { id: string; name: string };
  scope: string;
  range: MonitoringRangeModel;
  dataUpTo: { date: string; text: string };
  sources: Record<
    "ga4" | "gsc",
    { name: string; connected: boolean; lastDay: string | null; stoppedFrom: string | null }
  >;
  goals: Array<{ eventName: string; name: string; colorIndex: number }>;
  top: MonitoringSection<MonitoringTop>;
  chart: MonitoringSection<MonitoringChart>;
  list: MonitoringSection<MonitoringList>;
  metrics: MonitoringSection<MonitoringMetricRow[]>;
}

// ─── Card detail ────────────────────────────────────────────────────────────

export interface MonitoringWhereView {
  key: "pages" | "channels" | "searches" | "brand";
  label: string;
  empty?: string;
  head?: string[];
  rows?: Array<{ page?: string; name: string; cells: string[] }>;
  note?: string;
  sentence?: string | null;
  partialLine?: string | null;
}

export interface MonitoringCheckRow {
  key: string;
  name: string;
  result: "yes" | "no" | "notConnected" | "notChecked";
  text: string | null;
  partialLine: string | null;
}

export interface MonitoringCardDetail {
  card: MonitoringCard;
  header: {
    tag: MonitoringCardTag;
    tagLabel: string;
    status: MonitoringStatus | null;
    title: string;
    subtitle: string;
  };
  keyNumber?: {
    value: number;
    caption: string;
    change: string;
    direction: MonitoringDirection;
  };
  miniChart: MonitoringChartWindow & {
    compared?: { start: string; end: string; label: string };
  };
  whatHappened?: string[];
  related?: { lead: string; title: string; cardId: string } | null;
  where?: MonitoringWhereView[];
  checks?: { rows: MonitoringCheckRow[]; summary: string | null; footer: string };
  whatToCheck?: string[];
}

// ─── Transport ──────────────────────────────────────────────────────────────

/** Monitoring answers `{ success, data }` and fails `{ success: false, error: { message } }`. */
export async function monitoringGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(`/monitoring${path}`, "node", {
    params,
  });
  return res.data;
}

const FALLBACK_ERROR = "Monitoring data could not be loaded right now.";

export function monitoringErrorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message;
  return message || FALLBACK_ERROR;
}

export function monitoringErrorStatus(error: unknown): number | null {
  return (error as { response?: { status?: number } })?.response?.status ?? null;
}

const STALE_TIME = 5 * 60 * 1000;

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useMonitoringScreen(businessId: string | null, range: MonitoringRange) {
  return useQuery({
    queryKey: ["monitoring-screen", businessId, rangeKey(range)],
    queryFn: () => monitoringGet<MonitoringScreen>(`/businesses/${businessId}`, rangeParams(range)),
    enabled: !!businessId,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
    retry: (count, error) => monitoringErrorStatus(error) === null && count < 1,
  });
}

/** One card's detail panel. Runs only while the panel is open. */
export function useMonitoringCard(
  businessId: string | null,
  cardId: string | null,
  range: MonitoringRange
) {
  return useQuery({
    queryKey: ["monitoring-card", businessId, cardId, rangeKey(range)],
    queryFn: () =>
      monitoringGet<MonitoringCardDetail>(
        `/businesses/${businessId}/cards/${encodeURIComponent(cardId as string)}`,
        rangeParams(range)
      ),
    enabled: !!businessId && !!cardId,
    staleTime: STALE_TIME,
    retry: false,
  });
}

/** One Metrics tab row's detail panel. Runs only while the panel is open. */
export function useMonitoringMetric(
  businessId: string | null,
  metricKey: string | null,
  range: MonitoringRange
) {
  return useQuery({
    queryKey: ["monitoring-metric", businessId, metricKey, rangeKey(range)],
    queryFn: () =>
      monitoringGet<MonitoringMetricDetail>(
        `/businesses/${businessId}/metrics/${encodeURIComponent(metricKey as string)}`,
        rangeParams(range)
      ),
    enabled: !!businessId && !!metricKey,
    staleTime: STALE_TIME,
    retry: false,
  });
}
