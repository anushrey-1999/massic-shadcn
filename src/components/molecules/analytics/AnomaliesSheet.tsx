"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Target,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lightbulb,
  BarChart3,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";
import { AlertDateSelector } from "./AlertDateSelector";
import { useGoalAnalysis } from "@/hooks/use-goal-analysis";
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis";
import type { GoalData, GoalContributor, PageBreakdown, SourceBreakdown, Diagnosis, DailyPeak, AnomalyTier, HeadlineReel, Win, BaselineStatus } from "@/hooks/use-goal-analysis";
import type { TrafficData, TrafficContributor } from "@/hooks/use-traffic-analysis";

interface AnomaliesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGoalData: GoalData[];
  defaultCriticalCount: number;
  defaultWarningCount: number;
  defaultPositiveCount: number;
  defaultIsLoadingGoals: boolean;
  defaultTrafficData: TrafficData | null;
  defaultIsLoadingTraffic: boolean;
  businessId: string | null;
  businessName: string;
  goalRawState?: string | null;
  obsStartDate?: string | null;
  obsEndDate?: string | null;
  initialTab?: "goals" | "traffic";
  initialSelectedDate?: string | null;
}

type TrackingQuality = "stable" | "uncertain";
type Direction = "up" | "down";

// CHANGE 12: severity is retained in API but never rendered; getAnomalyConfig
// no longer emits a severity badge — only sentimentLabel and the delta chip.
const getAnomalyConfig = (
  direction: Direction,
  trackingQuality: TrackingQuality = "stable",
) => {
  if (direction === "up") {
    return {
      icon: trackingQuality === "uncertain" ? AlertTriangle : CheckCircle,
      sentimentLabel: trackingQuality === "uncertain" ? "Positive, verify" : "Positive",
      borderColor: "border-[#9FE1CB]",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      cardClass: "bg-[#F0FDFA]",
      note: trackingQuality === "uncertain" ? "Looks positive - worth verifying tracking." : null,
    };
  }

  return {
    icon: AlertCircle,
    sentimentLabel: "Needs attention",
    borderColor: "border-[#F7C1C1]",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconColor: "text-[#E24B4A]",
    textColor: "text-[#A32D2D]",
    bgColor: "bg-[#FEF2F2]",
    cardClass: "bg-[#FEF2F2]",
    note: null,
  };
};

/** CHANGE 02: Render headline reels with per-chunk direction colour. */
function HeadlineReels({ reels, fallback }: { reels?: HeadlineReel[]; fallback?: string }) {
  if (!reels || reels.length === 0) {
    return <span className="text-sm font-semibold text-foreground leading-tight">{fallback || ""}</span>;
  }
  const colorMap: Record<string, string> = {
    up: "text-emerald-700",
    down: "text-[#A32D2D]",
    flat: "text-amber-700",
    neutral: "text-foreground",
  };
  return (
    <span className="text-sm font-semibold leading-tight flex flex-wrap gap-x-1">
      {reels.map((reel, idx) => (
        <span key={idx} className={colorMap[reel.direction] || "text-foreground"}>
          {idx > 0 && <span className="text-muted-foreground/50 mr-1">·</span>}
          {reel.text}
        </span>
      ))}
    </span>
  );
}

/** CHANGE 07: ChannelBlock — coloured contributor row with stat chips and per-page breakdown. */
interface ChannelBlockProps {
  channelName: string;
  anchorDelta: number;
  anchorUnit: "conversions" | "clicks";
  deltaGoals?: number;
  deltaSessions?: number;
  sources?: SourceBreakdown[];
  pages?: PageBreakdown[];
  isTraffic?: boolean;
}

function StatChip({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isPos = value >= 0;
  const color = positive !== undefined
    ? (positive ? "text-[#0F6E56]" : "text-[#A32D2D]")
    : (isPos ? "text-[#0F6E56]" : "text-[#A32D2D]");
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", color)}>
        {formatSignedNumber(value)}
      </span>
    </span>
  );
}

function formatSignedNumber(value: number) {
  const numeric = Number(value || 0);
  const rounded = Math.round(numeric);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toLocaleString()}`;
}

function contributorDeltaColor(value: number | null | undefined) {
  const numeric = Number(value || 0);
  if (numeric > 0) return "text-[#0F6E56]";
  if (numeric < 0) return "text-[#A32D2D]";
  return "text-muted-foreground";
}

function ContributorStat({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return null;

  return (
    <div className="text-right">
      <p className="mb-px text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">
        {label}
      </p>
      <p className={cn("text-[14px] font-medium tabular-nums", contributorDeltaColor(value))}>
        {formatSignedNumber(value)}
      </p>
    </div>
  );
}

function hasNonZeroPageContribution(page: PageBreakdown) {
  return [
    page.delta_goals,
    page.delta_sessions,
    page.delta_clicks,
    page.delta_impressions,
  ].some((value) => Math.abs(Number(value || 0)) > 0);
}

function getPageLabel(page: string) {
  if (!page || page === "/") return "Homepage";
  return page;
}

function fallbackDriverText(diagnosis: Diagnosis) {
  const code = diagnosis.cause_code;
  const map: Record<string, string> = {
    RANK_DROP: "Your pages moved down in search results this week.",
    RANK_GAIN: "Your pages moved up in search results this week.",
    RANKING_GAIN: "Your pages moved up in search results this week.",
    CTR_DROP: "People saw your search result but clicked it less often than usual.",
    CTR_DROP_SNIPPET: "People saw your search result but clicked it less often than usual.",
    CTR_GAIN: "People clicked your search result more often than usual this week.",
    DEMAND_SOFTNESS: "Fewer people searched for your key topics this week than usual.",
    DEMAND_GROWTH: "More people searched for your key topics this week than usual.",
    NEW_VISIBILITY: "New pages started showing up in search results and bringing in clicks this week.",
    LOCAL_INTENT_GROWTH: "More local-intent searches appeared this week, bringing additional traffic.",
    SERP_FEATURE_IMPACT: "Search result layout changes likely reduced clicks this week.",
    TECHNICAL_ISSUE: "A large number of pages lost visibility at the same time, which may point to a technical issue.",
    PAGE_REMOVED: "Pages that previously brought traffic stopped appearing in search results this week.",
    MOBILE_UX: "Most of the movement came from mobile visitors this week.",
    GEO_ISSUE: "The movement was concentrated in a specific region this week.",
    CVR_DROP: "Visitors completed fewer goals despite similar traffic levels.",
    NO_QUERY_DATA: "Organic traffic moved this week, but query-level detail is not available for this window.",
    CHANNEL_GAIN: "One channel contributed most of the extra goals this week.",
  };
  return diagnosis.plain_text || map[code] || diagnosis.rationale || "A real change in performance drove this anomaly.";
}

function ContributorPageRows({ pages, isTraffic = false }: { pages: PageBreakdown[]; isTraffic?: boolean }) {
  const visiblePages = pages.filter(hasNonZeroPageContribution).slice(0, 5);

  if (visiblePages.length === 0) return null;

  return (
    <div className="divide-y divide-border/30 bg-background">
      {visiblePages.map((p, idx) => (
        <div key={idx} className="min-w-0 px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block max-w-[320px] truncate font-mono text-[11px] text-muted-foreground">
                {getPageLabel(p.page)}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-3">
              {!isTraffic && p.delta_goals !== null && p.delta_goals !== undefined && (
                <StatChip label="Goals" value={p.delta_goals} />
              )}
              {!isTraffic && p.delta_sessions !== null && p.delta_sessions !== undefined && (
                <StatChip label="Sessions" value={p.delta_sessions} />
              )}
              {p.delta_clicks !== null && p.delta_clicks !== undefined && (
                <StatChip label="Clicks" value={p.delta_clicks} />
              )}
              {p.delta_impressions !== null && p.delta_impressions !== undefined && (
                <StatChip label="Impr" value={p.delta_impressions} />
              )}
              {p.delta_position !== null && p.delta_position !== undefined && (
                <span className="text-[10px] tabular-nums">
                  <span className="text-muted-foreground">Pos </span>
                  <span className={cn("font-semibold", p.delta_position > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]")}>
                    {p.delta_position > 0 ? "↓" : "↑"}{Math.abs(p.delta_position).toFixed(1)}
                  </span>
                </span>
              )}
            </div>
          </div>

          {p.queries && p.queries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.queries.slice(0, 4).map((q, qi) => (
                <span key={qi} className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-background px-2 py-[3px] text-[11px] text-muted-foreground">
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChannelBlock({
  channelName,
  anchorDelta,
  anchorUnit,
  deltaGoals,
  deltaSessions,
  sources = [],
  pages = [],
  isTraffic = false,
}: ChannelBlockProps) {
  const isPositive = anchorDelta >= 0;
  const headerClass = isPositive
    ? "bg-[#F0FDFA] border-b border-[#9FE1CB]"
    : "bg-[#FEF2F2] border-b border-[#F7C1C1]";
  const accentBar = isPositive ? "bg-[#1D9E75]" : "bg-[#E24B4A]";
  const anchorLabel = `${anchorUnit} ${isPositive ? "gained" : "lost"}`;
  const primaryMetricLabel = isTraffic
    ? `clicks ${isPositive ? "gained" : "lost"}`
    : `goals ${isPositive ? "gained" : "lost"}`;
  const secondaryMetricLabel = isTraffic
    ? `impr ${isPositive ? "gained" : "lost"}`
    : `sessions ${isPositive ? "gained" : "lost"}`;
  const visibleSources = sources
    .filter((source) => Math.abs(Number(source.delta_goals || 0)) > 0)
    .slice(0, 10);
  const showFallbackPages = visibleSources.length === 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/40">
      <div className={cn("flex items-center justify-between gap-3 px-4 py-3", headerClass)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn("h-[22px] w-1 shrink-0 rounded-sm", accentBar)} />
          <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{channelName}</span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-4">
          <ContributorStat label={anchorLabel} value={anchorDelta} />
          {deltaGoals !== undefined && deltaGoals !== anchorDelta && (
            <ContributorStat label={primaryMetricLabel} value={deltaGoals} />
          )}
          {deltaSessions !== undefined && (
            <ContributorStat label={secondaryMetricLabel} value={deltaSessions} />
          )}
        </div>
      </div>

      {visibleSources.length > 0 && (
        <div className="divide-y divide-border/40 bg-background">
          {visibleSources.map((source, idx) => (
            <div key={`${source.key}-${idx}`} className="min-w-0">
              <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-2">
                <span className="min-w-0 truncate text-[12px] font-medium text-foreground">
                  {source.source || source.key || "Unknown source"}
                </span>
                <div className="flex shrink-0 flex-wrap justify-end gap-3">
                  {source.delta_goals !== undefined && (
                    <StatChip label={isTraffic ? "Clicks" : "Goals"} value={source.delta_goals} />
                  )}
                  {source.delta_sessions !== undefined && (
                    <StatChip label={isTraffic ? "Impr" : "Sessions"} value={source.delta_sessions} />
                  )}
                </div>
              </div>
              <ContributorPageRows pages={source.pages || []} isTraffic={isTraffic} />
            </div>
          ))}
        </div>
      )}

      {showFallbackPages && <ContributorPageRows pages={pages} isTraffic={isTraffic} />}
    </div>
  );
}

/** CHANGE 07 / NEW 02: Amber notice bar for anomalous baseline or partial history. */
function AmberNoticeBar({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-700 leading-snug">{message}</p>
    </div>
  );
}

/** NEW 02: Partial baseline amber chip shown on anomaly cards. */
function PartialBaselineChip({ historyDays }: { historyDays: number }) {
  const weeks = Math.floor(historyDays / 7);
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
      <Info className="h-3 w-3" />
      Limited history ({weeks} {weeks === 1 ? "week" : "weeks"})
    </span>
  );
}

/** CHANGE 02: Plain English severity for negative cards (5-band scale, matches backend). */
function formatSeverityText(absDeltaPct: number): string {
  const p = Math.abs(absDeltaPct);
  if (p >= 0.90) return "Very few this week compared to your normal";
  if (p >= 0.75) return "A quieter week than normal";
  if (p >= 0.50) return "Lower than usual this week";
  if (p >= 0.25) return "Lower than your typical week";
  return "Slightly lower than your usual week";
}

function formatPeakDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "EEE MMM d");
  } catch {
    return dateStr;
  }
}

function formatPeakDeltaPct(value: number) {
  const numeric = Number(value || 0);
  const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${Math.round(percent)}%`;
}

interface DailyPeakChipsProps {
  peaks?: DailyPeak[];
  unit: string;
}

function DailyPeakChips({ peaks, unit }: DailyPeakChipsProps) {
  const triggered = (peaks || []).filter((peak) => peak.tier !== "normal");
  if (triggered.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {triggered.slice(0, 5).map((peak) => {
        const isUp = peak.direction === "up";
        const isAnomaly = peak.tier === "anomaly";
        const Icon = isUp ? TrendingUp : TrendingDown;
        return (
          <div
            key={peak.date}
            className={cn(
              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              isAnomaly
                ? isUp
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
                : isUp
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{formatPeakDate(peak.date)}</span>
            <span className="font-semibold">{formatPeakDeltaPct(peak.delta_pct)}</span>
            <span className="text-muted-foreground/80">{unit}</span>
          </div>
        );
      })}
    </div>
  );
}

interface NormalTierRowProps {
  title: string;
  actual?: number;
  expected?: number;
  deltaPct: number;
  unit: string;
  peaks?: DailyPeak[];
}

function NormalTierRow({ title, actual, expected, deltaPct, unit, peaks }: NormalTierRowProps) {
  const triggeredPeaks = (peaks || []).filter((peak) => peak.tier !== "normal");
  return (
    <div className="min-w-0 rounded-xl border border-border/50 bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground line-clamp-1">{title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {Math.round(Number(actual || 0)).toLocaleString()} {unit} vs expected {Math.round(Number(expected || 0)).toLocaleString()} ({formatPeakDeltaPct(deltaPct)}) — within normal range
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
          Normal
        </Badge>
      </div>
      {triggeredPeaks.length > 0 && (
        <>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">Daily spikes / dips</p>
          <DailyPeakChips peaks={triggeredPeaks} unit={unit} />
        </>
      )}
    </div>
  );
}

function formatPercent(value: number | undefined) {
  const numeric = Number(value || 0);
  const percent = Math.abs(numeric) <= 1 ? Math.abs(numeric) * 100 : Math.abs(numeric);
  return `${Math.round(percent)}%`;
}

function formatImpact(value: number | undefined, unit: string) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(numeric)).toLocaleString()} ${unit}`;
}

function hasMeaningfulTrafficSplit(split: NonNullable<TrafficData["narrative"]>["brand_split"] | undefined) {
  if (!split) return false;
  return Math.abs(Number(split.brand_delta || 0)) + Math.abs(Number(split.nonbrand_delta || 0)) > 0;
}

function attributionMessage(traffic: TrafficData) {
  const attribution = traffic.narrative?.attribution;
  if (!attribution || attribution.status === "complete") return null;

  const directionText = traffic.direction === "up" ? "increased" : "changed";
  if (attribution.reason === "low_detail_coverage") {
    return `Traffic ${directionText}, but Search Console page/query details only explain ${Math.round((attribution.coverage || 0) * 100)}% of the movement. The rest may be spread across many low-volume queries.`;
  }

  return `Traffic ${directionText}, but Search Console did not provide enough page/query detail to explain the driver. This is common with low-volume or privacy-filtered queries.`;
}


function dedupeDiagnosesByCause(diagnoses: Array<Diagnosis | null | undefined>) {
  const seen = new Set<string>();
  const deduped: Diagnosis[] = [];

  for (const diagnosis of diagnoses) {
    if (!diagnosis?.cause_code || seen.has(diagnosis.cause_code)) continue;
    seen.add(diagnosis.cause_code);
    deduped.push(diagnosis);
  }

  return deduped;
}

function compactDiagnoses(primary: Diagnosis | null | undefined, contributing: Diagnosis[] | undefined, fallback: Diagnosis[] | undefined) {
  return dedupeDiagnosesByCause([
    primary,
    ...(contributing || []),
    ...(fallback || []),
  ]).slice(0, 3);
}

type ContributorLike = {
  key?: string;
  page?: string;
  delta_clicks?: number;
  delta_conversions?: number;
  share?: number;
};

function contributorDisplayKey(contributor: ContributorLike) {
  return contributor.key || ("page" in contributor ? contributor.page : undefined) || "Unknown contributor";
}

function collapseDisplayContributors<T extends ContributorLike>(contributors: T[]) {
  const groups = new Map<string, T>();

  for (const contributor of contributors) {
    const displayKey = contributorDisplayKey(contributor);
    const existing = groups.get(displayKey);

    if (!existing) {
      groups.set(displayKey, { ...contributor, key: contributor.key || displayKey });
      continue;
    }

    existing.delta_clicks = Number(existing.delta_clicks || 0) + Number(contributor.delta_clicks || 0);
    existing.share = Number(existing.share || 0) + Number(contributor.share || 0);

    if ("delta_conversions" in existing || "delta_conversions" in contributor) {
      existing.delta_conversions = Number(existing.delta_conversions || 0) + Number(contributor.delta_conversions || 0);
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const bImpact = Math.abs(Number(("delta_conversions" in b ? b.delta_conversions : b.delta_clicks) || 0));
      const aImpact = Math.abs(Number(("delta_conversions" in a ? a.delta_conversions : a.delta_clicks) || 0));
      return bImpact - aImpact;
    });
}

interface GoalCardProps {
  goal: GoalData;
  onClick: () => void;
}

function GoalCard({ goal, onClick }: GoalCardProps) {
  const config = getAnomalyConfig(goal.direction, goal.trackingQuality);
  const Icon = config.icon;
  const isNegative = goal.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  const isPartial = goal.baselineStatus === "PARTIAL";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 text-left rounded-xl border p-3 transition-all hover:shadow-md",
        config.borderColor,
        config.cardClass
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* CHANGE 12: severity badge removed; sentimentLabel + delta chip retained */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.sentimentLabel}
            </Badge>
            {/* CHANGE 02: Positive cards show raw %; negative cards show plain English severity */}
            {isNegative ? (
              <span className={cn("text-xs font-semibold flex items-center gap-1", config.textColor)}>
                <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
                {formatSeverityText(goal.deltaPct)}
              </span>
            ) : (
              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold", config.bgColor)}>
                <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
                <span className={config.iconColor}>{goal.percentage}</span>
              </div>
            )}
            {/* NEW 02: Partial baseline chip */}
            {isPartial && <PartialBaselineChip historyDays={goal.historyDays} />}
          </div>

          <h3 className="break-words text-sm font-semibold text-foreground line-clamp-1">
            {goal.title}
          </h3>

          {/* CHANGE 02: Headline reels */}
          <HeadlineReels reels={goal.headlineReels} fallback={goal.primaryCause} />
          <DailyPeakChips peaks={goal.dailyPeaks} unit="conversions" />
          {config.note && (
            <p className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              "text-emerald-700"
            )}>
              <Icon className="h-3 w-3" />
              {config.note}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

interface GoalDetailViewProps {
  goal: GoalData;
  onBack: () => void;
}

function GoalDetailView({ goal, onBack }: GoalDetailViewProps) {
  const config = getAnomalyConfig(goal.direction, goal.trackingQuality);
  const Icon = config.icon;
  const isNegative = goal.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  // CHANGE 05+06: Show max 2 drivers, using plain_text
  const diagnosesToRender = dedupeDiagnosesByCause([
    goal.primaryDiagnosis,
    ...(goal.contributingDiagnoses || []),
    ...(goal.diagnoses || []),
  ]).filter(Boolean).slice(0, 2);
  const isPartial = goal.baselineStatus === "PARTIAL";

  return (
    <div className="min-w-0 space-y-4 pb-6">
      <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-3 -ml-2 h-7 text-xs"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>

          <div className="mb-3 space-y-2">
            {isNegative && goal.largePositionDrop && (
              <AmberNoticeBar message="Pages moved far down in search results this week — worth checking for technical issues." />
            )}
            {goal.anomalousComparisonPeriod && (
              <AmberNoticeBar message="Prior period was unusually high/low — this anomaly score may be inflated." />
            )}
            {isPartial && (
              <AmberNoticeBar message={`Analysis based on ${Math.floor(goal.historyDays / 7)} weeks of history — results may be less reliable than usual.`} />
            )}
          </div>

          <div
            className={cn(
              "min-w-0 rounded-xl border p-4",
              config.borderColor,
              config.cardClass
            )}
          >
            {/* CHANGE 12: Severity badge removed */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {config.sentimentLabel}
              </Badge>
              {/* CHANGE 02: Positive cards show raw %; negative cards show plain English severity */}
              {isNegative ? (
                <span className={cn("text-xs font-semibold flex items-center gap-1", config.textColor)}>
                  <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                  {formatSeverityText(goal.deltaPct)}
                </span>
              ) : (
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold", config.bgColor)}>
                  <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                  <span className={config.iconColor}>{goal.percentage}</span>
                </div>
              )}
              {/* NEW 02: Partial baseline chip in detail view */}
              {isPartial && <PartialBaselineChip historyDays={goal.historyDays} />}
            </div>

            <h2 className="break-words text-sm font-bold text-foreground leading-tight mb-2">
              {goal.title}
            </h2>

            {/* CHANGE 02: Headline reels in detail view */}
            <HeadlineReels reels={goal.headlineReels} fallback={goal.primaryCause} />
            <DailyPeakChips peaks={goal.dailyPeaks} unit="conversions" />
            {config.note && (
              <p className={cn(
                "mt-2 text-[11px] font-medium flex items-center gap-1",
                "text-emerald-700"
              )}>
                <Icon className="h-3 w-3" />
                {config.note}
              </p>
            )}
          </div>
        </div>

        {/* BUG 08: Absolute numbers line — negative cards only */}
        {isNegative && goal.actual !== undefined && goal.expected !== undefined && (
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">{Math.round(goal.actual).toLocaleString()}</span> conversions this week, compared to an average of <span className="font-medium text-foreground">{Math.round(goal.expected).toLocaleString()}</span> over the past 8 weeks.
          </p>
        )}

        {/* CHANGE 14: Cross-event context line — negative cards only, gated by backend */}
        {isNegative && goal.crossEventContext && (
          <p className="text-[11px] text-muted-foreground italic leading-snug">{goal.crossEventContext}</p>
        )}

        {/* CHANGE 13: Wins bar only for positive cards with >= 2 genuine wins */}
        {goal.direction === 'up' && goal.wins.filter((win) => Number(win.delta || 0) > 0).length >= 2 && (
          <div>
            <div className="flex flex-wrap gap-1.5">
              {goal.wins.filter((win) => Number(win.delta || 0) > 0).slice(0, 3).map((win, idx) => (
                <span key={idx} className="inline-flex min-w-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  <span className="break-words">{win.text}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CHANGE 04: Single context_line paragraph replaces Key Insights numbered list */}
        {goal.contextLine && (
          <p className="text-xs text-muted-foreground leading-snug">{goal.contextLine}</p>
        )}

        {/* CHANGE 05+06: Likely Drivers — max 2, numbered, plain_text only, no Primary: label, no actions */}
        {diagnosesToRender.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Likely Drivers
            </h3>
            <div className="space-y-2">
              {diagnosesToRender.map((diagnosis, idx) => (
                <div key={idx} className="min-w-0 flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-700">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 break-words text-xs text-muted-foreground leading-snug">
                    {fallbackDriverText(diagnosis)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHANGE 07: Top Contributors with expanded ChannelBlock */}
        {goal.topContributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              Top Contributors
            </h3>
            {goal.bottomLine && (
              <p className="mb-2 text-[11px] text-muted-foreground leading-snug">{goal.bottomLine}</p>
            )}
            <div className="space-y-1.5">
              {goal.topContributors.map((contributor, idx) => (
                <ChannelBlock
                  key={`${idx}-${contributor.key || ""}`}
                  channelName={contributor.key || "Unknown contributor"}
                  anchorDelta={contributor.delta_goals ?? contributor.delta_conversions ?? 0}
                  anchorUnit="conversions"
                  deltaGoals={contributor.delta_goals}
                  deltaSessions={contributor.delta_sessions}
                  sources={contributor.sources}
                  pages={contributor.pages as PageBreakdown[] | undefined}
                />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

interface TrafficCardProps {
  traffic: TrafficData;
  onClick: () => void;
}

function TrafficCard({ traffic, onClick }: TrafficCardProps) {
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.tracking_quality || "stable",
  );
  const Icon = config.icon;
  const isNegative = traffic.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  const dailyPeaks = (traffic.detection?.daily_peaks || []) as DailyPeak[];
  const isPartial = (traffic.baseline_status || traffic.baseline?.status) === "PARTIAL";
  const historyDays = traffic.history_days || traffic.baseline?.history_days || 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 text-left rounded-xl border p-3 transition-all hover:shadow-md",
        config.borderColor,
        config.cardClass
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* CHANGE 12: severity badge removed */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.sentimentLabel}
            </Badge>
            {/* CHANGE 02: Positive cards show raw %; negative cards show plain English severity */}
            {isNegative ? (
              <span className={cn("text-xs font-semibold flex items-center gap-1", config.textColor)}>
                <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
                {formatSeverityText(traffic.delta_pct)}
              </span>
            ) : (
              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold", config.bgColor)}>
                <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
                <span className={config.iconColor}>
                  +{formatPercent(traffic.delta_pct)}
                </span>
              </div>
            )}
            {/* NEW 02: Partial baseline chip */}
            {isPartial && <PartialBaselineChip historyDays={historyDays} />}
          </div>

          {/* CHANGE 02: Headline reels for traffic */}
          <HeadlineReels reels={traffic.narrative?.headline_reels} fallback={traffic.narrative?.headline || "Traffic Anomaly"} />
          <DailyPeakChips peaks={dailyPeaks} unit="clicks" />
          {config.note && (
            <p className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              "text-emerald-700"
            )}>
              <Icon className="h-3 w-3" />
              {config.note}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

interface TrafficDetailViewProps {
  traffic: TrafficData;
  onBack: () => void;
}

function TrafficDetailView({ traffic, onBack }: TrafficDetailViewProps) {
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.tracking_quality || "stable",
  );
  const Icon = config.icon;
  const isNegative = traffic.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  const isPartial = (traffic.baseline_status || traffic.baseline?.status) === "PARTIAL";
  const historyDays = traffic.history_days || traffic.baseline?.history_days || 0;
  const anomalousComparisonPeriod = traffic.baseline?.anomalous_comparison_period ?? false;
  const dailyPeaks = (traffic.detection?.daily_peaks || []) as DailyPeak[];
  const diagnosesToRender = compactDiagnoses(
    traffic.narrative?.primary_diagnosis,
    traffic.narrative?.contributing_diagnoses,
    traffic.narrative?.diagnoses
  );
  const topContributors = collapseDisplayContributors(traffic.narrative?.top_contributors || [])
    .filter((contributor) => Math.abs(Number(contributor.delta_clicks || 0)) > 0)
    .slice(0, 10);
  const topQueries = collapseDisplayContributors(traffic.narrative?.top_queries || [])
    .filter((contributor) => Math.abs(Number(contributor.delta_clicks || 0)) > 0)
    .slice(0, 10);
  const trafficSplit = hasMeaningfulTrafficSplit(traffic.narrative?.brand_split)
    ? traffic.narrative?.brand_split
    : null;
  const attributionCopy = attributionMessage(traffic);

  return (
    <div className="min-w-0 space-y-4 pb-6">
      <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-3 -ml-2 h-7 text-xs"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>

          <div className="mb-3 space-y-2">
            {anomalousComparisonPeriod && (
              <AmberNoticeBar message="Prior period was unusually high/low — this anomaly score may be inflated." />
            )}
            {isPartial && (
              <AmberNoticeBar message={`Analysis based on ${Math.floor(historyDays / 7)} weeks of history — results may be less reliable than usual.`} />
            )}
            {isNegative && (traffic.large_position_drop || traffic.narrative?.large_position_drop) && (
              <AmberNoticeBar message="Pages moved far down in search results this week — worth checking for technical issues." />
            )}
          </div>

          <div
            className={cn(
              "min-w-0 rounded-xl border p-4",
              config.borderColor,
              config.cardClass
            )}
          >
            {/* CHANGE 12: Severity badge removed */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {config.sentimentLabel}
              </Badge>
              {/* CHANGE 02: Positive cards show raw %; negative cards show plain English severity */}
              {isNegative ? (
                <span className={cn("text-xs font-semibold flex items-center gap-1", config.textColor)}>
                  <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                  {formatSeverityText(traffic.delta_pct)}
                </span>
              ) : (
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold", config.bgColor)}>
                  <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                  <span className={config.iconColor}>
                    +{formatPercent(traffic.delta_pct)}
                  </span>
                </div>
              )}
              {/* NEW 02: Partial baseline chip in detail */}
              {isPartial && <PartialBaselineChip historyDays={historyDays} />}
            </div>

            {/* CHANGE 02: Headline reels */}
            <HeadlineReels reels={traffic.narrative?.headline_reels} fallback={traffic.narrative?.headline || "Traffic Anomaly"} />
            <DailyPeakChips peaks={dailyPeaks} unit="clicks" />
            {config.note && (
              <p className={cn(
                "mt-2 text-[11px] font-medium flex items-center gap-1",
                "text-emerald-700"
              )}>
                <Icon className="h-3 w-3" />
                {config.note}
              </p>
            )}
          </div>
        </div>

        {/* CHANGE 04: Single context_line paragraph replaces Key Insights numbered list */}
        {traffic.narrative?.context_line && (
          <p className="text-xs text-muted-foreground leading-snug">{traffic.narrative.context_line}</p>
        )}

        {/* bottom_line context phrase */}
        {traffic.narrative?.bottom_line && (
          <p className="text-[11px] text-muted-foreground leading-snug">{traffic.narrative.bottom_line}</p>
        )}

        {attributionCopy && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="break-words text-xs text-muted-foreground leading-snug">
              {attributionCopy}
            </p>
          </div>
        )}

        {/* CHANGE 05+06: Likely Drivers — max 2, numbered, plain_text only, no Primary: label, no actions */}
        {diagnosesToRender.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Likely Drivers
            </h3>
            <div className="space-y-2">
              {diagnosesToRender.slice(0, 2).map((diagnosis, idx) => (
                <div key={`${diagnosis.cause_code}-${idx}`} className="min-w-0 flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-700">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 break-words text-xs text-muted-foreground leading-snug">
                    {fallbackDriverText(diagnosis as Diagnosis)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {trafficSplit && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              Traffic Split
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Brand</p>
                <p className="text-lg font-bold text-foreground">{trafficSplit.brand_pct}%</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatImpact(trafficSplit.brand_delta, "clicks")}</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Non-Brand</p>
                <p className="text-lg font-bold text-foreground">{100 - trafficSplit.brand_pct}%</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatImpact(trafficSplit.nonbrand_delta, "clicks")}</p>
              </div>
            </div>
          </div>
        )}

        {/* CHANGE 07: Top Pages with expanded ChannelBlock (clicks + impressions + query chips) */}
        {topContributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">Top Pages</h3>
            <div className="space-y-1.5">
              {topContributors.map((contributor, idx) => (
                <ChannelBlock
                  key={idx}
                  channelName={contributor.key || "Unknown page"}
                  anchorDelta={contributor.delta_clicks ?? 0}
                  anchorUnit="clicks"
                  deltaGoals={contributor.delta_clicks}
                  deltaSessions={(contributor as { delta_impressions?: number }).delta_impressions}
                  pages={(contributor as { queries?: string[] }).queries?.map(q => ({ page: '', delta_goals: 0, delta_sessions: 0, queries: [q] })) || undefined}
                  isTraffic={true}
                />
              ))}
            </div>
          </div>
        )}

        {topQueries.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">Top Queries</h3>
            <div className="space-y-1.5">
              {topQueries.map((contributor, idx) => (
                <ChannelBlock
                  key={`${contributor.key}-${idx}`}
                  channelName={contributor.key || "Unknown query"}
                  anchorDelta={contributor.delta_clicks ?? 0}
                  anchorUnit="clicks"
                  isTraffic={true}
                />
              ))}
            </div>
          </div>
        )}

    </div>
  );
}

export function AnomaliesSheet({
  open,
  onOpenChange,
  defaultGoalData,
  defaultCriticalCount,
  defaultWarningCount,
  defaultPositiveCount,
  defaultIsLoadingGoals,
  defaultTrafficData,
  defaultIsLoadingTraffic,
  businessId,
  businessName,
  goalRawState,
  obsStartDate,
  obsEndDate,
  initialTab = "goals",
  initialSelectedDate = null,
}: AnomaliesSheetProps) {
  const [activeTab, setActiveTab] = React.useState<"goals" | "traffic">(
    "goals"
  );
  const [localDate, setLocalDate] = React.useState<Date | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<GoalData | null>(null);
  const [showTrafficDetail, setShowTrafficDetail] = React.useState(false);
  const [localSelectedDate, setLocalSelectedDate] = React.useState<
    string | null
  >(null);

  const {
    goalData: localGoalData,
    rawData: localRawGoalData,
    isLoading: localIsLoadingGoals,
  } = useGoalAnalysis(
    businessId,
    businessName,
    activeTab === "goals" ? localSelectedDate : null
  );

  const { trafficData: localTrafficData, isLoading: localIsLoadingTraffic } =
    useTrafficAnalysis(
      businessId,
      businessName,
      activeTab === "traffic" ? localSelectedDate : null
    );

  const displayGoalData =
    localSelectedDate !== null ? localGoalData : defaultGoalData;
  const displayIsLoadingGoals =
    localSelectedDate !== null ? localIsLoadingGoals : defaultIsLoadingGoals;

  const displayTrafficData =
    localSelectedDate !== null ? localTrafficData : defaultTrafficData;
  const displayIsLoadingTraffic =
    localSelectedDate !== null
      ? localIsLoadingTraffic
      : defaultIsLoadingTraffic;

  // CHANGE 13: Only tier === 'anomaly' cards are displayed and counted.
  const anomalyOnlyGoalData = displayGoalData.filter((g) => g.tier === "anomaly");
  const totalGoalCount = anomalyOnlyGoalData.length;
  const trafficTier = (displayTrafficData?.tier || displayTrafficData?.detection?.tier) as AnomalyTier | undefined;
  // CHANGE 13: Traffic badge fires only for tier === 'anomaly' (candidate hidden entirely).
  const hasTrafficAlert = displayTrafficData !== null && trafficTier === "anomaly";

  // CHANGE 10/NEW 03: Determine the active goal raw state from local or default data.
  const activeGoalRawState = localSelectedDate !== null
    ? (localRawGoalData?.state ?? null)
    : (goalRawState ?? null);

  // CHANGE 09: Obs dates for zero-anomaly empty state message inside the sheet.
  const activeObsStart = obsStartDate || displayGoalData[0]?.obsStartDate || displayTrafficData?.obs_start_date;
  const activeObsEnd = obsEndDate || displayGoalData[0]?.obsEndDate || displayTrafficData?.obs_end_date;
  const formatSheetDate = (dateStr: string | undefined, includeYear = false) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" } : {}),
      });
    } catch {
      return dateStr;
    }
  };

  const handleDateChange = (date: Date | null) => {
    setLocalDate(date);
    if (date) {
      setLocalSelectedDate(format(date, "yyyy-MM-dd"));
      setSelectedGoal(null);
      setShowTrafficDetail(false);
    } else {
      setLocalSelectedDate(null);
    }
  };

  const handleClose = () => {
    setLocalDate(null);
    setLocalSelectedDate(null);
    setSelectedGoal(null);
    setShowTrafficDetail(false);
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (!open) {
      setSelectedGoal(null);
      setShowTrafficDetail(false);
      setLocalDate(null);
      setLocalSelectedDate(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    setActiveTab(initialTab);
    setSelectedGoal(null);
    setShowTrafficDetail(false);

    if (initialSelectedDate) {
      setLocalSelectedDate(initialSelectedDate);
      setLocalDate(new Date(`${initialSelectedDate}T00:00:00`));
    } else {
      setLocalSelectedDate(null);
      setLocalDate(null);
    }
  }, [initialSelectedDate, initialTab, open]);

  React.useEffect(() => {
    if (localSelectedDate && open) {
      setSelectedGoal(null);
      setShowTrafficDetail(false);
    }
  }, [activeTab, localSelectedDate, open]);

  const isShowingDefaultWindow = localSelectedDate === null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="!right-0 !w-[min(44rem,calc(100vw-2rem))] !max-w-[min(44rem,calc(100vw-2rem))] gap-0 overflow-hidden border-l p-0">
        <SheetTitle className="sr-only">Anomalies Detected</SheetTitle>
        <div className="shrink-0 border-b border-general-border pl-6 pb-4 pt-10 pr-14 sm:pl-8">
          <div className="flex min-w-0 items-center gap-3">
            <Typography variant="h2" className="min-w-0 flex-1 text-general-foreground">
              Anomalies Detected
            </Typography>
            <div className="shrink-0 w-[200px] sm:w-[230px]">
              <AlertDateSelector
                selectedDate={localDate}
                onDateChange={handleDateChange}
                className="w-full"
              />
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "goals" | "traffic")}
          >
            <TabsList className="mt-4 h-auto w-full items-center justify-start gap-2 bg-primary-foreground p-1 sm:w-1/2">
              <TabsTrigger
                value="goals"
                className={cn(
                  "min-h-8 px-3 py-1.5 text-center",
                  isShowingDefaultWindow && activeTab === "goals"
                    ? "flex flex-col items-center justify-center gap-0.5"
                    : "flex items-center justify-center gap-1.5 self-center"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 leading-none">
                  <Target className="h-4 w-4" />
                  <span>Goals</span>
                  {totalGoalCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-0"
                    >
                      {totalGoalCount}
                    </Badge>
                  )}
                </div>
                {isShowingDefaultWindow && activeTab === "goals" && (
                  <span className="text-[9px] font-normal leading-none text-muted-foreground">
                    Showing default window
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="traffic"
                className={cn(
                  "min-h-8 px-3 py-1.5 text-center",
                  isShowingDefaultWindow && activeTab === "traffic"
                    ? "flex flex-col items-center justify-center gap-0.5"
                    : "flex items-center justify-center gap-1.5 self-center"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 leading-none">
                  <MousePointerClick className="h-4 w-4" />
                  <span>Traffic</span>
                  {hasTrafficAlert && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-0"
                    >
                      1
                    </Badge>
                  )}
                </div>
                {isShowingDefaultWindow && activeTab === "traffic" && (
                  <span className="text-[9px] font-normal leading-none text-muted-foreground">
                    Showing default window
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pl-6 py-5 pr-8 sm:pl-8 sm:pr-10">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "goals" | "traffic")}
          >
            <TabsContent value="goals" className="m-0 min-w-0">
              {displayIsLoadingGoals ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                </div>
              ) : selectedGoal ? (
                <GoalDetailView
                  goal={selectedGoal}
                  onBack={() => setSelectedGoal(null)}
                />
              ) : activeGoalRawState === "insufficient_history" ? (
                /* NEW 03: NONE baseline — Building-your-baseline empty state */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-3 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Building your baseline</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Anomaly detection needs at least 3 weeks of data. Check back soon.
                    </p>
                  </div>
                </div>
              ) : activeGoalRawState === "no_goal_tracking" ? (
                /* CHANGE 10: Distinct no-goal-tracking empty state */
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-snug">
                      Goal tracking not configured — showing organic traffic only
                    </p>
                  </div>
                  <div className="flex items-center justify-center py-12 px-4">
                    <div className="text-center space-y-3 max-w-xs">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Target className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Goal tracking not configured</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        No GA4 key events or conversions are set up for this business. Once goal tracking is configured, anomaly detection will run automatically.
                      </p>
                    </div>
                  </div>
                </div>
              ) : anomalyOnlyGoalData.length > 0 ? (
                /* CHANGE 13: Only tier === 'anomaly' cards shown */
                <div className="min-w-0 space-y-2">
                  {anomalyOnlyGoalData.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onClick={() => setSelectedGoal(goal)}
                    />
                  ))}
                </div>
              ) : (
                /* CHANGE 13: Zero-anomaly empty state with obs dates */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      No anomalies detected
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeObsStart && activeObsEnd
                        ? `Nothing unusual detected for ${formatSheetDate(activeObsStart)} to ${formatSheetDate(activeObsEnd, true)}`
                        : "Select a different date range to analyze"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="traffic" className="m-0 min-w-0">
              {displayIsLoadingTraffic ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                </div>
              ) : showTrafficDetail && displayTrafficData ? (
                <TrafficDetailView
                  traffic={displayTrafficData}
                  onBack={() => setShowTrafficDetail(false)}
                />
              ) : displayTrafficData && trafficTier === "anomaly" ? (
                /* CHANGE 13: Only render TrafficCard for tier === 'anomaly' */
                <div className="min-w-0">
                  <TrafficCard
                    traffic={displayTrafficData}
                    onClick={() => setShowTrafficDetail(true)}
                  />
                </div>
              ) : (
                /* CHANGE 13: candidate and normal tiers show zero-anomaly state; include obs dates */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      No anomalies detected
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeObsStart && activeObsEnd
                        ? `Nothing unusual detected for ${formatSheetDate(activeObsStart)} to ${formatSheetDate(activeObsEnd, true)}`
                        : "Select a different date range to analyze"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
