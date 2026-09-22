"use client";

import * as React from "react";
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  MonitoringGoal,
  MonitoringMetricState,
  MonitoringNotification,
  MonitoringOverview,
} from "@/hooks/use-monitoring";
import { MonitoringIncidentList } from "./MonitoringIncidentList";
import { MonitoringNotificationFeed } from "./MonitoringNotificationFeed";
import {
  ATTENTION_ACCENT,
  ATTENTION_LABEL,
  ATTENTION_MEANING,
  AttentionPill,
  MonitoringEmpty,
  MonitoringRow,
  SectionLabel,
  daysSince,
  GOAL_VISUAL,
  formatMonitoringDate,
  isGoalMetric,
  metricLabel,
  metricVisual,
} from "./monitoring-ui";

/**
 * How loud each metric state is, so a collapsed group can surface the worst one it hides.
 * Ordered by how much it should pull the eye, not by how the engine ranks them internally.
 */
const STATE_SEVERITY: Record<MonitoringMetricState, number> = {
  NO_SIGNAL: 0,
  HEALTHY: 1,
  IMPROVING: 2,
  WATCH: 3,
  INVESTIGATE: 4,
};

const WATCH_SEVERITY = STATE_SEVERITY.WATCH;

type OverviewTab = "alerts" | "metrics" | "notifications";

const TAB_TRIGGER_CLASS =
  "h-auto min-h-8 flex-1 gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium leading-[1.5] text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-general-foreground data-[state=active]:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]";

interface MonitoringOverviewViewProps {
  overview: MonitoringOverview | null;
  businessId: string | null;
  /** Loaded by the sheet on open, so the tab can carry a count before it is selected. */
  notifications: MonitoringNotification[];
  notificationsLoading: boolean;
  notificationsError: boolean;
  notificationsErrorMessage: string | null;
  onOpenIncident: (incidentId: string) => void;
  onOpenMetric: (metricKey: string) => void;
}

export function MonitoringOverviewView({
  overview,
  businessId,
  notifications,
  notificationsLoading,
  notificationsError,
  notificationsErrorMessage,
  onOpenIncident,
  onOpenMetric,
}: MonitoringOverviewViewProps) {
  const [tab, setTab] = React.useState<OverviewTab>("alerts");

  // Null is "the latest run". Selecting a day from the strip keeps this same layout and
  // narrows what it is reporting on, rather than pushing a different-looking screen.
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  if (!overview) return null;

  // No state row and no run means the engine has never looked at this business. That is not
  // the same as a clean bill of health, so it gets said explicitly.
  const neverEvaluated = !overview.state && !overview.lastRun;

  if (neverEvaluated) {
    return (
      <MonitoringEmpty
        icon={<Activity className="h-4 w-4" />}
        title="Not monitored yet"
        description="This business is enrolled in monitoring once its Analytics and Search Console history has been imported. Nothing has been evaluated so far."
      />
    );
  }

  // A day is only selectable if it was evaluated, so this is always found when set.
  const selectedDay = selectedDate
    ? overview.stateHistory.find((entry) => entry.stateDate === selectedDate) ??
      null
    : null;

  // An alert belongs to a day if it was raised then or last spoken about then. Anything else
  // would be guesswork: the API returns each alert's state as of the latest run, not a
  // snapshot per day, so a strict "what was open on Sep 17" cannot be reconstructed here.
  const incidents = selectedDate
    ? overview.incidents.filter(
        (incident) =>
          incident.createdOn === selectedDate ||
          incident.lastNotifiedOn === selectedDate,
      )
    : overview.incidents;

  const dataIssues = selectedDate ? [] : overview.dataIssues;
  const annotations = selectedDate ? [] : overview.annotations;

  const shownNotifications = selectedDate
    ? notifications.filter(
        (notification) =>
          notification.createdAt.slice(0, 10) === selectedDate,
      )
    : notifications;

  const alertCount = incidents.length + dataIssues.length;

  return (
    <div className="pb-8">
      <StateHeader
        overview={overview}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDate}
      />

      <div className="border-b border-general-border px-6 py-3">
        <Tabs value={tab} onValueChange={(value) => setTab(value as OverviewTab)}>
          <TabsList className="h-auto w-full gap-1 rounded-[8px] bg-general-border p-1">
            <TabsTrigger value="alerts" className={TAB_TRIGGER_CLASS}>
              Alerts
              <Count value={alertCount} active={tab === "alerts"} />
            </TabsTrigger>
            <TabsTrigger value="metrics" className={TAB_TRIGGER_CLASS}>
              Metrics
              <Count value={overview.metrics.length} active={tab === "metrics"} />
            </TabsTrigger>
            <TabsTrigger value="notifications" className={TAB_TRIGGER_CLASS}>
              Notifications
              <Count
                value={shownNotifications.length}
                active={tab === "notifications"}
              />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "alerts" ? (
        selectedDate && incidents.length === 0 ? (
          <MonitoringEmpty
            icon={<Activity className="h-4 w-4" />}
            title="No alert activity"
            description={`Nothing was raised or escalated on ${formatMonitoringDate(
              selectedDate,
              { withYear: true },
            )}.`}
          />
        ) : (
          <MonitoringIncidentList
            businessId={businessId}
            incidents={incidents}
            dataIssues={dataIssues}
            annotations={annotations}
            goals={overview.goals}
            onOpenIncident={onOpenIncident}
            // Closed alerts are a history query against the business, not against a day.
            allowShowClosed={!selectedDate}
          />
        )
      ) : null}

      {tab === "metrics" ? (
        <>
          {selectedDate ? (
            <p className="border-b border-general-border px-6 py-3 text-[11px] leading-relaxed text-muted-foreground">
              Metric states are stored for the latest run only, so these are current rather
              than from {formatMonitoringDate(selectedDate)}. Open a metric to see its value
              on that day.
            </p>
          ) : null}
          <MetricList overview={overview} onOpenMetric={onOpenMetric} />
        </>
      ) : null}

      {tab === "notifications" ? (
        <MonitoringNotificationFeed
          notifications={shownNotifications}
          isLoading={notificationsLoading}
          isError={notificationsError}
          error={notificationsErrorMessage}
          emptyTitle={selectedDate ? "Nothing was sent" : undefined}
          emptyDescription={
            selectedDate
              ? `No notification went out on ${formatMonitoringDate(selectedDate, {
                  withYear: true,
                })}.`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function Count({ value, active }: { value: number; active: boolean }) {
  if (!value) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-4 items-center justify-center rounded-[4px] px-1 text-[11px] font-medium leading-4",
        active ? "bg-general-foreground text-white" : "bg-white/70 text-general-foreground",
      )}
    >
      {value}
    </span>
  );
}

/** Current attention, what it means, how fresh it is, and the last 90 days behind it. */
function StateHeader({
  overview,
  selectedDate,
  selectedDay,
  onSelectDay,
}: {
  overview: MonitoringOverview;
  selectedDate: string | null;
  selectedDay: MonitoringOverview["stateHistory"][number] | null;
  onSelectDay: (date: string | null) => void;
}) {
  const lastRun = overview.lastRun;
  const runAge = daysSince(lastRun?.runDate);
  const runFailed = Boolean(lastRun && lastRun.status !== "completed");
  const runStale = runAge !== null && runAge > 1;

  // While a past day is being read, the header reports that day. The freshness warning is
  // suppressed with it: "these numbers are not current" is noise when the whole point of
  // the view is that the reader went looking for an older one.
  const attention = selectedDay
    ? selectedDay.attention
    : overview.state?.attention ?? null;
  const streakLength = selectedDay
    ? selectedDay.streakLength
    : overview.state?.streakLength;

  return (
    <div className="border-b border-general-border px-6 pb-4 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AttentionPill attention={attention} streakLength={streakLength} />
          <p className="mt-2 text-sm text-general-foreground">
            {attention
              ? ATTENTION_MEANING[attention]
              : "No state has been written for this business yet."}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.15px] text-muted-foreground">
            {selectedDate ? "Viewing" : "Last run"}
          </p>
          <p className="mt-0.5 text-sm text-general-foreground">
            {formatMonitoringDate(selectedDate ?? lastRun?.runDate)}
          </p>
        </div>
      </div>

      {selectedDate ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[6px] bg-general-secondary px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-general-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            Showing{" "}
            <span className="font-medium">
              {formatMonitoringDate(selectedDate, { withYear: true })}
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-[11px]"
            onClick={() => onSelectDay(null)}
          >
            Back to latest
          </Button>
        </div>
      ) : runFailed || runStale ? (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#B9741A]">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {runFailed
            ? `The last run did not complete${
                lastRun?.error ? `: ${lastRun.error}` : ""
              }. Everything below is from before that.`
            : `The last run was ${runAge} days ago, so these numbers are not current.`}
        </p>
      ) : null}

      <StateStrip
        history={overview.stateHistory}
        selectedDate={selectedDate}
        onSelectDay={onSelectDay}
      />
    </div>
  );
}

const STRIP_DAYS = 90;

/**
 * Attention over the last 90 calendar days, one slot per day.
 *
 * Drawn against the full calendar rather than only the days that were evaluated. Sizing cells
 * to the data would let a business with a single evaluated day render one colour across the
 * whole width, which reads as "90 days of Watch" when it means the opposite. Unevaluated days
 * stay as an empty track, so the gaps are the point.
 */
function StateStrip({
  history,
  selectedDate,
  onSelectDay,
}: {
  history: MonitoringOverview["stateHistory"];
  selectedDate: string | null;
  onSelectDay: (date: string | null) => void;
}) {
  const slots = React.useMemo(() => {
    const byDate = new Map(history.map((day) => [day.stateDate, day]));

    const end = new Date();
    return Array.from({ length: STRIP_DAYS }, (_, index) => {
      const date = new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate() - (STRIP_DAYS - 1 - index),
        ),
      );
      const key = date.toISOString().slice(0, 10);
      return { key, day: byDate.get(key) ?? null };
    });
  }, [history]);

  const evaluated = history.length;

  return (
    <div className="mt-4">
      <div className="flex items-end gap-px">
        {slots.map(({ key, day }) => (
          <button
            key={key}
            type="button"
            // Unevaluated days are inert rather than hidden: the gap is information, but
            // there is nothing behind it to open.
            disabled={!day}
            // Clicking the selected day again returns to the latest, so the strip is a
            // toggle and not a one-way door.
            onClick={() =>
              day && onSelectDay(key === selectedDate ? null : key)
            }
            aria-pressed={key === selectedDate}
            aria-label={
              day
                ? `View ${formatMonitoringDate(key, { withYear: true })}`
                : undefined
            }
            className={cn(
              "h-5 min-w-0 flex-1 rounded-[2px] transition-opacity",
              day
                ? "cursor-pointer hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/40"
                : "cursor-default",
              key === selectedDate &&
                "ring-2 ring-general-foreground ring-offset-1",
            )}
            style={{
              backgroundColor: day
                ? ATTENTION_ACCENT[day.attention] ?? "#B4B2A9"
                : "#F2F1EE",
            }}
            title={
              day
                ? `${formatMonitoringDate(key, { withYear: true })} · ${
                    ATTENTION_LABEL[day.attention] ?? day.attention
                  } · click to view`
                : `${formatMonitoringDate(key, { withYear: true })} · not evaluated`
            }
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{formatMonitoringDate(slots[0].key)}</span>
        <span>
          {evaluated} of the last {STRIP_DAYS} days evaluated
          {evaluated > 0 ? " · click a day to open it" : ""}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Per-metric state, each row a way into that metric's chart. */
function MetricList({
  overview,
  onOpenMetric,
}: {
  overview: MonitoringOverview;
  onOpenMetric: (metricKey: string) => void;
}) {
  if (overview.metrics.length === 0) {
    return (
      <MonitoringEmpty
        icon={<Activity className="h-4 w-4" />}
        title="No metrics evaluated yet"
        description="Metrics appear once a run has enough history to judge them."
      />
    );
  }

  const goalMetrics = overview.metrics.filter((metric) =>
    isGoalMetric(metric.metricKey),
  );
  const siteMetrics = overview.metrics.filter(
    (metric) => !isGoalMetric(metric.metricKey),
  );

  return (
    <>
      <SectionLabel>Monitored metrics</SectionLabel>

      {goalMetrics.length > 0 ? (
        <GoalGroup
          metrics={goalMetrics}
          goals={overview.goals}
          onOpenMetric={onOpenMetric}
        />
      ) : null}

      {siteMetrics.map((metric) => (
        <MetricRow
          key={metric.metricKey}
          metric={metric}
          goals={overview.goals}
          onOpenMetric={onOpenMetric}
        />
      ))}
    </>
  );
}

/**
 * The goals, behind one row.
 *
 * A business can have a dozen tracked events, and listing them flat buries the four site-wide
 * metrics under a wall of goal names. Collapsed, the row still has to carry the worst state
 * any goal is in — a group that hides a problem is worse than no group at all.
 */
function GoalGroup({
  metrics,
  goals,
  onOpenMetric,
}: {
  metrics: MonitoringOverview["metrics"];
  goals: MonitoringGoal[];
  onOpenMetric: (metricKey: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const worst = React.useMemo(
    () =>
      metrics.reduce<MonitoringMetricState | null>((carried, metric) => {
        if (metric.state == null) return carried;
        if (carried == null) return metric.state;
        return STATE_SEVERITY[metric.state] > STATE_SEVERITY[carried]
          ? metric.state
          : carried;
      }, null),
    [metrics],
  );

  const needAttention = metrics.filter(
    (metric) =>
      metric.state != null && STATE_SEVERITY[metric.state] >= WATCH_SEVERITY,
  ).length;

  return (
    <>
      <MonitoringRow onClick={() => setOpen((previous) => !previous)}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm text-general-foreground">
              <span className="shrink-0" style={{ color: GOAL_VISUAL.color }}>
                {GOAL_VISUAL.icon}
              </span>
              <span className="truncate">Goals</span>
              <span className="shrink-0 rounded-full bg-general-secondary px-2 py-0.5 text-[10px] font-medium text-general-muted-foreground">
                {metrics.length}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {GOAL_VISUAL.kind}
              {needAttention > 0
                ? ` · ${needAttention} need${needAttention === 1 ? "s" : ""} attention`
                : " · all in line with expectation"}
            </p>
          </div>
          <AttentionPill attention={worst} />
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </MonitoringRow>

      {open
        ? metrics.map((metric) => (
            <MetricRow
              key={metric.metricKey}
              metric={metric}
              goals={goals}
              onOpenMetric={onOpenMetric}
              nested
            />
          ))
        : null}
    </>
  );
}

function MetricRow({
  metric,
  goals,
  onOpenMetric,
  nested,
}: {
  metric: MonitoringOverview["metrics"][number];
  goals: MonitoringGoal[];
  onOpenMetric: (metricKey: string) => void;
  nested?: boolean;
}) {
  const visual = metricVisual(metric.metricKey);

  return (
    <MonitoringRow
      onClick={() => onOpenMetric(metric.metricKey)}
      className={cn(nested && "bg-general-secondary/30 pl-12")}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm text-general-foreground">
            {nested ? null : (
              <span className="shrink-0" style={{ color: visual.color }}>
                {visual.icon}
              </span>
            )}
            <span className="truncate">
              {metricLabel(metric.metricKey, goals)}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {visual.kind} · evaluated {formatMonitoringDate(metric.runDate)}
          </p>
        </div>
        <AttentionPill attention={metric.state} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </MonitoringRow>
  );
}
