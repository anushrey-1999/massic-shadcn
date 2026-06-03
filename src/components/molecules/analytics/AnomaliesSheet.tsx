"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Target,
  MousePointerClick,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Info,
  Lightbulb,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDateSelector } from "./AlertDateSelector";
import { SourceFavicon } from "./SourceFavicon";
import { useGoalAnalysis } from "@/hooks/use-goal-analysis";
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis";
import type { GoalData, PageBreakdown, SourceBreakdown, Diagnosis, DailyPeak, AnomalyTier, HeadlineReel, Win } from "@/hooks/use-goal-analysis";
import type { TrafficData } from "@/hooks/use-traffic-analysis";

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
}

type TrackingQuality = "stable" | "uncertain";
type Direction = "up" | "down";

const getAnomalyConfig = (
  direction: Direction,
  trackingQuality: TrackingQuality = "stable",
) => {
  if (direction === "up") {
    return {
      label: trackingQuality === "uncertain" ? "Positive, verify" : "Positive",
      chipClass: "border-[#9FE1CB] bg-[#F0FDFA] text-[#0F6E56]",
      accentClass: "bg-[#1D9E75]",
      note: trackingQuality === "uncertain" ? "Looks positive - worth verifying tracking." : null,
    };
  }

  return {
    label: "Needs attention",
    chipClass: "border-[#F7C1C1] bg-[#FEF2F2] text-[#A32D2D]",
    accentClass: "bg-[#E24B4A]",
    note: null,
  };
};

type ReelColor = "neg" | "pos" | "flat" | "neutral";

const REEL_COLOR_CLS: Record<ReelColor, string> = {
  neg: "text-[#A32D2D]",
  pos: "text-[#0F6E56]",
  flat: "text-muted-foreground",
  neutral: "text-foreground",
};

const DIRECTION_TO_COLOR: Record<HeadlineReel["direction"], ReelColor> = {
  down: "neg",
  up: "pos",
  flat: "flat",
  neutral: "neutral",
};

function fmtAbsolute(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  if (abs < 1000) return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
  if (abs < 1_000_000) return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

function pctDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return `${sign}${Math.abs(normalized).toFixed(0)}%`;
}

function deltaColor(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-[#0F6E56]" : "text-[#A32D2D]";
}

function HeadlinePanel({
  reels,
  fallback,
  bottomLine,
}: {
  reels?: HeadlineReel[];
  fallback?: string;
  bottomLine?: string | null;
}) {
  const displayReels = reels?.length
    ? reels
    : fallback
      ? [{ text: fallback, direction: "neutral" as const }]
      : [];

  if (displayReels.length === 0 && !bottomLine) return null;

  return (
    <div className="rounded-lg bg-background/55 px-3 py-2">
      {displayReels.length > 0 ? (
        <p className="text-[14px] leading-[1.45]">
          {displayReels.map((reel, idx) => (
            <React.Fragment key={`${reel.text}-${idx}`}>
              {idx > 0 && <span className="mx-[6px] text-[18px] leading-none text-foreground/70">·</span>}
              <span className={REEL_COLOR_CLS[DIRECTION_TO_COLOR[reel.direction] || "neutral"]}>
                {reel.text}
              </span>
            </React.Fragment>
          ))}
        </p>
      ) : null}
      {bottomLine ? (
        <p className="mt-1 text-[12px] leading-[1.45] text-muted-foreground">
          {bottomLine}
        </p>
      ) : null}
    </div>
  );
}

function NoticeBar({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#FAC775] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#633806]">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#B45309]" />
      <span>{text}</span>
    </div>
  );
}

function InfoBar({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
      <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
      <span>{text}</span>
    </div>
  );
}

function DeltaPill({ value, percent }: { value: number; percent?: number }) {
  const positive = value > 0;
  const neutral = value === 0;
  const cls = neutral
    ? "border-border/60 bg-secondary/30 text-muted-foreground"
    : positive
      ? "border-[#9FE1CB] bg-[#F0FDFA] text-[#0F6E56]"
      : "border-[#F7C1C1] bg-[#FEF2F2] text-[#A32D2D]";

  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums", cls)}>
      {fmtAbsolute(value)} {percent !== undefined ? `(${pctDisplay(percent)})` : null}
    </span>
  );
}

function ChStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="text-right">
      <p className="mb-px text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">
        {label}
      </p>
      <p className={cn("text-[14px] font-medium tabular-nums", deltaColor(value))}>
        {fmtAbsolute(value)}
      </p>
    </div>
  );
}

function QueryChips({ queries }: { queries?: string[] }) {
  if (!queries?.length) return null;

  const colorMap: Record<string, string> = {
    default: "border-border/60 bg-background text-muted-foreground",
  };

  return (
    <div className="mt-1.5 flex min-w-0 max-w-full flex-wrap gap-1.5">
      {queries.slice(0, 6).map((query, idx) => (
        <Tooltip key={`${query}-${idx}`}>
          <TooltipTrigger asChild>
            <span className={cn(
              "max-w-full truncate rounded-full border px-2 py-[3px] text-[11px] sm:max-w-[220px]",
              colorMap.default,
            )}>
              {query}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
            {query}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

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

function metricLabel(metric: "goals" | "sessions" | "clicks" | "impr", value: number | null | undefined) {
  const base = metric === "goals" ? "Goals" : metric === "sessions" ? "Sessions" : metric === "clicks" ? "Clicks" : "Impr";
  if (!value) return base;
  return value > 0 ? `${base} gained` : `${base} lost`;
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
        <div key={idx} className="min-w-0 px-3 py-2.5 sm:px-4">
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block max-w-[320px] truncate font-mono text-[11px] text-muted-foreground">
                {getPageLabel(p.page)}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap gap-x-2 gap-y-1 text-[11px] tabular-nums sm:justify-end">
              {!isTraffic && p.delta_goals !== null && p.delta_goals !== undefined && (
                <span className={deltaColor(p.delta_goals)}>goals {fmtAbsolute(p.delta_goals)}</span>
              )}
              {!isTraffic && p.delta_sessions !== null && p.delta_sessions !== undefined && (
                <span className={deltaColor(p.delta_sessions)}>sessions {fmtAbsolute(p.delta_sessions)}</span>
              )}
              {p.delta_clicks !== null && p.delta_clicks !== undefined && (
                <span className={deltaColor(p.delta_clicks)}>clicks {fmtAbsolute(p.delta_clicks)}</span>
              )}
              {p.delta_impressions !== null && p.delta_impressions !== undefined && (
                <span className={deltaColor(p.delta_impressions)}>impr {fmtAbsolute(p.delta_impressions)}</span>
              )}
              {p.delta_position !== null && p.delta_position !== undefined && (
                <span>
                  <span className="text-muted-foreground">Pos </span>
                  <span className={cn("font-semibold", p.delta_position > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]")}>
                    {p.delta_position > 0 ? "↓" : "↑"}{Math.abs(p.delta_position).toFixed(1)}
                  </span>
                </span>
              )}
            </div>
          </div>

          <QueryChips queries={p.queries} />
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
  const visibleSources = sources
    .filter((source) => Math.abs(Number(source.delta_goals || source.delta_sessions || 0)) > 0)
    .slice(0, 10);
  const showFallbackPages = visibleSources.length === 0;

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/40 bg-white">
      <div className={cn("flex items-center justify-between gap-3 px-4 py-3", headerClass)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn("h-[22px] w-1 shrink-0 rounded-sm", accentBar)} />
          <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{channelName}</span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-4">
          <ChStat label={metricLabel(anchorUnit === "clicks" ? "clicks" : "goals", anchorDelta)} value={anchorDelta} />
          {deltaGoals !== undefined && deltaGoals !== anchorDelta && (
            <ChStat label={metricLabel(isTraffic ? "clicks" : "goals", deltaGoals)} value={deltaGoals} />
          )}
          {deltaSessions !== undefined && (
            <ChStat label={metricLabel(isTraffic ? "impr" : "sessions", deltaSessions)} value={deltaSessions} />
          )}
        </div>
      </div>

      {visibleSources.length > 0 && (
        <div className="divide-y divide-border/40 bg-background">
          {visibleSources.map((source, idx) => (
            <div key={`${source.key}-${idx}`} className="min-w-0">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <SourceFavicon sourceName={source.source || source.key || ""} fallback={isTraffic ? "search" : "auto"} />
                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                    {source.source || source.key || "Unknown source"}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-3">
                  {source.delta_goals !== undefined && (
                    <span className={cn("text-[12px] font-medium tabular-nums", deltaColor(source.delta_goals))}>{fmtAbsolute(source.delta_goals)}</span>
                  )}
                  {source.delta_sessions !== undefined && (
                    <span className={cn("text-[12px] font-medium tabular-nums", deltaColor(source.delta_sessions))}>{fmtAbsolute(source.delta_sessions)}</span>
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

function PartialBaselineChip({ historyDays }: { historyDays: number }) {
  const weeks = Math.floor(historyDays / 7);
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#FAC775] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-medium text-[#854F0B]">
      <Info className="h-3 w-3" />
      Limited history ({weeks} {weeks === 1 ? "week" : "weeks"})
    </span>
  );
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
        return (
          <div
            key={peak.date}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium sm:max-w-[220px]",
              isAnomaly
                ? isUp
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
                : isUp
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            <span>{formatPeakDate(peak.date)}</span>
            <span className="font-semibold">{formatPeakDeltaPct(peak.delta_pct)}</span>
            <span className="text-muted-foreground/80">{unit}</span>
          </div>
        );
      })}
    </div>
  );
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
  open: boolean;
  onToggle: () => void;
}

function PositivePointCards({ wins }: { wins: Win[] }) {
  const visiblePoints = wins.filter((win) => Number(win.delta || 0) > 0).slice(0, 3);
  if (visiblePoints.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visiblePoints.map((win, idx) => (
        <span
          key={`${win.text}-${idx}`}
          className="inline-flex min-w-0 rounded-md border border-[#9FE1CB] bg-[#F0FDFA] px-2 py-1 text-[11px] font-medium leading-snug text-[#0F6E56]"
        >
          <span className="break-words">{win.text}</span>
        </span>
      ))}
    </div>
  );
}

function LikelyDrivers({ diagnoses }: { diagnoses: Diagnosis[] }) {
  if (diagnoses.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854F0B]">
        <Lightbulb className="h-3.5 w-3.5 text-[#B45309]" />
        Likely drivers
      </div>
      <div className="space-y-2">
        {diagnoses.slice(0, 2).map((diagnosis, idx) => {
          const label = diagnosis.label || diagnosis.cause_category || diagnosis.cause_code?.replace(/_/g, " ");
          return (
            <div
              key={`${diagnosis.cause_code}-${idx}`}
              className="min-w-0 overflow-hidden rounded-lg border border-[#FAC775]/70 bg-[#FFFBEB]/70"
            >
              <div className="flex min-w-0 gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#FAC775] bg-white text-[10px] font-semibold tabular-nums text-[#854F0B]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {label ? (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#854F0B]/80">
                      {label}
                    </p>
                  ) : null}
                  <p className="min-w-0 break-words text-[12px] leading-5 text-[#633806]">
                    {fallbackDriverText(diagnosis)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalExpandedContent({ goal }: { goal: GoalData }) {
  const config = getAnomalyConfig(goal.direction, goal.trackingQuality);
  const isNegative = goal.direction === "down";
  const isPartial = goal.baselineStatus === "PARTIAL";
  const diagnosesToRender = dedupeDiagnosesByCause([
    goal.primaryDiagnosis,
    ...(goal.contributingDiagnoses || []),
    ...(goal.diagnoses || []),
  ]).filter(Boolean).slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {isNegative && goal.largePositionDrop ? (
          <NoticeBar text="Pages moved far down in search results this week — worth checking for technical issues." />
        ) : null}
        {goal.anomalousComparisonPeriod ? (
          <NoticeBar text="Prior period was unusually high/low — this anomaly score may be inflated." />
        ) : null}
        {isPartial ? (
          <NoticeBar text={`Analysis based on ${Math.floor(goal.historyDays / 7)} weeks of history — results may be less reliable than usual.`} />
        ) : null}
      </div>

      {isNegative && goal.actual !== undefined && goal.expected !== undefined ? (
        <p className="text-xs leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">{Math.round(goal.actual).toLocaleString()}</span> conversions this week, compared to an average of <span className="font-medium text-foreground">{Math.round(goal.expected).toLocaleString()}</span> over the past 8 weeks.
        </p>
      ) : null}

      {isNegative && goal.crossEventContext ? (
        <p className="text-[11px] italic leading-snug text-muted-foreground">{goal.crossEventContext}</p>
      ) : null}

      {goal.direction === "up" ? <PositivePointCards wins={goal.wins} /> : null}

      {goal.contextLine ? (
        <p className="text-xs leading-snug text-muted-foreground">{goal.contextLine}</p>
      ) : null}

      {config.note ? <InfoBar text={config.note} /> : null}

      <LikelyDrivers diagnoses={diagnosesToRender} />

      {goal.topContributors.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Top contributors
          </div>
          <div className="space-y-2">
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
      ) : null}
    </div>
  );
}

function GoalCard({ goal, open, onToggle }: GoalCardProps) {
  const config = getAnomalyConfig(goal.direction, goal.trackingQuality);
  const isPartial = goal.baselineStatus === "PARTIAL";

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-white transition-shadow duration-200 ease-out">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-secondary/20 sm:px-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 h-6 w-[3px] shrink-0 rounded-full", config.accentClass)} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="truncate font-mono text-[14px] font-medium">{goal.title}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", config.chipClass)}>
                  {config.label}
                </span>
                <DeltaPill value={goal.delta} percent={goal.deltaPct} />
              </div>
            </div>
            {isPartial ? (
              <div className="mt-1.5">
                <PartialBaselineChip historyDays={goal.historyDays} />
              </div>
            ) : null}
            <div className="mt-1.5">
              <HeadlinePanel
                reels={goal.headlineReels}
                fallback={goal.primaryCause}
                bottomLine={goal.bottomLine}
              />
            </div>
            <DailyPeakChips peaks={goal.dailyPeaks} unit="conversions" />
          </div>
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      <div className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn(
            "min-w-0 max-w-full space-y-4 overflow-hidden border-t border-border/50 bg-background/45 px-3 py-3 transition-opacity duration-150 ease-out sm:px-4",
            open ? "opacity-100" : "opacity-0",
          )}>
            <GoalExpandedContent goal={goal} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrafficCardProps {
  traffic: TrafficData;
  open: boolean;
  onToggle: () => void;
}

function TrafficExpandedContent({ traffic }: { traffic: TrafficData }) {
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.tracking_quality || "stable",
  );
  const isNegative = traffic.direction === "down";
  const isPartial = (traffic.baseline_status || traffic.baseline?.status) === "PARTIAL";
  const historyDays = traffic.history_days || traffic.baseline?.history_days || 0;
  const anomalousComparisonPeriod = traffic.baseline?.anomalous_comparison_period ?? false;
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
    <div className="space-y-4">
      <div className="space-y-2">
        {anomalousComparisonPeriod ? (
          <NoticeBar text="Prior period was unusually high/low — this anomaly score may be inflated." />
        ) : null}
        {isPartial ? (
          <NoticeBar text={`Analysis based on ${Math.floor(historyDays / 7)} weeks of history — results may be less reliable than usual.`} />
        ) : null}
        {isNegative && (traffic.large_position_drop || traffic.narrative?.large_position_drop) ? (
          <NoticeBar text="Pages moved far down in search results this week — worth checking for technical issues." />
        ) : null}
      </div>

      {traffic.narrative?.context_line ? (
        <p className="text-xs leading-snug text-muted-foreground">{traffic.narrative.context_line}</p>
      ) : null}

      {attributionCopy ? <InfoBar text={attributionCopy} /> : null}

      {config.note ? <InfoBar text={config.note} /> : null}

      <LikelyDrivers diagnoses={diagnosesToRender.slice(0, 2) as Diagnosis[]} />

      {trafficSplit ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Traffic split
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/50 bg-white p-2.5">
              <p className="mb-0.5 text-[10px] text-muted-foreground">Brand</p>
              <p className="text-lg font-bold text-foreground">{trafficSplit.brand_pct}%</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtAbsolute(trafficSplit.brand_delta)} clicks</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-white p-2.5">
              <p className="mb-0.5 text-[10px] text-muted-foreground">Non-Brand</p>
              <p className="text-lg font-bold text-foreground">{100 - trafficSplit.brand_pct}%</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtAbsolute(trafficSplit.nonbrand_delta)} clicks</p>
            </div>
          </div>
        </div>
      ) : null}

      {topContributors.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Top pages
          </div>
          <div className="space-y-2">
            {topContributors.map((contributor, idx) => (
              <ChannelBlock
                key={`${contributor.key || "page"}-${idx}`}
                channelName={contributor.key || "Unknown page"}
                anchorDelta={contributor.delta_clicks ?? 0}
                anchorUnit="clicks"
                deltaGoals={contributor.delta_clicks}
                deltaSessions={(contributor as { delta_impressions?: number }).delta_impressions}
                pages={(contributor as { queries?: string[] }).queries?.map((query) => ({
                  page: contributor.key || "",
                  delta_goals: 0,
                  delta_sessions: 0,
                  queries: [query],
                })) || undefined}
                isTraffic={true}
              />
            ))}
          </div>
        </div>
      ) : null}

      {topQueries.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Top queries
          </div>
          <div className="space-y-2">
            {topQueries.map((contributor, idx) => (
              <ChannelBlock
                key={`${contributor.key || "query"}-${idx}`}
                channelName={contributor.key || "Unknown query"}
                anchorDelta={contributor.delta_clicks ?? 0}
                anchorUnit="clicks"
                isTraffic={true}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TrafficCard({ traffic, open, onToggle }: TrafficCardProps) {
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.tracking_quality || "stable",
  );
  const isPartial = (traffic.baseline_status || traffic.baseline?.status) === "PARTIAL";
  const historyDays = traffic.history_days || traffic.baseline?.history_days || 0;
  const dailyPeaks = (traffic.detection?.daily_peaks || []) as DailyPeak[];

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-white transition-shadow duration-200 ease-out">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-secondary/20 sm:px-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 h-6 w-[3px] shrink-0 rounded-full", config.accentClass)} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="truncate font-mono text-[14px] font-medium">Organic traffic</span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", config.chipClass)}>
                  {config.label}
                </span>
                <DeltaPill value={traffic.delta_clicks} percent={traffic.delta_pct} />
              </div>
            </div>
            {isPartial ? (
              <div className="mt-1.5">
                <PartialBaselineChip historyDays={historyDays} />
              </div>
            ) : null}
            <div className="mt-1.5">
              <HeadlinePanel
                reels={traffic.narrative?.headline_reels}
                fallback={traffic.narrative?.headline || "Traffic Anomaly"}
                bottomLine={traffic.narrative?.bottom_line}
              />
            </div>
            <DailyPeakChips peaks={dailyPeaks} unit="clicks" />
          </div>
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      <div className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn(
            "min-w-0 max-w-full space-y-4 overflow-hidden border-t border-border/50 bg-background/45 px-3 py-3 transition-opacity duration-150 ease-out sm:px-4",
            open ? "opacity-100" : "opacity-0",
          )}>
            <TrafficExpandedContent traffic={traffic} />
          </div>
        </div>
      </div>
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
}: AnomaliesSheetProps) {
  const [activeTab, setActiveTab] = React.useState<"goals" | "traffic">(
    "goals"
  );
  const [localDate, setLocalDate] = React.useState<Date | null>(null);
  const [expandedGoalId, setExpandedGoalId] = React.useState<string | null>(null);
  const [trafficExpanded, setTrafficExpanded] = React.useState(false);
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
      setExpandedGoalId(null);
      setTrafficExpanded(false);
    } else {
      setLocalSelectedDate(null);
    }
  };

  const handleClose = () => {
    setLocalDate(null);
    setLocalSelectedDate(null);
    setExpandedGoalId(null);
    setTrafficExpanded(false);
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (!open) {
      setExpandedGoalId(null);
      setTrafficExpanded(false);
      setLocalDate(null);
      setLocalSelectedDate(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (localSelectedDate && open) {
      setExpandedGoalId(null);
      setTrafficExpanded(false);
    }
  }, [activeTab, localSelectedDate, open]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full gap-0 overflow-hidden border-l border-general-border p-0 pt-8 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-general-border bg-background px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <SheetTitle className="min-w-0 flex-1 text-base font-semibold tracking-tight">
              Anomalies Detected
            </SheetTitle>
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
                  localSelectedDate && activeTab === "goals"
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
                {localSelectedDate && activeTab === "goals" && (
                  <span className="text-[9px] font-normal leading-none text-muted-foreground">
                    Showing default window
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="traffic"
                className={cn(
                  "min-h-8 px-3 py-1.5 text-center",
                  localSelectedDate && activeTab === "traffic"
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
                {localSelectedDate && activeTab === "traffic" && (
                  <span className="text-[9px] font-normal leading-none text-muted-foreground">
                    Showing default window
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "goals" | "traffic")}
          >
            <TabsContent value="goals" className="m-0 min-w-0">
              {displayIsLoadingGoals ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-2">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading insights...</p>
                  </div>
                </div>
              ) : activeGoalRawState === "insufficient_history" ? (
                /* NEW 03: NONE baseline — Building-your-baseline empty state */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-3 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Info className="h-5 w-5 text-muted-foreground" />
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
                  <InfoBar text="Goal tracking not configured — showing organic traffic only" />
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
                      open={expandedGoalId === goal.id}
                      onToggle={() => setExpandedGoalId((current) => current === goal.id ? null : goal.id)}
                    />
                  ))}
                </div>
              ) : (
                /* CHANGE 13: Zero-anomaly empty state with obs dates */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Target className="h-5 w-5 text-muted-foreground" />
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
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading insights...</p>
                  </div>
                </div>
              ) : displayTrafficData && trafficTier === "anomaly" ? (
                /* CHANGE 13: Only render TrafficCard for tier === 'anomaly' */
                <div className="min-w-0">
                  <TrafficCard
                    traffic={displayTrafficData}
                    open={trafficExpanded}
                    onToggle={() => setTrafficExpanded((current) => !current)}
                  />
                </div>
              ) : (
                /* CHANGE 13: candidate and normal tiers show zero-anomaly state; include obs dates */
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Search className="h-5 w-5 text-muted-foreground" />
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
