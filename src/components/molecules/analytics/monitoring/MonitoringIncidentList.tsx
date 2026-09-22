"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMonitoringIncidents } from "@/hooks/use-monitoring";
import type {
  MonitoringAnnotation,
  MonitoringDataIssue,
  MonitoringGoal,
  MonitoringIncident,
} from "@/hooks/use-monitoring";
import {
  LifecyclePill,
  MonitoringEmpty,
  MonitoringRow,
  SectionLabel,
  SeverityDot,
  formatMonitoringDate,
  metricLabel,
} from "./monitoring-ui";

/**
 * The alerts tab: open incidents, then data issues, then the context a user has declared.
 *
 * Data issues are kept in their own section on purpose. A broken tag is not a business
 * decline, and listing the two together is exactly how the old anomaly cards misled people.
 */

interface MonitoringIncidentListProps {
  businessId: string | null;
  incidents: MonitoringIncident[];
  dataIssues: MonitoringDataIssue[];
  annotations: MonitoringAnnotation[];
  goals: MonitoringGoal[];
  onOpenIncident: (incidentId: string) => void;
  /**
   * Closed alerts are fetched for the whole business, so the control is hidden when the list
   * has been narrowed to a single day — the results would ignore that narrowing.
   */
  allowShowClosed?: boolean;
}

export function MonitoringIncidentList({
  businessId,
  incidents,
  dataIssues,
  annotations,
  goals,
  onOpenIncident,
  allowShowClosed = true,
}: MonitoringIncidentListProps) {
  const [showResolved, setShowResolved] = React.useState(false);

  // The open set already arrived with the overview, so history is only fetched if asked for.
  const history = useMonitoringIncidents(businessId, true, showResolved);

  const resolved = React.useMemo(() => {
    const openIds = new Set(incidents.map((incident) => incident.incidentId));
    return history.data.filter(
      (incident) => !openIds.has(incident.incidentId),
    );
  }, [history.data, incidents]);

  const nothingOpen = incidents.length === 0 && dataIssues.length === 0;

  return (
    <>
      {nothingOpen ? (
        <MonitoringEmpty
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Nothing open"
          description="No confirmed change and no data issue on the last run."
        />
      ) : null}

      {incidents.length > 0 ? (
        <>
          <SectionLabel>Open alerts</SectionLabel>
          {incidents.map((incident) => (
            <IncidentRow
              key={incident.incidentId}
              incident={incident}
              goals={goals}
              onOpen={() => onOpenIncident(incident.incidentId)}
            />
          ))}
        </>
      ) : null}

      {dataIssues.length > 0 ? (
        <>
          <SectionLabel>Data issues</SectionLabel>
          {dataIssues.map((issue) => (
            <MonitoringRow key={issue.findingId}>
              <div className="flex items-start gap-3">
                <Unplug className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-general-foreground">
                    {metricLabel(issue.metricKey, goals)} is not reporting
                    reliably
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Since {formatMonitoringDate(issue.startDate)}
                    {issue.checkCodes.length > 0
                      ? ` · ${issue.checkCodes.join(", ")}`
                      : ""}
                  </p>
                </div>
                <LifecyclePill lifecycle={issue.lifecycle} />
              </div>
            </MonitoringRow>
          ))}
        </>
      ) : null}

      {annotations.length > 0 ? (
        <>
          <SectionLabel>Declared context</SectionLabel>
          {annotations.map((annotation) => (
            <MonitoringRow key={annotation.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-general-foreground">
                    {annotation.type.replace(/_/g, " ").toLowerCase()}
                    {annotation.direction ? ` · ${annotation.direction}` : ""}
                  </p>
                  {annotation.note ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {annotation.note}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatMonitoringDate(annotation.startDate)}
                  {annotation.endDate
                    ? ` – ${formatMonitoringDate(annotation.endDate)}`
                    : ""}
                </span>
              </div>
            </MonitoringRow>
          ))}
        </>
      ) : null}

      <div className={cn("px-6 pt-4", !allowShowClosed && "hidden")}>
        {showResolved ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.15px] text-muted-foreground">
              Closed alerts
            </p>
            {history.isLoading ? (
              <p className="py-3 text-[11px] text-muted-foreground">
                Loading history
              </p>
            ) : history.isError ? (
              <p className="py-3 text-[11px] text-muted-foreground">
                {history.error}
              </p>
            ) : resolved.length === 0 ? (
              <p className="py-3 text-[11px] text-muted-foreground">
                No closed alerts on record.
              </p>
            ) : (
              <div className="-mx-6 mt-2">
                {resolved.map((incident) => (
                  <IncidentRow
                    key={incident.incidentId}
                    incident={incident}
                    goals={goals}
                    onOpen={() => onOpenIncident(incident.incidentId)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowResolved(true)}
          >
            Show closed alerts
          </Button>
        )}
      </div>
    </>
  );
}

/**
 * One alert.
 *
 * `headline`, `lines` and `checkLine` are printed as stored. The run that raised the alert
 * composed them, so an alert read today matches the one delivered the day it fired; nothing
 * here recomposes copy from the numbers.
 */
function IncidentRow({
  incident,
  goals,
  onOpen,
}: {
  incident: MonitoringIncident;
  goals: MonitoringGoal[];
  onOpen: () => void;
}) {
  return (
    <MonitoringRow onClick={onOpen}>
      <div className="flex items-start gap-3">
        <SeverityDot severity={incident.severity} className="mt-1.5" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-general-foreground">
            {incident.headline || "Change detected"}
          </p>

          {incident.lines.map((line, index) => (
            <p
              key={index}
              className="mt-1 text-[13px] leading-relaxed text-muted-foreground"
            >
              {line}
            </p>
          ))}

          {incident.checkLine ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-general-unofficial-foreground-alt">
              {incident.checkLine}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <LifecyclePill lifecycle={incident.lifecycle} />
            {incident.parent ? (
              <span>{metricLabel(incident.parent.metricKey, goals)}</span>
            ) : null}
            <span>Raised {formatMonitoringDate(incident.createdOn)}</span>
            {incident.snoozedUntil ? (
              <span>
                Snoozed to {formatMonitoringDate(incident.snoozedUntil)}
              </span>
            ) : null}
            {incident.acknowledgedAt ? <span>Seen</span> : null}
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </MonitoringRow>
  );
}
