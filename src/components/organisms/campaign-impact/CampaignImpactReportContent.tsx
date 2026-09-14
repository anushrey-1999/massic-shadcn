"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  Calendar,
  Download,
  Eye,
  Info,
  Loader2,
  Mail,
  MousePointerClick,
  Pencil,
  RefreshCw,
  Target,
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
import { AnalyticsDisplayMenu } from "@/components/molecules/analytics/AnalyticsHeaderActions";
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
  gsc: ["total_impressions", "total_clicks", "branded_clicks", "non_branded_clicks", "tracked_term_clicks"],
  ga4: ["sessions", "key_events", "revenue"],
  gbp: ["website_clicks", "call_clicks", "direction_requests"],
};

const SOURCE_TAG_LABELS: Record<CampaignImpactSource["source"], string> = {
  gsc: "GSC",
  ga4: "GA4",
  gbp: "GBP",
};

const REPORT_CHART_KEYS = ["impressions", "clicks", "sessions", "goals"] as const satisfies readonly AnalyticsMetricKey[];
const REPORT_CHART_LABELS: Record<(typeof REPORT_CHART_KEYS)[number], string> = {
  impressions: "Impressions",
  sessions: "Sessions",
  clicks: "Clicks",
  goals: "Goals",
};

const REPORT_CARD_METRICS: Array<{
  source: CampaignImpactSource["source"];
  metricKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { source: "gsc", metricKey: "total_impressions", label: "Impressions", icon: Eye },
  { source: "gsc", metricKey: "total_clicks", label: "Clicks", icon: MousePointerClick },
  { source: "ga4", metricKey: "sessions", label: "Sessions", icon: Activity },
  { source: "ga4", metricKey: "key_events", label: "Goals", icon: Target },
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

interface NormalizedChartPoint extends CampaignImpactChartPoint {
  impressionsNorm: number | null;
  sessionsNorm: number | null;
  clicksNorm: number | null;
  goalsNorm: number | null;
}

function normalizeSeries(points: CampaignImpactChartPoint[], key: "impressions" | "sessions" | "clicks" | "keyEvents"): Array<number | null> {
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
  const impressions = normalizeSeries(points, "impressions");
  const sessions = normalizeSeries(points, "sessions");
  const clicks = normalizeSeries(points, "clicks");
  const goals = normalizeSeries(points, "keyEvents");
  return points.map((point, index) => ({
    ...point,
    impressionsNorm: impressions[index],
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
  visibleLines,
  onPhaseChange,
}: {
  points: CampaignImpactChartPoint[];
  primaryWindow: CampaignPresentationWindow | undefined;
  primaryLabel: string;
  eventKind: "date_range" | "one_time";
  eventDate: string;
  isScheduled: boolean;
  visibleLines: Record<string, boolean>;
  onPhaseChange: (phase: CampaignImpactChartPoint["phase"]) => void;
}) {
  const availableKeys = REPORT_CHART_KEYS.filter(key => {
    const dataKey = key === "goals" ? "keyEvents" : key;
    return visibleLines[key] && points.some(point => point[dataKey] != null);
  });
  const useNormalizedKeys = availableKeys.length > 1;
  const chartData = useNormalizedKeys ? normalizedChartPoints(points) : points;
  const availablePoints = points.filter(point => point.impressions != null || point.sessions != null || point.clicks != null || point.keyEvents != null);

  if (!availablePoints.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        {isScheduled
          ? "This campaign has not started. Trend data will appear as measurements arrive."
          : "Trend will appear here when connected data is available."}
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          onMouseMove={state => {
            const point = state?.activePayload?.[0]?.payload as CampaignImpactChartPoint | undefined;
            if (point) onPhaseChange(point.phase);
          }}
        >
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
                    {visibleLines.impressions && point.impressions != null ? (
                      <p className="flex items-center justify-between gap-4" style={{ color: CHART_SERIES_COLORS.impressions }}><span>Impressions</span><span className="font-medium text-foreground">{point.impressions.toLocaleString()}</span></p>
                    ) : null}
                    {visibleLines.clicks && point.clicks != null ? (
                      <p className="flex items-center justify-between gap-4" style={{ color: CHART_SERIES_COLORS.clicks }}><span>Clicks</span><span className="font-medium text-foreground">{point.clicks.toLocaleString()}</span></p>
                    ) : null}
                    {visibleLines.sessions && point.sessions != null ? (
                      <p className="flex items-center justify-between gap-4" style={{ color: CHART_SERIES_COLORS.sessions }}><span>Sessions</span><span className="font-medium text-foreground">{point.sessions.toLocaleString()}</span></p>
                    ) : null}
                    {visibleLines.goals && point.keyEvents != null ? (
                      <p className="flex items-center justify-between gap-4" style={{ color: CHART_SERIES_COLORS.goals }}><span>Goals</span><span className="font-medium text-foreground">{point.keyEvents.toLocaleString()}</span></p>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
          {availableKeys.includes("impressions") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "impressionsNorm" : "impressions"} stroke={CHART_SERIES_COLORS.impressions} fill="url(#campaign-report-impressions)" strokeWidth={1} connectNulls={false} name="Impressions" />
          ) : null}
          {availableKeys.includes("sessions") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "sessionsNorm" : "sessions"} stroke={CHART_SERIES_COLORS.sessions} fill="url(#campaign-report-sessions)" strokeWidth={1} connectNulls={false} name="Sessions" />
          ) : null}
          {availableKeys.includes("clicks") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "clicksNorm" : "clicks"} stroke={CHART_SERIES_COLORS.clicks} fill="url(#campaign-report-clicks)" strokeWidth={1} connectNulls={false} name="Clicks" />
          ) : null}
          {availableKeys.includes("goals") ? (
            <Area type="linear" dataKey={useNormalizedKeys ? "goalsNorm" : "keyEvents"} stroke={CHART_SERIES_COLORS.goals} fill="url(#campaign-report-goals)" strokeWidth={1} connectNulls={false} name="Goals" />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CampaignPhaseMetrics({
  windows,
  primaryLabel,
  points,
  activeKey,
}: {
  windows: Map<string, CampaignPresentationWindow>;
  primaryLabel: string;
  points: CampaignImpactChartPoint[];
  activeKey: string;
}) {
  const phases = [
    { key: "baseline", pointPhase: "before", label: "Before" },
    { key: "primary", pointPhase: "during", label: primaryLabel },
    { key: "post", pointPhase: "after", label: "After" },
  ].filter(phase => windows.get(phase.key)?.days).map(phase => {
    const window = windows.get(phase.key);
    const phasePoints = points.filter(point => point.phase === phase.pointPhase);
    return {
      ...phase,
      window,
      metrics: [
        { key: "impressions", label: "Impressions", color: CHART_SERIES_COLORS.impressions, values: phasePoints.map(point => point.impressions) },
        { key: "clicks", label: "Clicks", color: CHART_SERIES_COLORS.clicks, values: phasePoints.map(point => point.clicks) },
        { key: "sessions", label: "Sessions", color: CHART_SERIES_COLORS.sessions, values: phasePoints.map(point => point.sessions) },
        { key: "goals", label: "Goals", color: CHART_SERIES_COLORS.goals, values: phasePoints.map(point => point.keyEvents) },
      ],
    };
  });
  const activePhase = phases.find(phase => phase.key === activeKey) || phases[0];

  if (!activePhase) return null;

  return (
    <div className="overflow-x-auto rounded-[6px] border border-general-border bg-general-primary-foreground">
      <div className="grid min-w-[580px] grid-cols-[136px_repeat(4,minmax(0,1fr))] items-center">
        <div className="border-r border-general-border px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Period metrics</p>
          <p className="mt-0.5 text-xs font-medium text-foreground">{activePhase.label}</p>
        </div>
        {activePhase.metrics.map(metric => {
          const available = metric.values.some(value => value != null);
          const total = metric.values.reduce<number>((sum, value) => sum + (value || 0), 0);
          return (
            <div key={metric.key} className="min-w-0 border-r border-general-border px-3 py-2 last:border-r-0">
              <p className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: metric.color }} aria-hidden="true" />
                {metric.label}
              </p>
              <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">{available ? total.toLocaleString() : "—"}</p>
            </div>
          );
        })}
      </div>
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
  const [activePhaseKey, setActivePhaseKey] = React.useState("primary");
  const [visibleLines, setVisibleLines] = React.useState<Record<AnalyticsMetricKey, boolean>>({
    impressions: true,
    clicks: true,
    sessions: true,
    goals: true,
  });
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
          <h1 className="text-2xl font-medium tracking-[-0.48px] text-foreground">{campaign.name}</h1>
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
            <CampaignOverlapWarning overlaps={report.contamination} context="report" primaryPeriodLabel={presentation.primaryColumnLabel} />
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
        {reportCards.map(card => {
          const MetricIcon = card.icon;
          return (
          <div key={`${card.source}-${card.metricKey}`} className="flex min-h-[72px] min-w-0 flex-col justify-between gap-1 rounded-md border border-general-border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MetricIcon className="size-3.5 shrink-0" strokeWidth={1.5} />
              <p className="truncate text-xs font-medium">{card.label}</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-2xl font-medium tracking-[-0.48px] text-secondary-foreground" title={card.available ? undefined : card.unavailableText}>
                {card.available && card.metric ? card.metric.primaryText : "—"}
              </p>
              {card.available && card.metric ? (
                <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tracking-[0.07px]", TONE_TEXT[card.metric.change.tone])}>
                  {card.metric.change.text}
                </span>
              ) : null}
            </div>
          </div>
          );
        })}
      </div>

      {report.status !== "unavailable" ? (
        <div>
          <div className="h-px w-full bg-general-border" />
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-medium text-secondary-foreground">Performance</p>
                <p className="mt-0.5 text-[10px] tracking-[0.15px] text-muted-foreground">
                  {campaign.eventKind === "one_time"
                    ? "The dashed line marks the event date."
                    : "The shaded band marks the campaign window."}
                </p>
              </div>
              <AnalyticsDisplayMenu
                metricKeys={REPORT_CHART_KEYS}
                metricLabels={REPORT_CHART_LABELS}
                visibleLines={visibleLines}
                onLineToggle={(key, checked) => setVisibleLines(current => ({ ...current, [key]: checked }))}
                triggerClassName="min-h-8 gap-1.5 px-3 py-1.5"
              />
            </div>
            <div className="space-y-1.5">
              <CampaignWindowChart
                points={report.chartSeries || []}
                primaryWindow={windows.get("primary")}
                primaryLabel={presentation.primaryColumnLabel}
                eventKind={campaign.eventKind}
                eventDate={campaign.startDate}
                isScheduled={report.status === "scheduled"}
                visibleLines={visibleLines}
                onPhaseChange={phase => setActivePhaseKey(
                  phase === "before" ? "baseline" : phase === "during" ? "primary" : "post",
                )}
              />
              <CampaignPhaseMetrics
                windows={windows}
                primaryLabel={presentation.primaryColumnLabel}
                points={report.chartSeries || []}
                activeKey={activePhaseKey}
              />
            </div>
          </div>
          <div className="h-px w-full bg-general-border" />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 px-6">
        <h2 className="text-base font-medium text-secondary-foreground">Results</h2>

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
                      <div className="flex items-center gap-2">
                        <span>{metric.label}</span>
                        <span className="rounded border border-general-border px-1 text-[10px] font-medium leading-4 tracking-wide text-muted-foreground">
                          {SOURCE_TAG_LABELS[metric.sourceKey]}
                        </span>
                      </div>
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
