"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useMonitoringIncident } from "@/hooks/use-monitoring";
import type {
  MonitoringContributor,
  MonitoringFinding,
  MonitoringGoal,
} from "@/hooks/use-monitoring";
import {
  FactRow,
  LifecyclePill,
  MonitoringError,
  MonitoringLoading,
  MonitoringRow,
  MetricChange,
  SectionLabel,
  SeverityDot,
  evidenceLabel,
  formatCount,
  formatMonitoringDate,
  formatMonitoringTimestamp,
  formatSignedPct,
  metricLabel,
  metricVisual,
  unusualness,
} from "./monitoring-ui";

/**
 * One alert in full: the stored copy, the finding that drove it, the decomposition behind it,
 * and the audit trail of everything that has happened to it.
 */

interface MonitoringIncidentDetailProps {
  incidentId: string;
  goals: MonitoringGoal[];
  onOpenIncident: (incidentId: string) => void;
  onOpenMetric: (metricKey: string) => void;
}

export function MonitoringIncidentDetailView({
  incidentId,
  goals,
  onOpenIncident,
  onOpenMetric,
}: MonitoringIncidentDetailProps) {
  const { data, isLoading, isError, error } = useMonitoringIncident(incidentId);

  if (isLoading) return <MonitoringLoading label="Loading alert" />;
  if (isError) return <MonitoringError message={error} />;
  if (!data) return null;

  const { incident, parentFinding, childFindings, timeline, relatedIncidents } =
    data;

  return (
    <div className="pb-8">
      <div className="border-b border-general-border px-6 pb-4 pt-5">
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
              <p className="mt-2 text-[11px] leading-relaxed text-general-unofficial-foreground-alt">
                {incident.checkLine}
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <LifecyclePill lifecycle={incident.lifecycle} />
              <span>Raised {formatMonitoringDate(incident.createdOn)}</span>
              {incident.lastNotifiedOn ? (
                <span>
                  Last notified{" "}
                  {formatMonitoringDate(incident.lastNotifiedOn)}
                </span>
              ) : null}
              {incident.dismissed ? (
                <span>
                  Dismissed
                  {incident.dismissedReason
                    ? ` · ${incident.dismissedReason.toLowerCase()}`
                    : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {parentFinding ? (
        <FindingBlock
          finding={parentFinding}
          goals={goals}
          label="The finding"
          onOpenMetric={onOpenMetric}
        />
      ) : null}

      {childFindings.length > 0 ? (
        <>
          <SectionLabel>Also moving together</SectionLabel>
          {childFindings.map((finding) => (
            <MonitoringRow
              key={finding.findingId}
              onClick={() => onOpenMetric(finding.metricKey)}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm text-general-foreground">
                    <span
                      className="shrink-0"
                      style={{ color: metricVisual(finding.metricKey).color }}
                    >
                      {metricVisual(finding.metricKey).icon}
                    </span>
                    <span className="truncate">
                      {metricLabel(finding.metricKey, goals)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {finding.direction === "UP" ? "Above" : "Below"} expectation
                    by {formatSignedPct(finding.pDeviation)} · since{" "}
                    {formatMonitoringDate(finding.startDate)}
                  </p>
                </div>
                <LifecyclePill lifecycle={finding.lifecycle} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </MonitoringRow>
          ))}
        </>
      ) : null}

      {timeline.length > 0 ? (
        <>
          <SectionLabel>History</SectionLabel>
          <div className="px-6">
            {timeline.map((event, index) => (
              <div
                key={`${event.runDate}-${event.type}-${index}`}
                className="flex items-baseline justify-between gap-4 border-b border-general-border py-2 last:border-b-0"
              >
                <span className="min-w-0 text-sm text-general-foreground">
                  {event.type.replace(/_/g, " ").toLowerCase()}
                  {typeof event.payload?.action === "string"
                    ? ` · ${String(event.payload.action).toLowerCase()}`
                    : ""}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatMonitoringDate(event.runDate)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {data.labels.length > 0 ? (
        <>
          <SectionLabel>Feedback</SectionLabel>
          <div className="px-6">
            {data.labels.map((label, index) => (
              <FactRow
                key={`${label.value}-${index}`}
                label={label.value.replace(/_/g, " ").toLowerCase()}
                value={
                  <span className="text-[11px] text-muted-foreground">
                    {label.note || formatMonitoringTimestamp(label.createdAt)}
                  </span>
                }
              />
            ))}
          </div>
        </>
      ) : null}

      {relatedIncidents.length > 0 ? (
        <>
          <SectionLabel>Related alerts</SectionLabel>
          {relatedIncidents.map((related) => (
            <MonitoringRow
              key={related.incidentId}
              onClick={() => onOpenIncident(related.incidentId)}
            >
              <div className="flex items-center gap-3">
                <SeverityDot severity={related.severity} />
                <p className="min-w-0 flex-1 truncate text-sm text-general-foreground">
                  {related.headline ||
                    (related.metricKey
                      ? metricLabel(related.metricKey, goals)
                      : "Related alert")}
                </p>
                <LifecyclePill lifecycle={related.lifecycle} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </MonitoringRow>
          ))}
        </>
      ) : null}
    </div>
  );
}

/** The parent finding: its numbers, its diagnosis, and why the engine believes it. */
function FindingBlock({
  finding,
  goals,
  label,
  onOpenMetric,
}: {
  finding: MonitoringFinding;
  goals: MonitoringGoal[];
  label: string;
  onOpenMetric: (metricKey: string) => void;
}) {
  const byDimension = React.useMemo(
    () => groupByDimension(finding.contributors),
    [finding.contributors],
  );

  return (
    <>
      <SectionLabel
        action={
          <button
            type="button"
            onClick={() => onOpenMetric(finding.metricKey)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-general-primary hover:underline"
          >
            View chart
            <ChevronRight className="h-3 w-3" />
          </button>
        }
      >
        {label}
      </SectionLabel>

      <div className="px-6">
        <FactRow
          label="Metric"
          value={metricLabel(finding.metricKey, goals)}
        />
        <FactRow
          label="Direction"
          value={
            finding.direction === "UP"
              ? "Above expectation"
              : finding.direction === "DOWN"
                ? "Below expectation"
                : "—"
          }
        />
        <FactRow
          label="Observed"
          value={
            <MetricChange
              actual={finding.actual}
              expected={finding.expected}
              changePct={finding.pDeviation}
            />
          }
        />
        {unusualness(finding.zScore) ? (
          <FactRow label="How unusual" value={unusualness(finding.zScore)!} />
        ) : null}
        <FactRow
          label="Started"
          value={formatMonitoringDate(finding.startDate)}
        />
        {finding.confirmedOn ? (
          <FactRow
            label="Confirmed"
            value={formatMonitoringDate(finding.confirmedOn)}
          />
        ) : null}
        {finding.pattern ? (
          <FactRow
            label="Pattern"
            value={finding.pattern.replace(/_/g, " ").toLowerCase()}
          />
        ) : null}
        {finding.regime ? (
          <FactRow
            label="Regime"
            value={finding.regime.replace(/_/g, " ").toLowerCase()}
          />
        ) : null}
        {finding.classAtCreation ? (
          <FactRow
            label="Volume class"
            value={finding.classAtCreation.replace(/_/g, " ").toLowerCase()}
          />
        ) : null}
      </div>

      {byDimension.length > 0 ? (
        <>
          <SectionLabel>What moved</SectionLabel>
          {byDimension.map(([dimension, rows]) => (
            <div key={dimension} className="px-6 pb-2">
              <p className="py-1.5 text-[11px] text-muted-foreground">
                by {dimension.replace(/_/g, " ")}
              </p>
              {rows.map((row) => (
                <FactRow
                  key={`${dimension}-${row.key}`}
                  label={row.key}
                  value={
                    <span className="tabular-nums">
                      {formatCount(row.actual)} vs {formatCount(row.expected)}
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {shareOfChange(row.share_of_delta)}
                      </span>
                    </span>
                  }
                />
              ))}
            </div>
          ))}
        </>
      ) : null}

      {finding.contextClassification || finding.contextEvidence.length > 0 ? (
        <>
          <SectionLabel>Context</SectionLabel>
          <div className="px-6">
            {finding.contextClassification ? (
              <FactRow
                label="Compared with similar businesses"
                value={finding.contextClassification
                  .replace(/_/g, " ")
                  .toLowerCase()}
              />
            ) : null}
            {finding.contextEvidence.map((item, index) => (
              <FactRow
                key={index}
                label={
                  item.affects_attention
                    ? "Explains the change"
                    : "Happening at the time"
                }
                value={evidenceLabel(item)}
              />
            ))}
          </div>
        </>
      ) : null}

      {finding.checkCodes.length > 0 ? (
        <>
          <SectionLabel>What to check</SectionLabel>
          <div className="px-6">
            {finding.checkCodes.map((code) => (
              <FactRow
                key={code}
                label={code.replace(/_/g, " ").toLowerCase()}
                value=""
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

/**
 * Contributors arrive flattened with their dimension on each row, because the engine walks a
 * chain of dimensions and stores every level. Regrouping keeps each level readable.
 */
function groupByDimension(
  contributors: MonitoringContributor[],
): Array<[string, MonitoringContributor[]]> {
  const groups = new Map<string, MonitoringContributor[]>();

  contributors.forEach((contributor) => {
    const existing = groups.get(contributor.dimension);
    if (existing) existing.push(contributor);
    else groups.set(contributor.dimension, [contributor]);
  });

  return [...groups.entries()];
}

/** `share_of_delta` is a fraction of the total movement, not a change in its own right. */
function shareOfChange(share: number | null): string {
  if (share == null || !Number.isFinite(share)) return "";
  return `${Math.round(Math.abs(share) * 100)}% of the change`;
}
