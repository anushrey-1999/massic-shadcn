"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./use-api";

/**
 * Read access to the performance monitoring engine.
 *
 * The engine stores a decision per business per day rather than computing one per request, so
 * these are all plain reads of state a daily run already wrote. Nothing here mutates.
 */

// ─── Enums (mirrors of the engine's frozen constants) ────────────────────────

/** `PAUSED` is a business state only; a metric never carries it. */
export type MonitoringAttention =
  | "NO_SIGNAL"
  | "HEALTHY"
  | "IMPROVING"
  | "WATCH"
  | "INVESTIGATE"
  | "PAUSED";

export type MonitoringMetricState = Exclude<MonitoringAttention, "PAUSED">;

export type MonitoringSeverity = "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MonitoringLifecycle =
  | "EMERGING"
  | "WATCHING"
  | "CONFIRMED"
  | "RECOVERING"
  | "RESOLVED"
  | "EXPIRED";

export type MonitoringDirection = "UP" | "DOWN";

export type MonitoringFindingType = "DEVIATION" | "TREND" | "DATA_ISSUE";

/** Only `ELIGIBLE` days enter baselines; the rest are still judged and still charted. */
export type MonitoringEligibility =
  | "ELIGIBLE"
  | "PROVISIONAL"
  | "MISSING"
  | "PRE_BREAK"
  | "MANUAL_EXCLUDED"
  | "DATA_QUALITY_EXCLUDED"
  | "TEMP_SHOCK_EXCLUDED"
  | "INCIDENT_EXCLUDED";

export type MonitoringNotificationKind =
  | "INVESTIGATE"
  | "IMPROVING"
  | "WORSENING"
  | "RESOLVED"
  | "NEW_NORMAL"
  | "DATA_ISSUE"
  | "DIGEST";

// ─── Response shapes ────────────────────────────────────────────────────────

export interface MonitoringIncidentParent {
  findingId: string;
  metricKey: string;
  type: MonitoringFindingType | null;
  direction: MonitoringDirection | null;
  pattern: string | null;
  pDeviation: number | null;
  zScore: number | null;
  contextClassification: string | null;
  startDate: string | null;
}

/**
 * `headline`, `lines` and `checkLine` are the text the run stored when it raised the alert.
 * Render them verbatim: an alert read today must match the one delivered last week.
 */
export interface MonitoringIncident {
  incidentId: string;
  lifecycle: MonitoringLifecycle;
  attention: MonitoringAttention;
  severity: MonitoringSeverity | null;
  headline: string | null;
  lines: string[];
  checkLine: string | null;
  createdOn: string | null;
  lastNotifiedOn: string | null;
  snoozedUntil: string | null;
  acknowledgedAt: string | null;
  dismissed: boolean;
  dismissedReason: string | null;
  manuallyResolvedAt: string | null;
  labels: string[];
  childFindingIds: string[];
  relatedIncidentIds: string[];
  parent: MonitoringIncidentParent | null;
}

export interface MonitoringContributor {
  dimension: string;
  key: string;
  actual: number | null;
  expected: number | null;
  baseline_share: number | null;
  delta: number | null;
  share_of_delta: number | null;
}

/** Heterogeneous by design: a cohort statement, a holiday, a storm and a campaign all land here. */
export interface MonitoringContextEvidence {
  type?: string;
  classification?: string;
  name?: string;
  date?: string;
  start?: string;
  end?: string;
  location?: string;
  category_plural?: string;
  member_count?: number;
  median_p?: number | null;
  affects_attention?: boolean;
  [key: string]: unknown;
}

export interface MonitoringFinding {
  findingId: string;
  metricKey: string;
  direction: MonitoringDirection | null;
  type: MonitoringFindingType | null;
  lifecycle: MonitoringLifecycle;
  regime: string | null;
  startDate: string | null;
  createdOn: string | null;
  confirmedOn: string | null;
  resolvedOn: string | null;
  resolutionReason: string | null;
  classAtCreation: string | null;
  confirmWindow: number | null;
  actual: number | null;
  expected: number | null;
  zScore: number | null;
  pDeviation: number | null;
  severity: MonitoringSeverity | null;
  attention: MonitoringAttention | null;
  pattern: string | null;
  contextClassification: string | null;
  contextEvidence: MonitoringContextEvidence[];
  contributors: MonitoringContributor[];
  checkCodes: string[];
  reference: unknown;
  reopenCount: number;
  versions: {
    engine: string | null;
    configuration: string | null;
    template: string | null;
  };
}

export interface MonitoringGoal {
  goalId: string;
  name: string;
  ga4KeyEventName: string;
  isEnabled: boolean;
}

export interface MonitoringAnnotation {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  metricKeys: string[] | null;
  channel: string | null;
  note: string | null;
  recursAnnually: boolean;
  direction: string | null;
  source: string | null;
  createdBy: number | null;
  createdAt: string;
}

/** A tracking break, kept apart from incidents so it is never read as a business decline. */
export interface MonitoringDataIssue {
  findingId: string;
  metricKey: string;
  lifecycle: MonitoringLifecycle;
  checkCodes: string[];
  startDate: string | null;
  createdOn: string | null;
}

export interface MonitoringRun {
  runDate: string;
  status: string;
  error: string | null;
  completedAt: string | null;
  engineVersion: string | null;
  configurationVersion: string | null;
  contextFreshness: Record<string, unknown> | null;
}

export interface MonitoringOverview {
  businessId: string;
  businessName: string | null;
  website: string | null;
  /** Null means never evaluated, which is not the same as healthy. */
  state: {
    attention: MonitoringAttention;
    stateDate: string;
    streakLength: number | null;
    drivingIncidentId: string | null;
  } | null;
  stateHistory: Array<{
    stateDate: string;
    attention: MonitoringAttention;
    streakLength: number | null;
  }>;
  incidents: MonitoringIncident[];
  metrics: Array<{
    metricKey: string;
    state: MonitoringMetricState;
    findingId: string | null;
    runDate: string;
  }>;
  goals: MonitoringGoal[];
  annotations: MonitoringAnnotation[];
  dataIssues: MonitoringDataIssue[];
  lastRun: MonitoringRun | null;
}

export interface MonitoringIncidentDetail {
  incident: MonitoringIncident;
  businessId: string;
  businessName: string | null;
  parentFinding: MonitoringFinding | null;
  childFindings: MonitoringFinding[];
  timeline: Array<{
    runDate: string;
    type: string;
    payload: Record<string, unknown> | null;
    createdAt: string;
  }>;
  labels: Array<{
    value: string;
    note: string | null;
    userId: number | null;
    createdAt: string;
  }>;
  relatedIncidents: Array<{
    incidentId: string;
    headline: string | null;
    lifecycle: MonitoringLifecycle;
    severity: MonitoringSeverity | null;
    metricKey: string | null;
  }>;
}

export interface MonitoringSeriesPoint {
  date: string;
  value: number | null;
  source: string;
  isFinal: boolean;
  eligibility: MonitoringEligibility;
  eligibilityReason: string | null;
  revision: number;
  expected: number | null;
  lower: number | null;
  upper: number | null;
  sigmaDay: number | null;
  factors: {
    weekday: number | null;
    trend: number | null;
    seasonal: number | null;
    holiday: number | null;
  } | null;
}

export interface MonitoringSeries {
  businessId: string;
  metricKey: string;
  range: { startDate: string; endDate: string };
  points: MonitoringSeriesPoint[];
  windows: Array<{
    windowDays: number;
    actual: number | null;
    expected: number | null;
    sigma: number | null;
    zScore: number | null;
    pDeviation: number | null;
    pNonseasonal: number | null;
    daysBelow: number | null;
    daysAbove: number | null;
    runDate: string;
  }>;
}

export interface MonitoringNotification {
  notificationId: string;
  businessId: string;
  businessName: string | null;
  incidentId: string | null;
  kind: MonitoringNotificationKind;
  headline: string | null;
  lines: string[];
  createdAt: string;
  readAt: string | null;
}

// ─── Transport ──────────────────────────────────────────────────────────────

/**
 * Monitoring answers with `{ success, data }` and fails with `{ success, error }`, not the
 * `{ err, message, data }` envelope the older analytics endpoints use, so `res.err` checks
 * do not apply here. Axios rejects on any non-2xx, so the success path is the only path.
 */
async function monitoringGet<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(
    `/monitoring${path}`,
    "node",
    params ? { params } : undefined,
  );
  return res.data;
}

const ERROR_COPY: Record<string, string> = {
  // 404 covers missing and forbidden alike, deliberately, so callers cannot probe for other
  // accounts' ids. Both have to read as "not found".
  BUSINESS_NOT_FOUND: "This business is not available.",
  INCIDENT_NOT_FOUND: "This alert is no longer available.",
  NOTIFICATION_NOT_FOUND: "This notification is no longer available.",
  MONITORING_PERMISSION_DENIED: "You do not have access to monitoring data.",
  INVALID_ID: "That request was not valid.",
  INVALID_DATE: "That date range was not valid.",
  INVALID_VALUE: "That request was not valid.",
  INVALID_RANGE: "That date range was not valid.",
  INVALID_METRIC_KEY: "That metric is not recognised.",
};

export function monitoringErrorMessage(error: unknown): string {
  const code = (
    error as { response?: { data?: { error?: { code?: string } } } }
  )?.response?.data?.error?.code;

  if (code && ERROR_COPY[code]) return ERROR_COPY[code];

  const message = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data?.error?.message;

  return message || "Monitoring data could not be loaded right now.";
}

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

const DEFAULT_SERIES_DAYS = 120;

interface ReadState {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** The whole business dashboard in one call: state, incidents, metrics, goals, data issues. */
export function useMonitoringOverview(
  businessId: string | null,
  enabled = true,
): ReadState & { data: MonitoringOverview | null } {
  const query = useQuery({
    queryKey: ["monitoring-overview", businessId],
    queryFn: () =>
      monitoringGet<MonitoringOverview>(`/businesses/${businessId}`),
    enabled: enabled && !!businessId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? monitoringErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

/** Incident history. The open set already arrives on the overview, so this is for resolved. */
export function useMonitoringIncidents(
  businessId: string | null,
  includeResolved: boolean,
  enabled = true,
): ReadState & { data: MonitoringIncident[] } {
  const query = useQuery({
    queryKey: ["monitoring-incidents", businessId, includeResolved],
    queryFn: () =>
      monitoringGet<{ incidents: MonitoringIncident[] }>(
        `/businesses/${businessId}/incidents`,
        { includeResolved },
      ),
    enabled: enabled && !!businessId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: query.data?.incidents ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? monitoringErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

/** One incident with the diagnosis behind it. Fetched only while its detail view is open. */
export function useMonitoringIncident(
  incidentId: string | null,
  enabled = true,
): ReadState & { data: MonitoringIncidentDetail | null } {
  const query = useQuery({
    queryKey: ["monitoring-incident", incidentId],
    queryFn: () =>
      monitoringGet<MonitoringIncidentDetail>(`/incidents/${incidentId}`),
    enabled: enabled && !!incidentId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? monitoringErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

/**
 * A metric's observed series merged with its expectation band.
 *
 * Goal metric keys are `goal:<uuid>`, so the key is encoded before it becomes a path segment.
 */
export function useMonitoringMetricSeries(
  businessId: string | null,
  metricKey: string | null,
  days: number = DEFAULT_SERIES_DAYS,
  enabled = true,
): ReadState & { data: MonitoringSeries | null } {
  const query = useQuery({
    queryKey: ["monitoring-metric-series", businessId, metricKey, days],
    queryFn: () =>
      monitoringGet<MonitoringSeries>(
        `/businesses/${businessId}/metrics/${encodeURIComponent(
          metricKey as string,
        )}/series`,
        { days },
      ),
    enabled: enabled && !!businessId && !!metricKey,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? monitoringErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

/** The notification feed, narrowed to one business. */
export function useMonitoringNotifications(
  businessId: string | null,
  enabled = true,
): ReadState & { data: MonitoringNotification[] } {
  const query = useQuery({
    queryKey: ["monitoring-notifications", businessId],
    queryFn: () =>
      monitoringGet<{ notifications: MonitoringNotification[] }>(
        "/notifications",
        { businessId },
      ),
    enabled: enabled && !!businessId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: query.data?.notifications ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? monitoringErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
