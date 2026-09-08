"use client";

import * as React from "react";
import {
  AlertCircle,
  Calendar,
  Download,
  Info,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";
import { CampaignFormSheet } from "@/components/organisms/campaign-impact/CampaignFormSheet";
import { CampaignImpactReportSkeleton } from "@/components/organisms/campaign-impact/CampaignImpactReportSkeleton";
import { CampaignMessageBanner } from "@/components/organisms/campaign-impact/CampaignMessageBanner";
import { CampaignOverlapWarning } from "@/components/organisms/campaign-impact/CampaignOverlapWarning";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import {
  downloadCampaignImpactPdf,
  useCampaignEvent,
  useCampaignImpactReport,
  useCampaignMutations,
} from "@/hooks/use-campaign-impact";
import { useCan } from "@/hooks/use-permissions";
import {
  CAMPAIGN_STATUS,
  campaignApiError,
  campaignLocationOptions,
  formatCampaignDate,
  formatCampaignDateRange,
} from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import { CHART_SERIES_COLORS, type AnalyticsMetricKey } from "@/utils/analytics-metrics";
import type {
  CampaignImpactChartPoint,
  CampaignImpactPresentation,
  CampaignImpactSource,
  CampaignPresentationChange,
  CampaignPresentationMetric,
  CampaignPresentationTone,
  CampaignPresentationWindow,
  CampaignStatus,
} from "@/types/campaign-impact";

export const CAMPAIGN_REPORT_WIDTH_CLASS = "max-w-[920px]";

const TONE_TEXT: Record<CampaignPresentationTone, string> = {
  positive: "text-[#16a34a]",
  negative: "text-red-700",
  warning: "text-amber-800",
  info: "text-blue-700",
  neutral: "text-muted-foreground",
};

const KEY_METRIC_KEYS: Record<CampaignImpactSource["source"], readonly string[]> = {
  gsc: ["branded_clicks", "non_branded_clicks", "tracked_term_clicks"],
  ga4: ["sessions", "key_events", "revenue"],
  gbp: ["website_clicks", "call_clicks", "direction_requests"],
};

const REPORT_CHART_KEYS = ["sessions", "clicks", "goals"] as const satisfies readonly AnalyticsMetricKey[];
const REPORT_CHART_LABELS: Record<(typeof REPORT_CHART_KEYS)[number], string> = {
  sessions: "Sessions",
  clicks: "Clicks",
  goals: "Key Events",
};

const REPORT_CARD_METRICS: Array<{
  source: CampaignImpactSource["source"];
  metricKey: string;
  label: string;
}> = [
  { source: "ga4", metricKey: "sessions", label: "Sessions" },
  { source: "gsc", metricKey: "branded_clicks", label: "Branded Clicks" },
  { source: "gbp", metricKey: "website_clicks", label: "Website Clicks" },
  { source: "ga4", metricKey: "key_events", label: "Key Events" },
];

interface MetricRow extends CampaignPresentationMetric {
  sourceKey: CampaignImpactSource["source"];
  isKeyMetric: boolean;
}

interface CampaignImpactReportContentProps {
  businessId: string;
  campaignId: string;
  variant: "page" | "sheet";
  onBackToCampaigns?: () => void;
}

function PresentationChange({ change }: { change: CampaignPresentationChange }) {
  return <span className={TONE_TEXT[change.tone]}>{change.text}</span>;
}

function HintText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-[4px] underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="max-w-[320px] text-left">{children}</TooltipContent>
    </Tooltip>
  );
}

function windowRangeText(window: CampaignPresentationWindow | undefined): string | null {
  if (!window?.start) return null;
  return formatCampaignDateRange(window.start, window.end);
}

function comparisonCaption(presentation: CampaignImpactPresentation, windows: Map<string, CampaignPresentationWindow>): string {
  const primaryText = windowRangeText(windows.get("primary"));
  const baselineText = windowRangeText(windows.get("baseline"));
  if (!primaryText || !baselineText) return presentation.comparisonDescription;
  const periodCaptions = [
    `${presentation.primaryColumnLabel} ${primaryText}`,
    `Before ${baselineText}`,
  ];
  if (!presentation.hasPostPeriod) return periodCaptions.join(" · ");
  const afterText = windowRangeText(windows.get("post"));
  if (afterText) periodCaptions.push(`After ${afterText}`);
  return periodCaptions.join(" · ");
}

function ColumnLabel({ label, rangeText }: { label: string; rangeText: string | null }) {
  if (!rangeText) return <>{label}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{rangeText}</TooltipContent>
    </Tooltip>
  );
}

function highlightCaption(eventKind: "date_range" | "one_time", primaryColumnLabel: string): string {
  return eventKind === "one_time" ? "Event week vs the week before" : `${primaryColumnLabel} vs the window before`;
}

interface NormalizedChartPoint extends CampaignImpactChartPoint {
  sessionsNorm: number | null;
  clicksNorm: number | null;
  goalsNorm: number | null;
}

function normalizeSeries(points: CampaignImpactChartPoint[], key: "sessions" | "clicks" | "keyEvents"): Array<number | null> {
  const available = points.map(point => point[key]).filter((value): value is number => value != null);
  if (!available.length) return points.map(() => null);
  const min = Math.min(...available);
  const max = Math.max(...available);
  return points.map(point => {
    const value = point[key];
    if (value == null) return null;
    if (value === 0) return 0;
    if (max === min) return 50;
    const pad = (max - min) * 0.05 || 1;
    const low = Math.max(0, min - pad);
    return Math.max(0, Math.min(100, ((value - low) / (max + pad - low)) * 100));
  });
}

function normalizedChartPoints(points: CampaignImpactChartPoint[]): NormalizedChartPoint[] {
  const sessions = normalizeSeries(points, "sessions");
  const clicks = normalizeSeries(points, "clicks");
  const goals = normalizeSeries(points, "keyEvents");
  return points.map((point, index) => ({
    ...point,
    sessionsNorm: sessions[index],
    clicksNorm: clicks[index],
    goalsNorm: goals[index] == null ? null : goals[index] * 0.78,
  }));
}

function chartDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function CampaignWindowChart({
  points,
  primaryWindow,
  primaryLabel,
  eventKind,
  eventDate,
  isScheduled,
}: {
  points: CampaignImpactChartPoint[];
  primaryWindow: CampaignPresentationWindow | undefined;
  primaryLabel: string;
  eventKind: "date_range" | "one_time";
  eventDate: string;
  isScheduled: boolean;
}) {
  const availableKeys = REPORT_CHART_KEYS.filter(key => {
    const dataKey = key === "goals" ? "keyEvents" : key;
    return points.some(point => point[dataKey] != null);
  });
  const useNormalizedKeys = availableKeys.length > 1;
  const chartData = useNormalizedKeys ? normalizedChartPoints(points) : points;
  const availablePoints = points.filter(point => point.sessions != null || point.clicks != null || point.keyEvents != null);

  if (!availablePoints.length) {
    return (
      <div className="flex h-[246px] items-center justify-center text-sm text-muted-foreground">
        {isScheduled
          ? "This campaign has not started. Trend data will appear as measurements arrive."
          : "Trend will appear here when connected data is available."}
      </div>
    );
  }

  return (
    <div className="h-[246px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 18, right: 8, left: 8, bottom: 0 }}>
          <defs>
            {REPORT_CHART_KEYS.map(key => (
              <linearGradient key={key} id={`campaign-report-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_SERIES_COLORS[key]} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_SERIES_COLORS[key]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={chartDate}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickMargin={8}
            interval={Math.max(0, Math.floor(points.length / 8) - 1)}
          />
          <YAxis hide width={0} domain={useNormalizedKeys ? [0, 100] : ["auto", "auto"]} />
          {eventKind === "one_time" ? (
            <ReferenceLine
              x={eventDate}
              stroke="var(--general-primary)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              ifOverflow="extendDomain"
              label={{ value: "Event", position: "insideTopLeft", fill: "var(--general-primary)", fontSize: 10 }}
            />
          ) : primaryWindow?.start && primaryWindow.end ? (
            <ReferenceArea
              x1={primaryWindow.start}
              x2={primaryWindow.end}
              fill="var(--general-primary)"
              fillOpacity={0.12}
              ifOverflow="extendDomain"
              label={{ value: primaryLabel, position: "insideTop", fill: "var(--general-primary)", fontSize: 10 }}
            />
          ) : null}
          <RechartsTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 2", strokeOpacity: 0.5 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as CampaignImpactChartPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="min-w-[180px] rounded-lg border border-general-border bg-white px-3 py-2.5 shadow-md">
                  <p className="mb-2 text-sm font-medium text-foreground">{chartDate(point.date)}</p>
                  <div className="space-y-1.5 text-sm">
                    {point.sessions != null ? (
                      <p className="flex items-center justify-between gap-4 text-[#ea580c]"><span>Sessions</span><span className="font-medium text-foreground">{point.sessions.toLocaleString()}</span></p>
                    ) : null}
                    {point.clicks != null ? (
                      <p className="flex items-center justify-between gap-4 text-[#2563eb]"><span>Clicks</span><span className="font-medium text-foreground">{point.clicks.toLocaleString()}</span></p>
                    ) : null}
                    {point.keyEvents != null ? (
                      <p className="flex items-center justify-between gap-4 text-[#059669]"><span>Key Events</span><span className="font-medium text-foreground">{point.keyEvents.toLocaleString()}</span></p>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
          {availableKeys.includes("sessions") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "sessionsNorm" : "sessions"} stroke={CHART_SERIES_COLORS.sessions} fill="url(#campaign-report-sessions)" strokeWidth={1} connectNulls={false} name="Sessions" />
          ) : null}
          {availableKeys.includes("clicks") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "clicksNorm" : "clicks"} stroke={CHART_SERIES_COLORS.clicks} fill="url(#campaign-report-clicks)" strokeWidth={1} connectNulls={false} name="Clicks" />
          ) : null}
          {availableKeys.includes("goals") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "goalsNorm" : "keyEvents"} stroke={CHART_SERIES_COLORS.goals} fill="url(#campaign-report-goals)" strokeWidth={1} connectNulls={false} name="Key Events" />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CampaignChartLegend({
  points,
  eventKind,
}: {
  points: CampaignImpactChartPoint[];
  eventKind: "date_range" | "one_time";
}) {
  const availableKeys = REPORT_CHART_KEYS.filter(key => {
    const dataKey = key === "goals" ? "keyEvents" : key;
    return points.some(point => point[dataKey] != null);
  });

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-xs font-normal leading-[1.5] text-muted-foreground">
      <div className="flex items-center gap-1">
        {eventKind === "one_time" ? (
          <span className="w-4 border-t-2 border-dashed border-primary" aria-hidden="true" />
        ) : (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: "var(--general-primary)", opacity: 0.12 }}
            aria-hidden="true"
          />
        )}
        <span>{eventKind === "one_time" ? "Event Date" : "Campaign Window"}</span>
      </div>
      {availableKeys.map(key => (
        <div key={key} className="flex items-center gap-1">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: CHART_SERIES_COLORS[key] }}
            aria-hidden="true"
          />
          <span>{REPORT_CHART_LABELS[key]}</span>
        </div>
      ))}
    </div>
  );
}

function CampaignPhaseLabels({
  windows,
  primaryLabel,
  points,
}: {
  windows: Map<string, CampaignPresentationWindow>;
  primaryLabel: string;
  points: CampaignImpactChartPoint[];
}) {
  const phases = [
    { key: "baseline", pointPhase: "before", label: "Before" },
    { key: "primary", pointPhase: "during", label: primaryLabel },
    { key: "post", pointPhase: "after", label: "After" },
  ].filter(phase => windows.get(phase.key)?.days);

  return (
    <div className="flex overflow-hidden rounded-md border border-general-border text-[10px] font-medium tracking-[0.15px] text-muted-foreground">
      {phases.map(phase => {
        const window = windows.get(phase.key);
        const phasePoints = points.filter(point => point.phase === phase.pointPhase);
        const totals = {
          sessions: phasePoints.reduce((total, point) => total + (point.sessions || 0), 0),
          clicks: phasePoints.reduce((total, point) => total + (point.clicks || 0), 0),
          keyEvents: phasePoints.reduce((total, point) => total + (point.keyEvents || 0), 0),
        };
        const availability = {
          sessions: phasePoints.some(point => point.sessions != null),
          clicks: phasePoints.some(point => point.clicks != null),
          keyEvents: phasePoints.some(point => point.keyEvents != null),
        };

        return (
          <Tooltip key={phase.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "border-r border-general-border px-2 py-1.5 text-center transition-colors last:border-r-0 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  phase.key === "primary" && "bg-primary/[0.12] text-primary hover:bg-primary/15",
                )}
                style={{ flex: window?.days || 1 }}
              >
                {phase.label}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              hideArrow
              className="min-w-[200px] rounded-lg border border-general-border bg-white p-3 text-foreground shadow-md"
            >
              <p className="text-sm font-medium text-foreground">{phase.label}</p>
              <p className="mb-2 text-xs text-muted-foreground">{windowRangeText(window)}</p>
              <div className="space-y-1 text-xs">
                {availability.sessions ? <p className="flex justify-between gap-5" style={{ color: CHART_SERIES_COLORS.sessions }}><span>Sessions</span><span className="font-medium text-foreground">{totals.sessions.toLocaleString()}</span></p> : null}
                {availability.clicks ? <p className="flex justify-between gap-5" style={{ color: CHART_SERIES_COLORS.clicks }}><span>Clicks</span><span className="font-medium text-foreground">{totals.clicks.toLocaleString()}</span></p> : null}
                {availability.keyEvents ? <p className="flex justify-between gap-5" style={{ color: CHART_SERIES_COLORS.goals }}><span>Key Events</span><span className="font-medium text-foreground">{totals.keyEvents.toLocaleString()}</span></p> : null}
                {!availability.sessions && !availability.clicks && !availability.keyEvents ? <p className="text-muted-foreground">No chart data available</p> : null}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function CampaignImpactReportContent({
  businessId,
  campaignId,
  variant,
  onBackToCampaigns,
}: CampaignImpactReportContentProps) {
  const canManage = useCan("canGenerateReports");
  const { profileData } = useBusinessProfileById(businessId);
  const detail = useCampaignEvent(businessId, campaignId);
  const impact = useCampaignImpactReport(businessId, campaignId);
  const mutations = useCampaignMutations(businessId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [emails, setEmails] = React.useState<string[]>([]);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [showAllMetrics, setShowAllMetrics] = React.useState(false);
  const shareKey = React.useRef(crypto.randomUUID());
  const report = impact.data;
  const campaign = detail.data || report?.campaign;
  const locations = React.useMemo(() => campaignLocationOptions(profileData?.Locations), [profileData]);
  const snapshots = detail.data?.snapshots || [];

  const windows = React.useMemo(
    () => new Map((report?.presentation.windows || []).map(window => [window.key, window])),
    [report],
  );

  const metricRows = React.useMemo<MetricRow[]>(() => {
    if (!report) return [];
    const hidden = new Set<string>();
    for (const source of report.sources) {
      for (const metric of source.metrics) {
        if (metric.availability === "not_configured" || (metric.baseline == null && metric.primary == null)) {
          hidden.add(`${source.source}:${metric.key}`);
        }
      }
    }
    return report.presentation.sources.flatMap(source =>
      source.metrics
        .filter(metric => !hidden.has(`${source.key}:${metric.key}`))
        .map(metric => ({
          ...metric,
          sourceKey: source.key,
          isKeyMetric: (KEY_METRIC_KEYS[source.key] || []).includes(metric.key),
        })),
    );
  }, [report]);

  const keyMetricRows = React.useMemo(() => metricRows.filter(metric => metric.isKeyMetric), [metricRows]);
  const visibleMetricRows = showAllMetrics || !keyMetricRows.length ? metricRows : keyMetricRows;
  const hiddenMetricCount = metricRows.length - keyMetricRows.length;

  const reportCards = React.useMemo(() => REPORT_CARD_METRICS.map(card => {
    const source = report?.presentation.sources.find(item => item.key === card.source);
    const metric = source?.metrics.find(item => item.key === card.metricKey);
    const rawMetric = report?.sources.find(item => item.source === card.source)?.metrics.find(item => item.key === card.metricKey);
    return {
      ...card,
      metric,
      available: rawMetric?.primary != null,
      unavailableText: source?.message || source?.status.label || "Unavailable",
    };
  }), [report]);

  React.useEffect(() => {
    if (!report) return;
    captureCampaignImpactEvent("campaign_impact_loaded", { business_id: businessId, campaign_type: report.campaign.campaignType, event_kind: report.campaign.eventKind, status: report.status, has_overlap: report.contamination.length > 0, source_count: report.sources.length });
  }, [businessId, report]);

  async function download(snapshotId?: string) {
    if (!campaign) return;
    setDownloading(snapshotId || "current");
    try {
      const blob = await downloadCampaignImpactPdf(campaign.id, snapshotId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${campaign.name.replace(/[^a-z0-9_ -]/gi, "").slice(0, 80) || "campaign"}-impact.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      captureCampaignImpactEvent("campaign_pdf_downloaded", { business_id: businessId, campaign_type: campaign.campaignType, event_kind: campaign.eventKind, origin: "impact_report" });
      toast.success("Download started");
    } catch (error) {
      toast.error(campaignApiError(error, "The PDF could not be downloaded."));
    } finally {
      setDownloading(null);
    }
  }

  async function share() {
    if (!campaign || !emails.length) return;
    try {
      await mutations.share.mutateAsync({ id: campaign.id, emails, idempotencyKey: shareKey.current });
      captureCampaignImpactEvent("campaign_report_shared", { business_id: businessId, campaign_type: campaign.campaignType, event_kind: campaign.eventKind, origin: "impact_report" });
      toast.success("Campaign report shared");
      setShareOpen(false);
      setEmails([]);
      shareKey.current = crypto.randomUUID();
    } catch (error) {
      toast.error(campaignApiError(error, "The report could not be shared."));
    }
  }

  if (detail.isLoading || impact.isLoading) {
    return <CampaignImpactReportSkeleton variant={variant} />;
  }

  if (detail.isError || impact.isError || !campaign || !report) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-7 text-center">
        <AlertCircle className="size-9 text-destructive" />
        <h1 className="text-lg font-medium">Report could not be loaded</h1>
        <p className="text-sm text-muted-foreground">The campaign may have been removed, or a data source is temporarily unavailable.</p>
        <div className="flex gap-2">
          {variant === "page" && onBackToCampaigns ? (
            <Button variant="outline" onClick={onBackToCampaigns}>Campaigns</Button>
          ) : null}
          <Button onClick={() => { void detail.refetch(); void impact.refetch(); }}>
            <RefreshCw className="size-4" />Try again
          </Button>
        </div>
      </div>
    );
  }

  const presentation = report.presentation;
  const statusMeta = CAMPAIGN_STATUS[report.status as CampaignStatus];
  const locationLabels = (campaign.gbpLocationNames || []).map(name => locations.find(option => option.value === name)?.label || name);
  const dateLabel = campaign.eventKind === "one_time"
    ? formatCampaignDate(campaign.startDate)
    : formatCampaignDateRange(campaign.startDate, campaign.endDate);
  const typeDateLabel = `${presentation.campaignTypeLabel} · ${dateLabel}`;
  const hasPostPeriod = presentation.hasPostPeriod;
  const showStatusBanner = report.status === "scheduled" || report.status === "unavailable";

  return (
    <div className="flex w-full flex-col gap-6 bg-white py-9">
      <div className="flex items-start justify-between gap-4 px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.48px] text-foreground">{campaign.name}</h1>
            <CampaignOverlapWarning overlaps={report.contamination} context="report" primaryPeriodLabel={presentation.primaryColumnLabel} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="h-6 gap-1.5 rounded-lg border-0 bg-secondary px-2 text-[10px] font-medium tracking-[0.15px] text-muted-foreground">
              <Calendar className="size-3" />
              {typeDateLabel}
            </Badge>
            {statusMeta ? (
              <Badge variant="outline" className={cn("h-6 border-0 text-[10px] font-medium", statusMeta.className)}>
                {presentation.status.label}
              </Badge>
            ) : null}
          </div>
          {(presentation.details.spendText || campaign.trackedTerms.length || locationLabels.length || presentation.details.notes) ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {presentation.details.spendText ? <span>{presentation.details.spendText} spend</span> : null}
              {campaign.trackedTerms.length ? (
                <HintText label={`${campaign.trackedTerms.length} search${campaign.trackedTerms.length === 1 ? "" : "es"} tracked`}>{presentation.details.trackedTermsText}</HintText>
              ) : null}
              {locationLabels.length ? (
                <HintText label={`${locationLabels.length} location${locationLabels.length === 1 ? "" : "s"}`}>{locationLabels.join(", ")}</HintText>
              ) : null}
              {presentation.details.notes ? (
                <HintText label="Notes"><span className="whitespace-pre-wrap">{presentation.details.notes}</span></HintText>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button variant="secondary" className="h-9 rounded-lg" onClick={() => setEditOpen(true)} disabled={!canManage}>
            <Pencil className="size-3.5" />Edit
          </Button>
          <Button variant="secondary" className="h-9 rounded-lg" onClick={() => void download()} disabled={!canManage || Boolean(downloading)}>
            {downloading === "current" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}PDF
          </Button>
          <Button className="h-9 rounded-lg" onClick={() => { shareKey.current = crypto.randomUUID(); setShareOpen(true); }} disabled={!canManage}>
            <Mail className="size-3.5" />Share
          </Button>
        </div>
      </div>

      <div className="h-px w-full bg-general-border" />

      {showStatusBanner ? (
        <div className="px-6">
          <CampaignMessageBanner
            icon={Info}
            variant={report.status === "unavailable" ? "warning" : "info"}
            title={statusMeta.label}
            description={statusMeta.description}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map(card => (
          <div key={`${card.source}-${card.metricKey}`} className="flex min-h-[96px] min-w-0 flex-col justify-between gap-2 rounded-md border border-general-border p-3">
            <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
            <div>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <p className="text-2xl font-semibold tracking-[-0.48px] text-secondary-foreground">
                  {card.available && card.metric ? card.metric.primaryText : "—"}
                </p>
                {card.available && card.metric ? (
                  <span className={cn("text-[10px] font-medium tracking-[0.15px]", TONE_TEXT[card.metric.change.tone])}>
                    {card.metric.change.text}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[10px] tracking-[0.15px] text-muted-foreground" title={card.available ? undefined : card.unavailableText}>
                {card.available ? highlightCaption(campaign.eventKind, presentation.primaryColumnLabel) : card.unavailableText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {report.status !== "unavailable" ? (
        <div>
          <div className="h-px w-full bg-general-border" />
          <div className="flex flex-col gap-8 px-6 py-6">
            <div>
              <p className="text-base font-medium text-secondary-foreground">
                {hasPostPeriod ? "Before, During & After" : `Before & ${presentation.primaryColumnLabel}`}
              </p>
              <p className="mt-0.5 text-[10px] tracking-[0.15px] text-muted-foreground">
                {campaign.eventKind === "one_time"
                  ? "The dashed line marks the event date. The Impact period covers the seven days starting there."
                  : "The shaded band is the campaign window. Look for a shift that lines up with it."}
              </p>
            </div>
            <CampaignWindowChart
              points={report.chartSeries || []}
              primaryWindow={windows.get("primary")}
              primaryLabel={presentation.primaryColumnLabel}
              eventKind={campaign.eventKind}
              eventDate={campaign.startDate}
              isScheduled={report.status === "scheduled"}
            />
            <CampaignPhaseLabels
              windows={windows}
              primaryLabel={presentation.primaryColumnLabel}
              points={report.chartSeries || []}
            />
            <CampaignChartLegend points={report.chartSeries || []} eventKind={campaign.eventKind} />
          </div>
          <div className="h-px w-full bg-general-border" />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium text-secondary-foreground">Results</h2>
          <p className="text-xs tracking-[0.18px] text-muted-foreground">{comparisonCaption(presentation, windows)}</p>
        </div>

        {metricRows.length ? (
          <div className="overflow-x-auto">
            <table className={cn("w-full text-sm", hasPostPeriod ? "min-w-[880px]" : "min-w-[600px]")}>
              <thead>
                <tr className="border-b border-general-border text-xs font-medium tracking-[0.18px] text-muted-foreground">
                  <th className="w-[320px] pb-1.5 text-left font-medium">Metric</th>
                  <th className="pb-1.5 text-center font-medium"><ColumnLabel label="Before" rangeText={windowRangeText(windows.get("baseline"))} /></th>
                  <th className="pb-1.5 text-center font-medium"><ColumnLabel label={presentation.primaryColumnLabel} rangeText={windowRangeText(windows.get("primary"))} /></th>
                  {hasPostPeriod ? <th className="pb-1.5 text-center font-medium"><ColumnLabel label="After" rangeText={windowRangeText(windows.get("post"))} /></th> : null}
                  <th className="pb-1.5 text-center font-medium">{hasPostPeriod ? <ColumnLabel label="Lift During Campaign" rangeText="During compared with Before" /> : "Change"}</th>
                  {hasPostPeriod ? <th className="pb-1.5 text-center font-medium"><ColumnLabel label="Lift After Campaign" rangeText="After compared with During" /></th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleMetricRows.map(metric => (
                  <tr key={`${metric.sourceKey}-${metric.key}`} className="border-b border-general-border text-sm font-medium tracking-[0.07px]">
                    <td className="w-[320px] py-2 text-secondary-foreground">
                      {metric.label}
                    </td>
                    <td className="py-2 text-center tabular-nums text-secondary-foreground">{metric.baselineText}</td>
                    <td className="py-2 text-center tabular-nums text-secondary-foreground">{metric.primaryText}</td>
                    {hasPostPeriod ? <td className="py-2 text-center tabular-nums text-secondary-foreground">{metric.postText}</td> : null}
                    <td className="py-2 text-center"><PresentationChange change={metric.change} /></td>
                    {hasPostPeriod ? <td className="py-2 text-center"><PresentationChange change={metric.postChange ?? { text: "Unavailable", tone: "neutral" }} /></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-b border-general-border py-6 text-center text-sm text-muted-foreground">
            Results will appear here when connected data is available.
          </p>
        )}

        {hiddenMetricCount > 0 && keyMetricRows.length ? (
          <button
            type="button"
            className="flex w-full items-center justify-center border-b border-general-border bg-secondary py-2 text-sm font-medium tracking-[0.07px] text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={showAllMetrics}
            onClick={() => setShowAllMetrics(value => !value)}
          >
            {showAllMetrics ? "Show key metrics only" : `Show all ${metricRows.length} metrics`}
          </button>
        ) : null}

        {report.dataThrough ? (
          <p className="text-xs text-muted-foreground">Data through {formatCampaignDate(report.dataThrough)}</p>
        ) : null}
      </div>

      <CampaignFormSheet open={editOpen} onOpenChange={setEditOpen} businessId={businessId} locations={locations} campaign={campaign} onSaved={() => { void detail.refetch(); void impact.refetch(); }} />
      <Dialog open={shareOpen} onOpenChange={open => !mutations.share.isPending && setShareOpen(open)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-medium">Share campaign report</DialogTitle>
            <DialogDescription>Recipients receive a PDF copy of the report as it looks now.</DialogDescription>
          </DialogHeader>
          <div className="py-1"><MultiEmailInput value={emails} onChange={setEmails} disabled={mutations.share.isPending} /></div>
          {snapshots.length ? (
            <div className="overflow-hidden rounded-[8px] border border-general-border">
              <p className="border-b border-general-border bg-general-primary-foreground px-3 py-2 text-xs text-muted-foreground">
                Previously shared ({snapshots.length})
              </p>
              <div className="max-h-[180px] divide-y divide-general-border overflow-y-auto">
                {snapshots.map(snapshot => (
                  <div key={snapshot.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{snapshot.deliveryStatus === "sent" ? new Date(snapshot.sentAt || snapshot.createdAt).toLocaleDateString() : `Delivery ${snapshot.deliveryStatus}`}</p>
                      <p className="text-xs text-muted-foreground">{snapshot.recipients.length} recipient{snapshot.recipients.length === 1 ? "" : "s"}</p>
                    </div>
                    {snapshot.deliveryStatus === "sent" ? (
                      <Button variant="outline" size="sm" onClick={() => void download(snapshot.id)} disabled={downloading === snapshot.id}>
                        {downloading === snapshot.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}PDF
                      </Button>
                    ) : <Badge variant="outline" className="capitalize">{snapshot.deliveryStatus}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)} disabled={mutations.share.isPending}>Cancel</Button>
            <Button onClick={() => void share()} disabled={!emails.length || mutations.share.isPending}>
              {mutations.share.isPending ? <><Loader2 className="size-4 animate-spin" />Sending</> : <><Mail className="size-4" />Share report</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
