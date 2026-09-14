"use client";

import {
  Eye,
  MousePointerClick,
  Target,
  BarChart3,
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
  CircleCheckBig,
  AlertTriangle,
  Flag,
  Maximize2,
  CalendarClock,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/molecules/analytics/MetricCard";
import { AlertBar } from "@/components/molecules/analytics/AlertBar";
import { AnomaliesSheet } from "@/components/molecules/analytics/AnomaliesSheet";
import { CampaignImpactReportSheet } from "@/components/organisms/campaign-impact/CampaignImpactReportSheet";
import { FunnelChart } from "@/components/molecules/analytics/FunnelChart";
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend";
import { ChartOverlayToggle } from "@/components/molecules/analytics/ChartOverlayToggle";
import { BrandedKeywordsModal } from "@/components/molecules/analytics/BrandedKeywordsModal";
import { NoGSCMetricsSelected } from "@/components/molecules/analytics/NoGSCMetricsSelected";
import { CHART_SERIES_COLORS } from "@/utils/analytics-metrics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  useGSCAnalytics,
  type TimePeriodValue,
  type GA4TrafficScope,
} from "@/hooks/use-gsc-analytics";
import { useGapAnalysis } from "@/hooks/use-gap-analysis";
import { useBrandedNonBranded } from "@/hooks/use-branded-nonbranded";
import { useGoalAnalysis } from "@/hooks/use-goal-analysis";
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis";
import { useAnalyticsAnomalyDates } from "@/hooks/use-analytics-anomaly-dates";
import { useCampaignEvents } from "@/hooks/use-campaign-impact";
import type {
  AnalyticsAnomalyDate,
  AnalyticsAnomalyMetricPayload,
  AnalyticsAnomalyTier,
} from "@/hooks/use-analytics-anomaly-dates";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import type { DeepdiveApiFilter } from "@/hooks/use-organic-deepdive-filters";
import {
  getAvailableAnalyticsGroupings,
  getFallbackAnalyticsGrouping,
  groupAnalyticsChartData,
  type AnalyticsGroupBy,
  type GroupedAnalyticsChartPoint,
} from "@/utils/analytics-chart-grouping";
import {
  groupConsecutiveAnomalyDays,
  formatAnomalyBandTitle,
  type AnomalyDay,
  type AnomalyRun,
} from "@/utils/analytics-anomaly-bands";
import { AnomalyBandShape } from "@/components/molecules/analytics/AnomalyBand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CAMPAIGN_STATUS } from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";

const METRIC_ICONS: Record<string, React.ReactNode> = {
  "topic-coverage": <Target className="h-5 w-5" />,
  "visibility-relevance": <Eye className="h-5 w-5" />,
  "engagement-relevance": <MousePointerClick className="h-5 w-5" />,
  branded: <Star className="h-5 w-5" />,
  "non-branded": <TrendingUp className="h-5 w-5" />,
};
const CHART_METRIC_KEYS = ["impressions", "clicks", "sessions", "goals"] as const;
type AnomalySheetTab = "goals" | "traffic";
type AnomalyMetricKey = "goal" | "traffic";


function shiftDateKey(dateKey: string | null | undefined, days: number): string | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const isoDay = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDay) return isoDay[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function formatOverlayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatOverlayDateRange(
  startDate: string,
  endDate?: string | null,
  isRange = false
): string {
  const start = formatOverlayDate(startDate);
  if (!isRange) return start;
  if (!endDate) return `${start} –`;
  const end = formatOverlayDate(endDate);
  return start === end ? start : `${start} – ${end}`;
}

type TrackingOverlayMarker = {
  key: string;
  x: string;
  title: string;
  name: string;
  id: string | null;
  kind: "campaign" | "onboarded";
};

const OVERLAY_STACK_MAX = 4;
const OVERLAY_LABEL_GAP_PERCENT = 12;
const OVERLAY_LABEL_ROW_PX = 14;
const OVERLAY_LINE_NUDGE_PX = 3;
const OVERLAY_LABEL_CLASS =
  "absolute top-1 max-w-40 truncate rounded-[4px] bg-white/90 px-1 py-px text-[10px] leading-[1.5] font-medium whitespace-nowrap text-primary shadow-xs ring-1 ring-border group-hover:bg-white";

function TrackingOverlayHit({
  title,
  clickable,
  className,
  style,
  onClick,
  children,
}: {
  title: string;
  clickable: boolean;
  className: string;
  style: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const hitClassName = cn(
    className,
    "group cursor-pointer hover:z-20",
    clickable ? "hover:border-primary" : "hover:border-primary/80"
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {clickable ? (
          <button
            type="button"
            className={hitClassName}
            style={style}
            aria-label={title}
            onClick={onClick}
          >
            {children}
          </button>
        ) : (
          <div
            className={hitClassName}
            style={style}
            aria-label={title}
            role="img"
          >
            {children}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[320px] whitespace-normal break-words px-2 py-1 text-left text-xs font-normal">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

/** Lowest label row that does not collide with a nearby overlay already placed. */
function assignProximityStacks<T extends { left: number }>(
  items: T[],
  minGapPercent = OVERLAY_LABEL_GAP_PERCENT,
  maxStack = OVERLAY_STACK_MAX
): Array<T & { stack: number }> {
  const sorted = [...items].sort((a, b) => a.left - b.left);
  const placed: Array<{ left: number; stack: number }> = [];

  return sorted.map((item) => {
    const used = new Set(
      placed
        .filter((other) => Math.abs(other.left - item.left) < minGapPercent)
        .map((other) => other.stack)
    );
    let stack = 0;
    while (used.has(stack) && stack < maxStack - 1) {
      stack += 1;
    }
    placed.push({ left: item.left, stack });
    return { ...item, stack };
  });
}

function getMetricPayload(
  item: AnalyticsAnomalyDate | undefined,
  metric: AnomalyMetricKey
): AnalyticsAnomalyMetricPayload | null {
  if (!item?.analysisPayload) return null;
  return metric === "goal"
    ? item.analysisPayload.goal || null
    : item.analysisPayload.traffic || null;
}

function getWeeklyTier(
  item: AnalyticsAnomalyDate | undefined,
  metric: AnomalyMetricKey
): AnalyticsAnomalyTier {
  if (!item) return "normal";

  const payloadTier = getMetricPayload(item, metric)?.weeklyTier;
  if (payloadTier) return payloadTier;

  return metric === "goal"
    ? item.hasGoalAnomaly ? "anomaly" : "normal"
    : item.hasTrafficAnomaly ? "anomaly" : "normal";
}

function getRecordDailyPeaks(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const detection = (value as { detection?: { daily_peaks?: unknown } }).detection;
  return Array.isArray(detection?.daily_peaks) ? detection.daily_peaks : [];
}

function getMetricDailyPeaks(payload: AnalyticsAnomalyMetricPayload | null) {
  const candidates = [
    ...(payload?.dailyPeakForDate ? [payload.dailyPeakForDate] : []),
    ...(payload?.dailyPeaks || []),
    ...((payload?.cards || []).flatMap((card) => getRecordDailyPeaks(card))),
    ...getRecordDailyPeaks(payload?.card),
  ];
  const byDate = new Map<string, { date: string; tier?: AnalyticsAnomalyTier }>();

  for (const peak of candidates) {
    if (!peak || typeof peak !== "object") continue;
    const typedPeak = peak as { date?: unknown; tier?: unknown };
    if (typeof typedPeak.date !== "string") continue;

    const tier = typedPeak.tier === "anomaly" || typedPeak.tier === "candidate" || typedPeak.tier === "normal"
      ? typedPeak.tier
      : undefined;
    const existing = byDate.get(typedPeak.date);
    if (!existing || existing.tier !== "anomaly") {
      byDate.set(typedPeak.date, { date: typedPeak.date, tier });
    }
  }

  return [...byDate.values()];
}

function buildAnomalyDays(
  anomalyDates: AnalyticsAnomalyDate[],
  metric: AnomalyMetricKey
): AnomalyDay[] {
  const dailyPeakDateMap = new Map<string, { tier?: AnalyticsAnomalyTier; asOfDate: string }>();
  const anomalyDayMap = new Map<string, AnomalyDay>();

  for (const item of [...anomalyDates].sort((a, b) => a.date.localeCompare(b.date))) {
    if (getWeeklyTier(item, metric) !== "anomaly") continue;

    for (const peak of getMetricDailyPeaks(getMetricPayload(item, metric))) {
      if (!peak.tier) continue;
      const existing = dailyPeakDateMap.get(peak.date);
      if (!existing || existing.tier !== "anomaly") {
        dailyPeakDateMap.set(peak.date, { tier: peak.tier, asOfDate: item.date });
      }
    }
  }

  for (const [date, peak] of [...dailyPeakDateMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (peak.tier !== "anomaly") continue;
    anomalyDayMap.set(date, { date, asOfDate: peak.asOfDate });
  }

  for (const item of [...anomalyDates].sort((a, b) => a.date.localeCompare(b.date))) {
    if (dailyPeakDateMap.get(item.date)?.tier === "anomaly") continue;

    const weeklyTier = getWeeklyTier(item, metric);
    if (weeklyTier !== "anomaly") continue;

    anomalyDayMap.set(item.date, { date: item.date, asOfDate: item.date });
  }

  return [...anomalyDayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function AnomalyCircleMarker(props: {
  cx?: number | string;
  cy?: number | string;
  fill?: string;
  stroke?: string;
  onClick?: () => void;
}) {
  const x = Number(props.cx);
  const y = Number(props.cy);
  const color = props.fill || props.stroke || CHART_SERIES_COLORS.goals;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return <g />;

  return (
    <g className="cursor-pointer" onClick={props.onClick} pointerEvents="all">
      <circle cx={x} cy={y} r={8} fill={color} opacity={0.12} />
      <circle cx={x} cy={y} r={4.25} fill="#ffffff" opacity={0.9} />
      <circle cx={x} cy={y} r={3.25} fill={color} />
    </g>
  );
}

export interface OrganicPerformanceSectionProps {
  period?: TimePeriodValue;
  visibleLines?: Record<string, boolean>;
  onLegendToggle?: (key: string, checked: boolean) => void;
  filters?: DeepdiveApiFilter[];
  funnelVariant?: "default" | "sessions-goals";
  ga4TrafficScope?: GA4TrafficScope;
  groupBy?: AnalyticsGroupBy;
  onAvailableGroupingsChange?: (available: AnalyticsGroupBy[]) => void;
  /** When true, anomaly detection API call is skipped. */
  isIngestionActive?: boolean;
}

export function OrganicPerformanceSection({
  period = "3 months",
  visibleLines: visibleLinesProp,
  onLegendToggle: onLegendToggleProp,
  filters = [],
  funnelVariant = "default",
  ga4TrafficScope = "organic",
  groupBy = "day",
  onAvailableGroupingsChange,
  isIngestionActive = false,
}: OrganicPerformanceSectionProps) {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessUniqueId, website, businessName, onboardedDateKey } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return {
        businessUniqueId: null,
        website: null,
        businessName: "",
        onboardedDateKey: null as string | null,
      };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
      businessName: profile?.Name || profile?.DisplayName || "",
      onboardedDateKey: toDateKey(profile?.CreatedDateTime),
    };
  }, [pathname, profiles]);

  const {
    chartData,
    rawCurrentChartData,
    chartRanges,
    chartConfig,
    chartLegendItems,
    funnelChartItems,
    hasFunnelData,
    loadingState,
    hasData,
  } = useGSCAnalytics(businessUniqueId, website, period, filters, ga4TrafficScope);

  const {
    metricCards,
    isLoading: isLoadingMetrics,
    hasData: hasMetricsData,
    status: metricsStatus,
    statusMessage: metricsStatusMessage,
  } = useGapAnalysis(businessUniqueId);

  const {
    brandedCard,
    nonBrandedCard,
    status: brandedStatus,
    statusMessage: brandedStatusMessage,
    isLoading: isLoadingBranded,
  } = useBrandedNonBranded(businessUniqueId, website, period);

  const {
    goalData,
    rawData: goalRawData,
    criticalCount,
    warningCount,
    positiveCount,
    isLoading: isLoadingGoals,
    error: goalError,
  } = useGoalAnalysis(businessUniqueId, businessName, null, !isIngestionActive);

  const {
    trafficData,
    isLoading: isLoadingTraffic,
    error: trafficError,
    hasAnomaly: hasTrafficAnomaly,
  } = useTrafficAnalysis(businessUniqueId, businessName, null, !isIngestionActive);

  const [anomaliesSheetOpen, setAnomaliesSheetOpen] = useState(false);
  const [anomaliesSheetTab, setAnomaliesSheetTab] = useState<AnomalySheetTab>("goals");
  const [anomaliesSheetDate, setAnomaliesSheetDate] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [brandedKeywordsModalOpen, setBrandedKeywordsModalOpen] = useState(false);
  // Overlays are opt-in per chart, so their data is only fetched once switched on.
  const [anomalyHighlightsOn, setAnomalyHighlightsOn] = useState(false);
  const [trackingOverlaysOn, setTrackingOverlaysOn] = useState(false);
  const showAnomalyHighlights = anomalyHighlightsOn && !isIngestionActive;
  const showTrackingOverlays = trackingOverlaysOn;

  const [visibleLinesLocal, setVisibleLinesLocal] = useState<
    Record<string, boolean>
  >({
    impressions: true,
    clicks: true,
    sessions: true,
    goals: true,
  });

  const visibleLines =
    visibleLinesProp !== undefined ? visibleLinesProp : visibleLinesLocal;

  const visibleCount = CHART_METRIC_KEYS
    .map((key) => visibleLines[key])
    .filter(Boolean).length;
  const singleMetricMode = visibleCount === 1;
  const hasGscMetricSelected = visibleLines.impressions || visibleLines.clicks;
  const hasActiveQueryFilter = filters.some((filter) => filter.dimension === "query");
  const shouldShowNoGscMetricsState = hasActiveQueryFilter && !hasGscMetricSelected;
  const availableGroupings = useMemo(
    () =>
      getAvailableAnalyticsGroupings(
        chartRanges.currentStart,
        chartRanges.currentEnd
      ),
    [chartRanges.currentEnd, chartRanges.currentStart]
  );
  const effectiveGroupBy = useMemo(
    () => getFallbackAnalyticsGrouping(groupBy, availableGroupings),
    [availableGroupings, groupBy]
  );
  const groupedChartData = useMemo<GroupedAnalyticsChartPoint[]>(
    () =>
      groupAnalyticsChartData(
        rawCurrentChartData,
        effectiveGroupBy,
        chartRanges.currentStart,
        chartRanges.currentEnd
      ),
    [
      chartRanges.currentEnd,
      chartRanges.currentStart,
      effectiveGroupBy,
      rawCurrentChartData,
    ]
  );
  const normalizedGroupedChartData = useMemo(() => {
    if (groupedChartData.length === 0) return []

    const impressionsValues = groupedChartData.map((d) => d.impressions || 0)
    const clicksValues = groupedChartData.map((d) => d.clicks || 0)
    const sessionsValues = groupedChartData.map((d) => d.sessions || 0)
    const goalsValues = groupedChartData.map((d) => d.goals || 0)

    const minImpressions = Math.min(...impressionsValues)
    const maxImpressions = Math.max(...impressionsValues)
    const minClicks = Math.min(...clicksValues)
    const maxClicks = Math.max(...clicksValues)
    const minSessions = Math.min(...sessionsValues)
    const maxSessions = Math.max(...sessionsValues)
    const minGoals = Math.min(...goalsValues)
    const maxGoals = Math.max(...goalsValues)

    const normalizeToZeroHundred = (value: number, min: number, max: number): number => {
      const numericValue = Number(value) || 0
      if (numericValue === 0) return 0
      if (max === min) return 50
      const pad = (max - min) * 0.05 || 1
      const lo = Math.max(0, min - pad)
      const hi = max + pad
      const normalized = (numericValue - lo) / (hi - lo)
      return Math.max(0, Math.min(100, normalized * 100))
    }

    const goalsMaxNorm = 78
    return groupedChartData.map((point) => {
      const goalsNormRaw = normalizeToZeroHundred(point.goals || 0, minGoals, maxGoals)
      return {
        ...point,
        impressionsNorm: normalizeToZeroHundred(point.impressions, minImpressions, maxImpressions),
        clicksNorm: normalizeToZeroHundred(point.clicks, minClicks, maxClicks),
        sessionsNorm: normalizeToZeroHundred(point.sessions || 0, minSessions, maxSessions),
        goalsNorm: (goalsNormRaw / 100) * goalsMaxNorm,
      }
    })
  }, [groupedChartData])

  const useNormalizedKeys = normalizedGroupedChartData.length > 0 && !singleMetricMode;
  const chartDataToRender = useNormalizedKeys ? normalizedGroupedChartData : groupedChartData;
  const anomalyDatesFrom = useMemo(
    () => shiftDateKey(chartRanges.currentStart, -1),
    [chartRanges.currentStart]
  );
  const {
    anomalyDates,
    isLoading: isLoadingAnomalyDates,
  } = useAnalyticsAnomalyDates(
    businessUniqueId,
    anomalyDatesFrom,
    chartRanges.currentEnd,
    showAnomalyHighlights && !loadingState.chart && Boolean(anomalyDatesFrom && chartRanges.currentEnd)
  );
  const campaignOverlays = useCampaignEvents(
    businessUniqueId || "",
    {
      ...(chartRanges.currentStart ? { from: chartRanges.currentStart } : {}),
      ...(chartRanges.currentEnd ? { to: chartRanges.currentEnd } : {}),
    },
    showTrackingOverlays && Boolean(chartRanges.currentStart && chartRanges.currentEnd)
  );

  const handleAnomalyHighlightsToggle = useCallback((enabled: boolean) => {
    setAnomalyHighlightsOn(enabled);
  }, []);

  const handleTrackingOverlaysToggle = useCallback(
    (enabled: boolean) => {
      setTrackingOverlaysOn(enabled);
      captureCampaignImpactEvent("campaign_overlay_toggled", {
        business_id: businessUniqueId || undefined,
        enabled,
        origin: "analytics_toolbar",
      });
    },
    [businessUniqueId]
  );

  const singleMetricYDomain = useMemo(() => {
    if (!singleMetricMode || groupedChartData.length === 0) return undefined;
    const key = CHART_METRIC_KEYS.find((metricKey) => visibleLines[metricKey]) ?? "impressions";
    const values = groupedChartData.map((d) => Number(d[key as keyof typeof d]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.05 || 1;
    return [Math.max(0, min - pad), max + pad] as [number, number];
  }, [groupedChartData, singleMetricMode, visibleLines]);

  const handleLegendToggle = useCallback(
    (key: string, checked: boolean) => {
      if (onLegendToggleProp) {
        onLegendToggleProp(key, checked);
        return;
      }
      setVisibleLinesLocal((prev) => {
        const checkedCount = Object.values(prev).filter(Boolean).length;
        if (!checked && checkedCount <= 1) return prev;
        return { ...prev, [key]: checked };
      });
    },
    [onLegendToggleProp]
  );

  const [graphFullScreen, setGraphFullScreen] = useState(false);

  useEffect(() => {
    onAvailableGroupingsChange?.(availableGroupings);
  }, [availableGroupings, onAvailableGroupingsChange]);

  const xAxisTicks12Months = useMemo(() => {
    if (period !== "12 months" || effectiveGroupBy !== "day" || groupedChartData.length === 0)
      return undefined;
    const ticks: string[] = [];
    let lastMonth = "";
    for (const d of groupedChartData) {
      const month = d.date.split(" ")[0];
      if (month !== lastMonth) {
        lastMonth = month;
        ticks.push(d.bucketKey);
      }
    }
    return ticks.length > 0 ? ticks : undefined;
  }, [effectiveGroupBy, groupedChartData, period]);

  const xAxisTickLabels = useMemo(() => {
    return new Map(chartDataToRender.map((point) => [point.bucketKey, point.date]));
  }, [chartDataToRender]);

  const trackingOverlayData = useMemo(() => {
    if (!showTrackingOverlays || chartDataToRender.length === 0) return { bands: [], markers: [] };
    const firstPoint = chartDataToRender[0];
    const lastPoint = chartDataToRender[chartDataToRender.length - 1];
    const firstDate = firstPoint.bucketStart || firstPoint.dateKey;
    const lastDate = lastPoint.bucketEnd || lastPoint.dateKey;
    if (!firstDate || !lastDate) return { bands: [], markers: [] };
    const findBucketKey = (date: string, clamp = true) => {
      if (clamp) {
        if (date <= firstDate) return firstPoint.bucketKey;
        if (date >= lastDate) return lastPoint.bucketKey;
      } else if (date < firstDate || date > lastDate) {
        return null;
      }
      const point = chartDataToRender.find(item => {
        const start = item.bucketStart || item.dateKey;
        const end = item.bucketEnd || item.dateKey;
        return start && end && date >= start && date <= end;
      });
      return point?.bucketKey || null;
    };
    const bands: Array<{ key: string; x1: string; x2: string; title: string; name: string; id: string }> = [];
    const markers: TrackingOverlayMarker[] = [];

    if (onboardedDateKey) {
      const x = findBucketKey(onboardedDateKey, false);
      if (x) {
        markers.push({
          key: "massic-onboarded",
          x,
          title: `Onboarded · ${formatOverlayDate(onboardedDateKey)}`,
          name: "Onboarded",
          id: null,
          kind: "onboarded",
        });
      }
    }

    for (const campaign of campaignOverlays.data || []) {
      const statusKey = campaign.status || "collecting_data";
      const title = `${campaign.name} · ${formatOverlayDateRange(
        campaign.startDate,
        campaign.endDate,
        campaign.eventKind === "date_range"
      )}`;
      const isScheduledStartMarker = campaign.eventKind === "date_range" && !campaign.endDate && statusKey === "scheduled";
      if (campaign.eventKind === "one_time" || isScheduledStartMarker) {
        const x = findBucketKey(campaign.startDate);
        if (!x) continue;
        markers.push({ key: campaign.id, x, title, name: campaign.name, id: campaign.id, kind: "campaign" });
      } else {
        const x1 = findBucketKey(campaign.startDate);
        const x2 = findBucketKey(campaign.endDate || lastDate);
        if (x1 && x2) {
          bands.push({ key: campaign.id, x1, x2, title, name: campaign.name, id: campaign.id });
        }
      }
    }
    return { bands, markers };
  }, [campaignOverlays.data, chartDataToRender, onboardedDateKey, showTrackingOverlays]);

  const trackingOverlayPositions = useMemo(() => {
    const denominator = Math.max(chartDataToRender.length - 1, 1);
    const indexByBucket = new Map(chartDataToRender.map((point, index) => [point.bucketKey, index]));
    const position = (bucketKey: string) => ((indexByBucket.get(bucketKey) || 0) / denominator) * 100;
    const bands = trackingOverlayData.bands.map(band => {
      const left = position(band.x1);
      const right = position(band.x2);
      return { ...band, left, width: Math.max(right - left, 0.8) };
    });
    const markers = trackingOverlayData.markers.map(marker => ({
      ...marker,
      left: position(marker.x),
    }));
    const stackByKey = new Map(
      assignProximityStacks([
        ...bands.map((band) => ({ key: `band-${band.key}`, left: band.left })),
        ...markers.map((marker) => ({ key: `marker-${marker.key}`, left: marker.left })),
      ]).map((item) => [item.key, item.stack])
    );

    return {
      bands: bands.map((band) => ({
        ...band,
        stack: stackByKey.get(`band-${band.key}`) ?? 0,
      })),
      markers: markers.map((marker) => ({
        ...marker,
        stack: stackByKey.get(`marker-${marker.key}`) ?? 0,
      })),
    };
  }, [chartDataToRender, trackingOverlayData]);

  const chartLegendWithIcons = useMemo(() => {
    const iconConfig: Record<string, { icon: React.ReactNode; color: string }> =
    {
      impressions: { icon: <Eye className="h-6 w-6" />, color: "#6b7280" },
      clicks: {
        icon: <MousePointerClick className="h-6 w-6 rotate-90" />,
        color: "#2563eb",
      },
      sessions: { icon: <BarChart3 className="h-6 w-6" />, color: "#ea580c" },
      goals: { icon: <Target className="h-6 w-6" />, color: "#059669" },
    };
    return chartLegendItems.map((item) => {
      return {
        ...item,
        icon: iconConfig[item.key]?.icon || <Eye className="h-4 w-4" />,
        color: iconConfig[item.key]?.color,
        checked: visibleLines[item.key] ?? true,
      };
    });
  }, [chartLegendItems, visibleLines]);

  const chartLegendItemsToRender = useMemo(() => {
    return chartLegendWithIcons.filter((item) => item.checked);
  }, [chartLegendWithIcons]);

  // CHANGE 13: Badge fires only for tier === 'anomaly'. Candidate and normal tiers
  // are hidden entirely from the sheet and do not increment the alert count.
  const trafficAnomaliesCount = hasTrafficAnomaly ? 1 : 0;
  const goalAnomaliesCount = goalData.filter((g) => g.tier === "anomaly").length;
  const totalAnomaliesCount = goalAnomaliesCount + trafficAnomaliesCount;

  // CHANGE 09: Compute obs window from API response for the alert bar no-anomalies message.
  const obsStartDate =
    goalRawData?.obs_start_date ||
    goalRawData?.anomalies?.[0]?.obs_start_date ||
    trafficData?.obs_start_date ||
    trafficData?.window?.start;
  const obsEndDate =
    goalRawData?.obs_end_date ||
    goalRawData?.anomalies?.[0]?.obs_end_date ||
    trafficData?.obs_end_date ||
    trafficData?.window?.end;

  const formatObsDate = (dateStr: string | undefined, includeYear = false) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" } : {}),
      });
    } catch {
      return null;
    }
  };

  const noAnomaliesMsg = obsStartDate && obsEndDate
    ? `No anomalies detected for ${formatObsDate(obsStartDate)} to ${formatObsDate(obsEndDate, true)}`
    : `No recent anomalies detected as of ${new Date().toLocaleDateString()}`;
  
  const hasAnomalies = totalAnomaliesCount > 0;
  const showChartLoader = loadingState.chart && !hasData;

  const funnelChartData = useMemo(() => {
    if (funnelVariant !== "sessions-goals") return funnelChartItems;

    const sessionsTotal = chartData.reduce(
      (sum, point) => sum + (Number(point.sessions) || 0),
      0
    );
    const goalsTotal = chartData.reduce(
      (sum, point) => sum + (Number(point.goals) || 0),
      0
    );
    const percentage =
      sessionsTotal > 0 ? `${Math.round((goalsTotal / sessionsTotal) * 100)}%` : undefined;

    return [
      { label: "Sessions", value: sessionsTotal, percentage },
      { label: "Goals", value: goalsTotal },
    ];
  }, [chartData, funnelChartItems, funnelVariant]);

  const hasFunnelDataToRender = funnelChartData.some((item) => item.value > 0);
  const showFunnelLoader = loadingState.funnel && !hasFunnelDataToRender;

  const anomalyDaysByMetric = useMemo(() => {
    return {
      goals: buildAnomalyDays(anomalyDates, "goal"),
      traffic: buildAnomalyDays(anomalyDates, "traffic"),
    };
  }, [anomalyDates]);

  // Continuous (2+ consecutive day) anomaly runs render as bands instead of
  // circles. Bands only apply in day view; week/month grouping keeps circles.
  const anomalyBandData = useMemo(() => {
    const result = {
      bands: [] as Array<{
        key: string;
        x1: string;
        x2: string;
        color: string;
        tab: AnomalySheetTab;
        title: string;
        lastAsOfDate: string;
      }>,
    };

    if (!showAnomalyHighlights || groupBy !== "day") return result;
    if (chartDataToRender.length === 0 || anomalyDates.length === 0) return result;

    const findBucketKey = (date: string): string | null => {
      for (const point of chartDataToRender) {
        const bucketStart = point.bucketStart || point.dateKey;
        const bucketEnd = point.bucketEnd || point.dateKey;
        if (bucketStart && bucketEnd && date >= bucketStart && date <= bucketEnd) {
          return point.bucketKey || point.dateKey || point.date;
        }
      }
      return null;
    };

    const process = (
      tab: AnomalySheetTab,
      color: string,
      seriesLabel: string,
      enabled: boolean,
      anomalyDays: AnomalyDay[]
    ) => {
      if (!enabled) return;
      const runs = groupConsecutiveAnomalyDays(anomalyDays).filter((run) => run.length >= 2);
      for (const run of runs) {
        const x1 = findBucketKey(run.startDate);
        const x2 = findBucketKey(run.endDate);
        if (!x1 || !x2) continue;
        result.bands.push({
          key: `${tab}-${run.startDate}-${run.endDate}`,
          x1,
          x2,
          color,
          tab,
          title: formatAnomalyBandTitle(run, seriesLabel),
          lastAsOfDate: run.lastAsOfDate,
        });
      }
    };

    process(
      "goals",
      CHART_SERIES_COLORS.goals,
      "Goal anomaly",
      visibleLines.goals,
      anomalyDaysByMetric.goals
    );

    process(
      "traffic",
      visibleLines.clicks ? CHART_SERIES_COLORS.clicks : CHART_SERIES_COLORS.impressions,
      "Traffic anomaly",
      ga4TrafficScope === "organic" && (visibleLines.clicks || visibleLines.impressions),
      anomalyDaysByMetric.traffic
    );

    return result;
  }, [anomalyDates.length, anomalyDaysByMetric, chartDataToRender, ga4TrafficScope, groupBy, showAnomalyHighlights, visibleLines]);

  const findAnomalyRunForBucket = useCallback((
    anomalyDays: AnomalyDay[],
    bucketStart: string,
    bucketEnd: string
  ): AnomalyRun | undefined => {
    const runs = groupConsecutiveAnomalyDays(anomalyDays);
    const eligibleRuns = groupBy === "day"
      ? runs.filter((run) => run.length === 1)
      : runs;

    return eligibleRuns.find((run) => run.startDate <= bucketEnd && run.endDate >= bucketStart);
  }, [groupBy]);

  const chartAnomalyMarkers = useMemo(() => {
    if (!showAnomalyHighlights) return [];
    if (chartDataToRender.length === 0 || anomalyDates.length === 0) return [];

    const markers: Array<{
      key: string;
      x: string;
      y: number;
      yAxisId: "left" | "right";
      date: string;
      tab: AnomalySheetTab;
      label: string;
      color: string;
      xDate: string;
    }> = [];

    for (const point of chartDataToRender) {
      const pointValues = point as unknown as Record<string, string | number | undefined>;
      const bucketStart = point.bucketStart || point.dateKey;
      const bucketEnd = point.bucketEnd || point.dateKey;
      if (!bucketStart || !bucketEnd) continue;

      const goalMatch = findAnomalyRunForBucket(anomalyDaysByMetric.goals, bucketStart, bucketEnd);
      const trafficMatch = ga4TrafficScope === "organic"
        ? findAnomalyRunForBucket(anomalyDaysByMetric.traffic, bucketStart, bucketEnd)
        : null;

      if (goalMatch && visibleLines.goals) {
        const y = Number(pointValues[useNormalizedKeys ? "goalsNorm" : "goals"]);
        if (Number.isFinite(y)) {
          markers.push({
            key: `goal-${goalMatch.startDate}-${goalMatch.lastAsOfDate}-${point.bucketKey || point.dateKey || point.date}`,
            x: point.bucketKey || point.dateKey || point.date,
            y,
            yAxisId: "left",
            date: goalMatch.lastAsOfDate,
            tab: "goals",
            label: "Goal anomaly",
            color: CHART_SERIES_COLORS.goals,
            xDate: goalMatch.startDate,
          });
        }
      }

      if (trafficMatch && (visibleLines.clicks || visibleLines.impressions)) {
        const metricKey = visibleLines.clicks ? "clicks" : "impressions";
        const y = Number(pointValues[useNormalizedKeys ? `${metricKey}Norm` : metricKey]);
        const yAxisId =
          metricKey === "impressions" && !useNormalizedKeys && !singleMetricMode
            ? "right"
            : "left";

        if (Number.isFinite(y)) {
          markers.push({
            key: `traffic-${trafficMatch.startDate}-${trafficMatch.lastAsOfDate}-${point.bucketKey || point.dateKey || point.date}`,
            x: point.bucketKey || point.dateKey || point.date,
            y,
            yAxisId,
            date: trafficMatch.lastAsOfDate,
            tab: "traffic",
            label: "Traffic anomaly",
            color: CHART_SERIES_COLORS[metricKey],
            xDate: trafficMatch.startDate,
          });
        }
      }
    }

    return markers;
  }, [anomalyDates.length, anomalyDaysByMetric, chartDataToRender, findAnomalyRunForBucket, ga4TrafficScope, showAnomalyHighlights, singleMetricMode, useNormalizedKeys, visibleLines]);

  const openAnomalyMarker = useCallback((tab: AnomalySheetTab, date: string) => {
    setAnomaliesSheetTab(tab);
    setAnomaliesSheetDate(date);
    setAnomaliesSheetOpen(true);
  }, []);

  const openDefaultAnomaliesSheet = useCallback(() => {
    setAnomaliesSheetTab("goals");
    setAnomaliesSheetDate(null);
    setAnomaliesSheetOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-3">

      {/* Alert Bar — hidden while data is being prepared */}
      {!isIngestionActive && <AlertBar
        title={hasAnomalies ? "Anomalies Detected" : ""}
        icon={
          hasAnomalies ? (
            <AlertTriangle
              className="h-5 w-5"
              color="#F59E0B"
            />
          ) : (
            <CircleCheckBig
              className="h-5 w-5"
              color="#16A34A"
            />
          )
        }
        badges={
          hasAnomalies
            ? [
                {
                  count: totalAnomaliesCount,
                  type: "critical" as const,
                  label: `${totalAnomaliesCount}`,
                },
              ]
            : []
        }
        isLoading={isLoadingGoals || isLoadingTraffic}
        error={goalError || trafficError}
        noAlertsMessage={noAnomaliesMsg}
        onClick={openDefaultAnomaliesSheet}
        variant="secondary"
      />}

      {/* Anomalies Sheet */}
      <CampaignImpactReportSheet
        open={Boolean(selectedCampaignId)}
        onOpenChange={open => { if (!open) setSelectedCampaignId(null); }}
        businessId={businessUniqueId}
        campaignId={selectedCampaignId}
      />

      {!isIngestionActive && <AnomaliesSheet
        open={anomaliesSheetOpen}
        onOpenChange={setAnomaliesSheetOpen}
        defaultGoalData={goalData}
        defaultCriticalCount={criticalCount}
        defaultWarningCount={warningCount}
        defaultPositiveCount={positiveCount}
        defaultIsLoadingGoals={isLoadingGoals}
        defaultTrafficData={trafficData}
        defaultIsLoadingTraffic={isLoadingTraffic}
        businessId={businessUniqueId}
        businessName={businessName}
        goalRawState={goalRawData?.state}
        obsStartDate={obsStartDate}
        obsEndDate={obsEndDate}
        initialTab={anomaliesSheetTab}
        initialSelectedDate={anomaliesSheetDate}
      />}

      <div className="flex flex-col gap-3">
        {/* Metric Cards */}
        <div className="grid grid-cols-5 bg-white p-2 rounded-lg border border-general-border">
          {/* Gap analysis cards (3 columns) */}
          {metricCards.length > 0 ? (
            metricCards.map((card) => (
              <MetricCard
                key={card.key}
                icon={METRIC_ICONS[card.key] || <Target className="h-5 w-5" />}
                label={card.title}
                value={card.percentage}
                change={card.change}
                sparklineData={card.sparklineData}
                isLoading={isLoadingMetrics}
              />
            ))
          ) : metricsStatus === "loading" ? (
            <>
              {[1, 2, 3].map((i) => (
                <MetricCard key={`gap-loading-${i}`} isLoading={true} />
              ))}
            </>
          ) : (
            <>
              {/* Show empty state for each metric card with heading and -- */}
              {[
                "topic-coverage",
                "visibility-relevance",
                "engagement-relevance",
              ].map((key) => (
                <MetricCard
                  key={key}
                  icon={METRIC_ICONS[key] || <Target className="h-5 w-5" />}
                  label={
                    key === "topic-coverage"
                      ? "Topic Coverage"
                      : key === "visibility-relevance"
                      ? "Visibility Rel"
                      : key === "engagement-relevance"
                      ? "Engagement Rel"
                      : "--"
                  }
                  value={"--"}
                  change={undefined}
                  sparklineData={undefined}
                  isLoading={false}
                  emptyMessage={
                    key === "topic-coverage"
                      ? "Add more topics to your business profile to see this metric."
                      : key === "visibility-relevance"
                      ? "Improve your website's SEO to see this metric."
                      : key === "engagement-relevance"
                      ? "Increase user engagement to see this metric."
                      : "No data available."
                  }
                />
              ))}
            </>
          )}

          {/* Branded / Non-branded cards (2 columns) */}
          {brandedStatus === "success" ? (
            <>
              <MetricCard
                key={brandedCard.key}
                icon={METRIC_ICONS[brandedCard.key] || <Star className="h-5 w-5" />}
                label={brandedCard.title}
                value={brandedCard.percentage}
                change={brandedCard.change}
                sparklineData={brandedCard.sparklineData}
                isLoading={isLoadingBranded}
                showArrowButton={true}
                onArrowClick={() => setBrandedKeywordsModalOpen(true)}
              />
              <MetricCard
                key={nonBrandedCard.key}
                icon={
                  METRIC_ICONS[nonBrandedCard.key] || <TrendingUp className="h-5 w-5" />
                }
                label={nonBrandedCard.title}
                value={nonBrandedCard.percentage}
                change={nonBrandedCard.change}
                sparklineData={nonBrandedCard.sparklineData}
                isLoading={isLoadingBranded}
              />
            </>
          ) : brandedStatus === "loading" ? (
            <>
              <MetricCard key="branded-loading" isLoading={true} />
              <MetricCard key="nonbranded-loading" isLoading={true} />
            </>
          ) : (
            <>
              {/* Show empty state for branded/non-branded cards with heading and -- */}
              {[
                "branded",
                "non-branded",
              ].map((key) => (
                <MetricCard
                  key={key}
                  icon={METRIC_ICONS[key] || <Star className="h-5 w-5" />}
                  label={key === "branded" ? "Branded" : "Non-Branded"}
                  value={"--"}
                  change={undefined}
                  sparklineData={undefined}
                  isLoading={false}
                  emptyMessage={
                    key === "branded"
                      ? "Ensure your brand keywords are tracked to see this metric."
                      : "Add more non-branded keywords to see this metric."
                  }
                  disableTooltip={key === "non-branded"}
                  showArrowButton={key === "branded"}
                  onArrowClick={key === "branded" ? () => setBrandedKeywordsModalOpen(true) : undefined}
                />
              ))}
            </>
          )}
        </div>

        {/* Area Chart with Funnel - card height matches funnel; toggle keeps same height */}
        {shouldShowNoGscMetricsState ? (
          <NoGSCMetricsSelected
            title="Organic Performance"
            description="Select at least one GSC metric to activate this report."
          />
        ) : (
        <div className="relative rounded-lg overflow-hidden bg-white border border-general-border min-h-[320px]">
          <div
            className={
              graphFullScreen
                ? "grid grid-cols-1 min-h-[242px]"
                : "grid grid-cols-[minmax(0,1fr)_400px] min-h-[320px]"
            }
          >
            <div
              className={
                graphFullScreen
                  ? "p-3 pr-8 flex flex-col min-h-full"
                  : "p-3 pr-8 border-r border-general-border flex flex-col min-h-full"
              }
            >
            {showChartLoader ? (
              <div className="flex flex-1 items-center justify-center min-h-[240px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hasData ? (
              <>
                <div
                  className={cn(
                    "mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2",
                    graphFullScreen && "pr-10"
                  )}
                >
                  <ChartLegend
                    variant="box"
                    items={chartLegendItemsToRender}
                    onToggle={handleLegendToggle}
                    showToggle={false}
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <ChartOverlayToggle
                      icon={Flag}
                      label="anomaly highlights"
                      active={showAnomalyHighlights}
                      loading={isLoadingAnomalyDates}
                      disabled={isIngestionActive}
                      disabledReason="Available once your data is ready"
                      onToggle={handleAnomalyHighlightsToggle}
                      activeIconClassName="text-amber-600"
                    />
                    <ChartOverlayToggle
                      icon={CalendarClock}
                      label="tracking overlays"
                      active={showTrackingOverlays}
                      loading={campaignOverlays.isLoading}
                      onToggle={handleTrackingOverlaysToggle}
                      activeIconClassName="text-primary"
                    />
                  </div>
                </div>
                <div
                  className={
                    graphFullScreen
                      ? "relative min-h-[242px] flex-1"
                      : "relative h-[242px]"
                  }
                >
                  <div className="pointer-events-none absolute inset-x-2 bottom-6 top-3 z-10" aria-label="Tracking overlays">
                    {trackingOverlayPositions.bands.map(band => (
                      <TrackingOverlayHit
                        key={`campaign-band-${band.key}`}
                        title={band.title}
                        clickable
                        className="pointer-events-auto absolute bottom-0 top-0 overflow-visible border-l border-dashed border-primary/60 bg-primary/[0.07] text-left hover:bg-primary/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        style={{
                          left: `${band.left}%`,
                          width: `${band.width}%`,
                          transform: `translateX(${band.stack * OVERLAY_LINE_NUDGE_PX}px)`,
                        }}
                        onClick={() => setSelectedCampaignId(band.id)}
                      >
                        <span
                          className={OVERLAY_LABEL_CLASS}
                          style={{
                            transform: `translateY(${band.stack * OVERLAY_LABEL_ROW_PX}px)`,
                            ...(band.left > 75 ? { right: 4 } : { left: 4 }),
                          }}
                        >
                          {band.name}
                        </span>
                      </TrackingOverlayHit>
                    ))}
                    {trackingOverlayPositions.markers.map(marker => {
                      const isOnboarded = marker.kind === "onboarded" || !marker.id;
                      return (
                        <TrackingOverlayHit
                          key={`tracking-marker-${marker.key}`}
                          title={marker.title}
                          clickable={!isOnboarded}
                          className="pointer-events-auto absolute bottom-0 top-0 w-2 overflow-visible border-l border-dashed border-primary/80 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                          style={{
                            left: `${marker.left}%`,
                            transform: `translateX(calc(-50% + ${marker.stack * OVERLAY_LINE_NUDGE_PX}px))`,
                          }}
                          onClick={
                            isOnboarded
                              ? undefined
                              : () => setSelectedCampaignId(marker.id)
                          }
                        >
                          <span
                            className={OVERLAY_LABEL_CLASS}
                            style={{
                              transform: `translateY(${marker.stack * OVERLAY_LABEL_ROW_PX}px)`,
                              ...(marker.left > 75 ? { right: 4 } : { left: 4 }),
                            }}
                          >
                            {marker.name}
                          </span>
                        </TrackingOverlayHit>
                      );
                    })}
                  </div>
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full flex-col justify-end items-stretch aspect-auto"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartDataToRender}
                        margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="fillImpressions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6b7280"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6b7280"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillClicks"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2563eb"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#2563eb"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillGoals"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#059669"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#059669"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillSessions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ea580c"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ea580c"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="bucketKey"
                          tickFormatter={(value) => xAxisTickLabels.get(String(value)) || String(value)}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickMargin={8}
                          ticks={xAxisTicks12Months}
                          interval={
                            xAxisTicks12Months
                              ? 0
                              : chartDataToRender.length <= 7
                                ? 0
                                : chartDataToRender.length <= 14
                                  ? 1
                                  : chartDataToRender.length <= 30
                                    ? Math.floor(chartDataToRender.length / 8)
                                    : chartDataToRender.length <= 90
                                      ? Math.floor(chartDataToRender.length / 10)
                                      : Math.floor(chartDataToRender.length / 12)
                          }
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          hide
                          width={0}
                          domain={useNormalizedKeys ? [0, 100] : singleMetricYDomain}
                          {...(useNormalizedKeys ? {} : !singleMetricMode ? {
                            domain: ([dataMin, dataMax]: [number, number]) => {
                              const pad = (dataMax - dataMin) * 0.05 || 1;
                              const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad);
                              return [min, dataMax + pad];
                            },
                          } : {})}
                        />
                        {!useNormalizedKeys && !singleMetricMode && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            hide
                            width={0}
                            domain={([dataMin, dataMax]: [number, number]) => {
                              const pad = (dataMax - dataMin) * 0.05 || 1;
                              const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad);
                              return [min, dataMax + pad];
                            }}
                          />
                        )}
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0]?.payload as GroupedAnalyticsChartPoint | undefined;
                            const bucketStart = data?.bucketStart || data?.dateKey;
                            const bucketEnd = data?.bucketEnd || data?.dateKey;
                            const hasGoalAnomalyStart = Boolean(
                              showAnomalyHighlights &&
                              bucketStart &&
                              bucketEnd &&
                              findAnomalyRunForBucket(anomalyDaysByMetric.goals, bucketStart, bucketEnd)
                            );
                            const hasTrafficAnomalyStart = Boolean(
                              showAnomalyHighlights &&
                              bucketStart &&
                              bucketEnd &&
                              findAnomalyRunForBucket(anomalyDaysByMetric.traffic, bucketStart, bucketEnd)
                            );
                            const showAnomalyHint = Boolean(
                              (visibleLines.goals && hasGoalAnomalyStart) ||
                              (
                                ga4TrafficScope === "organic" &&
                                (visibleLines.clicks || visibleLines.impressions) &&
                                hasTrafficAnomalyStart
                              )
                            );
                            return (
                              <div className="min-w-[196px] rounded-lg border border-border bg-background px-3 py-2.5 shadow-md">
                                {data?.rangeContextLabel ? (
                                  <p className="text-[11px] font-medium tracking-[0.12px] text-muted-foreground">
                                    {data.rangeContextLabel}
                                  </p>
                                ) : null}
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <p className="text-base font-medium leading-5 text-general-foreground">
                                    {data?.rangeLabel || label}
                                  </p>
                                  {showAnomalyHint && (
                                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium leading-4 text-amber-700">
                                      Click to view anomaly
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                  {visibleLines.impressions && (
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="flex items-center gap-2 text-[#6b7280]">
                                        <span className="h-2 w-2 rounded-full bg-[#6b7280]" />
                                        Impressions
                                      </p>
                                      <span className="font-medium text-general-foreground">
                                        {data?.impressions?.toLocaleString() ?? "0"}
                                      </span>
                                    </div>
                                  )}
                                  {visibleLines.clicks && (
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="flex items-center gap-2 text-[#2563eb]">
                                        <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
                                        Clicks
                                      </p>
                                      <span className="font-medium text-general-foreground">
                                        {data?.clicks?.toLocaleString() ?? "0"}
                                      </span>
                                    </div>
                                  )}
                                  {visibleLines.sessions &&
                                    data?.sessions !== undefined && (
                                      <div className="flex items-center justify-between gap-4">
                                        <p className="flex items-center gap-2 text-[#ea580c]">
                                          <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
                                          Sessions
                                        </p>
                                        <span className="font-medium text-general-foreground">
                                          {data?.sessions?.toLocaleString() ?? "0"}
                                        </span>
                                      </div>
                                    )}
                                  {visibleLines.goals &&
                                    data?.goals !== undefined && (
                                      <div className="flex items-center justify-between gap-4">
                                        <p className="flex items-center gap-2 text-[#059669]">
                                          <span className="h-2 w-2 rounded-full bg-[#059669]" />
                                          Goals
                                        </p>
                                        <span className="font-medium text-general-foreground">
                                          {data?.goals?.toLocaleString() ?? "0"}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        {visibleLines.impressions && (
                          <Area
                            type="linear"
                            dataKey={useNormalizedKeys ? "impressionsNorm" : "impressions"}
                            yAxisId={useNormalizedKeys || singleMetricMode ? "left" : "right"}
                            stroke="#6b7280"
                            fill="url(#fillImpressions)"
                            strokeWidth={1}
                            name="Impressions"
                          />
                        )}
                        {visibleLines.clicks && (
                          <Area
                            type="linear"
                            dataKey={useNormalizedKeys ? "clicksNorm" : "clicks"}
                            yAxisId="left"
                            stroke="#2563eb"
                            fill="url(#fillClicks)"
                            strokeWidth={1}
                            name="Clicks"
                          />
                        )}
                        {visibleLines.goals && (
                          <Area
                            type="linear"
                            dataKey={useNormalizedKeys ? "goalsNorm" : "goals"}
                            yAxisId="left"
                            stroke="#059669"
                            fill="url(#fillGoals)"
                            strokeWidth={1}
                            name="Goals"
                          />
                        )}
                        {visibleLines.sessions && (
                          <Area
                            type="linear"
                            dataKey={useNormalizedKeys ? "sessionsNorm" : "sessions"}
                            yAxisId="left"
                            stroke="#ea580c"
                            fill="url(#fillSessions)"
                            strokeWidth={1}
                            name="Sessions"
                          />
                        )}
                        {anomalyBandData.bands.map((band) => (
                          <ReferenceArea
                            key={band.key}
                            x1={band.x1}
                            x2={band.x2}
                            yAxisId="left"
                            ifOverflow="extendDomain"
                            shape={(props) => (
                              <AnomalyBandShape
                                {...props}
                                color={band.color}
                                title={band.title}
                                onClick={() => openAnomalyMarker(band.tab, band.lastAsOfDate)}
                              />
                            )}
                          />
                        ))}
                        {chartAnomalyMarkers.map((marker) => (
                          <ReferenceDot
                            key={marker.key}
                            x={marker.x}
                            y={marker.y}
                            yAxisId={marker.yAxisId}
                            r={3.25}
                            fill={marker.color}
                            stroke={marker.color}
                            strokeWidth={0}
                            className="cursor-pointer outline-none"
                            onClick={() => openAnomalyMarker(marker.tab, marker.date)}
                            ifOverflow="extendDomain"
                            shape={(props) => (
                              <AnomalyCircleMarker
                                {...props}
                                onClick={() => openAnomalyMarker(marker.tab, marker.date)}
                              />
                            )}
                          >
                            <title>{`${marker.label} · ${marker.xDate}${marker.xDate !== marker.date ? ` (window ending ${marker.date})` : ""}`}</title>
                          </ReferenceDot>
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center min-h-[240px] text-muted-foreground">
                No GSC data available. Please connect Google Search Console.
              </div>
            )}
            </div>

            {!graphFullScreen && (
              <div className="h-full px-7 py-3 flex items-center justify-center min-h-0">
                {showFunnelLoader ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : hasFunnelDataToRender ? (
                  <FunnelChart data={funnelChartData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No funnel data available
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-white h-8 w-8"
            onClick={() => setGraphFullScreen(!graphFullScreen)}
          >
            {graphFullScreen ? (
              <Minimize2 className="h-2 w-2" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
        )}
      </div>

      <BrandedKeywordsModal
        open={brandedKeywordsModalOpen}
        onOpenChange={setBrandedKeywordsModalOpen}
        businessId={businessUniqueId}
      />
    </div>
  );
}
