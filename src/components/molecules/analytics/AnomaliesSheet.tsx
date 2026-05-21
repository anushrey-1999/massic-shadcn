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
  Sparkles,
  Lightbulb,
  ArrowRight,
  Activity,
  Zap,
  Clock,
  Eye,
  BarChart3,
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
import type { GoalData, GoalContributor, Diagnosis, DailyPeak, AnomalyTier } from "@/hooks/use-goal-analysis";
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
}

type TrackingQuality = "stable" | "uncertain";
type Direction = "up" | "down";

const severityLabel = (severity: string) =>
  severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Notice";

const getAnomalyConfig = (
  direction: Direction,
  severity: string,
  trackingQuality: TrackingQuality = "stable",
  tier: AnomalyTier = "anomaly"
) => {
  // Candidate tier renders in muted grey with a "Worth watching" sentiment so
  // the user always gets context even when movement is below the hard anomaly
  // threshold.
  if (tier === "candidate") {
    return {
      icon: AlertCircle,
      label: severityLabel(severity),
      sentimentLabel: "Worth watching",
      borderColor: "border-l-slate-300",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      iconColor: "text-slate-500",
      textColor: "text-slate-700",
      bgColor: "bg-slate-100",
      cardClass: "bg-slate-50/50",
      note: "Small change this week — worth keeping an eye on.",
    };
  }

  if (direction === "up") {
    return {
      icon: trackingQuality === "uncertain" ? AlertTriangle : CheckCircle,
      label: severityLabel(severity),
      sentimentLabel: trackingQuality === "uncertain" ? "Positive, verify" : "Positive",
      borderColor: "border-l-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      cardClass: "bg-emerald-50/35",
      note: trackingQuality === "uncertain" ? "Looks positive - worth verifying tracking." : null,
    };
  }

  return {
    icon: AlertCircle,
    label: severityLabel(severity),
    sentimentLabel: "Needs attention",
    borderColor: "border-l-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    iconColor: "text-slate-600",
    textColor: "text-slate-700",
    bgColor: "bg-slate-100",
    cardClass: "bg-slate-50/70",
    note: null,
  };
};

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
                  : "border-slate-300 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
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

function diagnosisTitle(diagnosis: Diagnosis) {
  const labels: Record<string, string> = {
    RANK_DROP: "Ranking decline",
    CTR_DROP: "Search result click-through dropped",
    CTR_DROP_SNIPPET: "Search result click-through dropped",
    DEMAND_SOFTNESS: "Lower search demand",
    MOBILE_UX: "Mobile experience issue",
    GEO_ISSUE: "Regional performance issue",
    CVR_DROP: "Conversion rate changed",
    SERP_FEATURE_IMPACT: "Search results page changed",
    TECHNICAL_ISSUE: "Possible technical issue",
    PAGE_REMOVED: "Pages lost visibility",
  };

  return diagnosis.label || labels[diagnosis.cause_code] || diagnosis.cause_code.replace(/_/g, " ");
}

function managerInsight(text: string) {
  if (/severity|confidence/i.test(text)) return null;
  if (/brand queries:\s*0 clicks\s*\|\s*non-brand:\s*0 clicks/i.test(text)) return null;
  return text
    .replace(/\s*\((?:[^)]*(?:delta|z-score|score|CVR|CTR|position)[^)]*)\)/gi, "")
    .replace(/\bCVR\b/g, "conversion rate")
    .replace(/\bCTR\b/g, "click-through rate");
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

function EvidenceExample({ example }: { example: Record<string, string | number | boolean | null | undefined> }) {
  const allowedKeys = new Set(["page", "query"]);
  const entries = Object.entries(example).filter(([key, value]) => (
    allowedKeys.has(key) && value !== null && value !== undefined && value !== ""
  ));

  if (entries.length === 0) return null;

  return (
    <div className="min-w-0 rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
      {entries.map(([key, value]) => (
        <div key={key} className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-1">
          <span className="shrink-0 capitalize text-muted-foreground/80">
            {key.replace(/_/g, " ")}
          </span>
          <span className="min-w-0 break-all text-foreground/80">
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  );
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
  const config = getAnomalyConfig(goal.direction, goal.impactSeverity, goal.trackingQuality, goal.tier);
  const Icon = config.icon;
  const isNegative = goal.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 text-left rounded-xl border-l-4 p-3 transition-all hover:shadow-md",
        config.borderColor,
        config.cardClass,
        "border border-border/50 hover:border-border"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium px-1.5 py-0",
                config.badgeClass
              )}
            >
              {config.label} impact
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.sentimentLabel}
            </Badge>
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold",
                config.bgColor
              )}
            >
              <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
              <span className={config.iconColor}>{goal.percentage}</span>
            </div>
          </div>

          <h3 className="break-words text-sm font-semibold text-foreground line-clamp-1">
            {goal.title}
          </h3>

          <p className="break-words text-xs leading-snug line-clamp-2 text-muted-foreground">
            {goal.primaryCause}
          </p>
          <DailyPeakChips peaks={goal.dailyPeaks} unit="conversions" />
          {config.note && (
            <p className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              goal.tier === "candidate" ? "text-slate-600" : "text-emerald-700"
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
  const config = getAnomalyConfig(goal.direction, goal.impactSeverity, goal.trackingQuality, goal.tier);
  const Icon = config.icon;
  const isNegative = goal.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  const diagnosesToRender = compactDiagnoses(goal.primaryDiagnosis, goal.contributingDiagnoses, goal.diagnoses);
  const topContributors = collapseDisplayContributors(goal.topContributors).slice(0, 10);

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

          <div
            className={cn(
              "min-w-0 rounded-xl p-4 border-l-4",
              config.borderColor,
              config.cardClass,
              "border"
            )}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5",
                  config.badgeClass
                )}
              >
                {config.label} impact
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {config.sentimentLabel}
              </Badge>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
                  config.bgColor
                )}
              >
                <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                <span className={config.iconColor}>{goal.percentage}</span>
              </div>
            </div>

            <h2 className="break-words text-sm font-bold text-foreground leading-tight mb-2">
              {goal.title}
            </h2>

            <p className="break-words text-xs leading-relaxed text-muted-foreground">
              {goal.primaryCause}
            </p>
            <DailyPeakChips peaks={goal.dailyPeaks} unit="conversions" />
            {config.note && (
              <p className={cn(
                "mt-2 text-[11px] font-medium flex items-center gap-1",
                goal.tier === "candidate" ? "text-slate-600" : "text-emerald-700"
              )}>
                <Icon className="h-3 w-3" />
                {config.note}
              </p>
            )}
          </div>
        </div>

        {goal.summaryBullets && goal.summaryBullets.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              Key Insights
            </h3>
            <ul className="space-y-1.5">
              {goal.summaryBullets.map(managerInsight).filter(Boolean).slice(0, 3).map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 break-words leading-snug pt-0.5">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diagnosesToRender.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Likely Drivers
            </h3>
            <div className="space-y-2">
              {diagnosesToRender.map((diagnosis, idx) => (
                <div key={idx} className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="min-w-0 break-words text-xs font-semibold text-foreground flex-1 leading-tight">
                      {idx === 0 ? "Primary: " : ""}
                      {diagnosisTitle(diagnosis)}
                    </h4>
                  </div>

                  {diagnosis.rationale && (
                    <p className="break-words text-xs text-muted-foreground mb-2 leading-snug">
                      {diagnosis.rationale}
                    </p>
                  )}

                  {diagnosis.evidence_examples && diagnosis.evidence_examples.length > 0 && (
                    <div className="mt-2 grid gap-1">
                      {diagnosis.evidence_examples.slice(0, 3).map((example, exampleIdx) => (
                        <EvidenceExample key={exampleIdx} example={example} />
                      ))}
                    </div>
                  )}

                  {diagnosis.suggested_actions &&
                    diagnosis.suggested_actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-[10px] font-semibold text-foreground mb-1.5">
                          Actions:
                        </p>
                        <ul className="space-y-1">
                          {diagnosis.suggested_actions.map(
                            (action: string, actionIdx: number) => (
                              <li
                                key={actionIdx}
                                className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground"
                              >
                                <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="min-w-0 break-words leading-snug">{action}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {topContributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              Top Contributors
            </h3>
            <div className="space-y-1.5">
              {topContributors.map((contributor, idx) => (
                <div key={`${idx}-${contributor.key || contributor.page || ""}`} className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-medium text-foreground line-clamp-1">
                        {contributor.key || contributor.page || "Unknown contributor"}
                      </p>
                      {contributor.classification && (
                        <p className="break-words text-[11px] text-muted-foreground">{contributor.classification}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                      {formatImpact(contributor.delta_conversions, "conversions")}
                    </Badge>
                  </div>
                </div>
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
  const tier = (traffic.tier || traffic.detection?.tier || "anomaly") as AnomalyTier;
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.severity || "medium",
    traffic.tracking_quality || "stable",
    tier
  );
  const Icon = config.icon;
  const isNegative = traffic.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
  const dailyPeaks = (traffic.detection?.daily_peaks || []) as DailyPeak[];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 text-left rounded-xl border-l-4 p-3 transition-all hover:shadow-md",
        config.borderColor,
        config.cardClass,
        "border border-border/50 hover:border-border"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium px-1.5 py-0",
                config.badgeClass
              )}
            >
              {config.label} impact
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.sentimentLabel}
            </Badge>
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold",
                config.bgColor
              )}
            >
              <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
              <span className={config.iconColor}>
                {isNegative ? "-" : "+"}
                {formatPercent(traffic.delta_pct)}
              </span>
            </div>
          </div>

          <h3 className="break-words text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {traffic.narrative?.headline || "Traffic Anomaly"}
          </h3>
          <DailyPeakChips peaks={dailyPeaks} unit="clicks" />
          {config.note && (
            <p className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              tier === "candidate" ? "text-slate-600" : "text-emerald-700"
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
  const tier = (traffic.tier || traffic.detection?.tier || "anomaly") as AnomalyTier;
  const config = getAnomalyConfig(
    traffic.direction,
    traffic.severity || "medium",
    traffic.tracking_quality || "stable",
    tier
  );
  const Icon = config.icon;
  const isNegative = traffic.direction === "down";
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;
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
  const trafficInsights = (traffic.narrative?.summary_bullets || [])
    .map(managerInsight)
    .filter(Boolean)
    .slice(0, 3);
  const trafficSplit = hasMeaningfulTrafficSplit(traffic.narrative?.brand_split)
    ? traffic.narrative?.brand_split
    : null;
  const attributionCopy = attributionMessage(traffic);

  const actionCategories = {
    urgent: traffic.narrative?.actions?.urgent || [],
    important: traffic.narrative?.actions?.important || [],
    monitor: traffic.narrative?.actions?.monitoring || [],
  };

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

          <div
            className={cn(
              "min-w-0 rounded-xl p-4 border-l-4",
              config.borderColor,
              config.cardClass,
              "border"
            )}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5",
                  config.badgeClass
                )}
              >
                {config.label} impact
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {config.sentimentLabel}
              </Badge>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
                  config.bgColor
                )}
              >
                <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                <span className={config.iconColor}>
                  {isNegative ? "-" : "+"}
                  {formatPercent(traffic.delta_pct)}
                </span>
              </div>
            </div>

            <h2 className="break-words text-sm font-bold text-foreground leading-tight">
              {traffic.narrative?.headline || "Traffic Anomaly"}
            </h2>
            <DailyPeakChips peaks={dailyPeaks} unit="clicks" />
            {config.note && (
              <p className={cn(
                "mt-2 text-[11px] font-medium flex items-center gap-1",
                tier === "candidate" ? "text-slate-600" : "text-emerald-700"
              )}>
                <Icon className="h-3 w-3" />
                {config.note}
              </p>
            )}
          </div>
        </div>

        {trafficInsights.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Insights
              </h3>
              <ul className="space-y-1.5">
                {trafficInsights.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 break-words leading-snug pt-0.5">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {attributionCopy && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="break-words text-xs text-muted-foreground leading-snug">
              {attributionCopy}
            </p>
          </div>
        )}

        {diagnosesToRender.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Likely Drivers
            </h3>
            <div className="space-y-2">
              {diagnosesToRender.map((diagnosis, idx) => (
                <div key={`${diagnosis.cause_code}-${idx}`} className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="min-w-0 break-words text-xs font-semibold text-foreground flex-1 leading-tight">
                      {idx === 0 ? "Primary: " : ""}
                      {diagnosisTitle(diagnosis)}
                    </h4>
                  </div>
                  <p className="break-words text-xs text-muted-foreground leading-snug">
                    {diagnosis.detail || diagnosis.rationale}
                  </p>
                  {diagnosis.evidence_examples && diagnosis.evidence_examples.length > 0 && (
                    <div className="mt-2 grid gap-1">
                      {diagnosis.evidence_examples.slice(0, 3).map((example, exampleIdx) => (
                        <EvidenceExample key={exampleIdx} example={example} />
                      ))}
                    </div>
                  )}
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
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  Brand
                </p>
                <p className="text-lg font-bold text-foreground">
                  {trafficSplit.brand_pct}%
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatImpact(trafficSplit.brand_delta, "clicks")}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  Non-Brand
                </p>
                <p className="text-lg font-bold text-foreground">
                  {100 - trafficSplit.brand_pct}%
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatImpact(trafficSplit.nonbrand_delta, "clicks")}
                </p>
              </div>
            </div>
          </div>
        )}

        {topContributors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                Top Pages
              </h3>
              <div className="space-y-1.5">
                {topContributors.map((contributor, idx) => (
                  <div key={idx} className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-2.5">
                    <div className="flex min-w-0 items-start justify-between gap-3 mb-1">
                      <p className="min-w-0 break-words text-xs font-medium text-foreground flex-1 leading-tight line-clamp-1">
                        {contributor.key}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                        {formatImpact(contributor.delta_clicks, "clicks")}
                      </Badge>
                    </div>
                    {contributor.classification && (
                      <p className="break-words text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {contributor.classification}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {topQueries.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">
              Top Queries
            </h3>
            <div className="space-y-1.5">
              {topQueries.map((contributor, idx) => (
                <div key={`${contributor.key}-${idx}`} className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-2.5">
                  <div className="flex min-w-0 items-start justify-between gap-3 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="min-w-0 break-words text-xs font-medium text-foreground leading-tight line-clamp-1">
                        {contributor.key}
                      </p>
                      {contributor.parent_key && (
                        <p className="mt-0.5 break-words text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {contributor.parent_key}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                      {formatImpact(contributor.delta_clicks, "clicks")}
                    </Badge>
                  </div>
                  {contributor.classification && (
                    <p className="break-words text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {contributor.classification}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {traffic.narrative?.actions &&
          (traffic.narrative.actions.urgent?.length > 0 ||
            traffic.narrative.actions.important?.length > 0 ||
            traffic.narrative.actions.monitoring?.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                Actions
              </h3>
              <div className="space-y-2">
                {actionCategories.urgent.length > 0 && (
                  <div className="rounded-lg border bg-red-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className="h-3 w-3 text-red-500" />
                      <h4 className="text-xs font-semibold text-red-700">
                        Urgent
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {actionCategories.urgent.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex min-w-0 items-start gap-1.5 text-[11px] text-red-600"
                        >
                          <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="min-w-0 break-words leading-snug">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {actionCategories.important.length > 0 && (
                  <div className="rounded-lg border bg-amber-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <h4 className="text-xs font-semibold text-amber-700">
                        Important
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {actionCategories.important.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex min-w-0 items-start gap-1.5 text-[11px] text-amber-600"
                        >
                          <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="min-w-0 break-words leading-snug">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {actionCategories.monitor.length > 0 && (
                  <div className="rounded-lg border bg-blue-50/50 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Eye className="h-3 w-3 text-blue-500" />
                      <h4 className="text-xs font-semibold text-blue-700">
                        Monitor
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {actionCategories.monitor.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex min-w-0 items-start gap-1.5 text-[11px] text-blue-600"
                        >
                          <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="min-w-0 break-words leading-snug">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
    criticalCount: localCriticalCount,
    warningCount: localWarningCount,
    positiveCount: localPositiveCount,
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
  const displayCriticalCount =
    localSelectedDate !== null ? localCriticalCount : defaultCriticalCount;
  const displayWarningCount =
    localSelectedDate !== null ? localWarningCount : defaultWarningCount;
  const displayPositiveCount =
    localSelectedDate !== null ? localPositiveCount : defaultPositiveCount;
  const displayIsLoadingGoals =
    localSelectedDate !== null ? localIsLoadingGoals : defaultIsLoadingGoals;

  const displayTrafficData =
    localSelectedDate !== null ? localTrafficData : defaultTrafficData;
  const displayIsLoadingTraffic =
    localSelectedDate !== null
      ? localIsLoadingTraffic
      : defaultIsLoadingTraffic;

  const totalGoalCount =
    displayCriticalCount + displayWarningCount + displayPositiveCount;
  const trafficTier = (displayTrafficData?.tier || displayTrafficData?.detection?.tier) as AnomalyTier | undefined;
  const hasTrafficAlert = displayTrafficData !== null && trafficTier !== "normal";

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
    if (localSelectedDate && open) {
      setSelectedGoal(null);
      setShowTrafficDetail(false);
    }
  }, [activeTab, localSelectedDate, open]);

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
            <TabsList className="mt-4 h-auto w-full justify-start gap-2 bg-primary-foreground p-1 sm:w-1/2">
              <TabsTrigger
                value="goals"
                className="flex items-center gap-1.5 px-3 py-1.5"
              >
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
              </TabsTrigger>
              <TabsTrigger
                value="traffic"
                className="flex items-center gap-1.5 px-3 py-1.5"
              >
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
              ) : displayGoalData.length > 0 ? (
                <div className="min-w-0 space-y-2">
                  {displayGoalData.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onClick={() => setSelectedGoal(goal)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      No goal anomalies
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Select a different date range to analyze
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
              ) : displayTrafficData ? (
                (() => {
                  const trafficTier = (displayTrafficData.tier || displayTrafficData.detection?.tier || "anomaly") as AnomalyTier;
                  if (trafficTier === "normal") {
                    return (
                      <NormalTierRow
                        title={displayTrafficData.entity_name || "Organic clicks"}
                        actual={displayTrafficData.detection?.actual}
                        expected={displayTrafficData.detection?.expected}
                        deltaPct={displayTrafficData.detection?.delta_pct ?? displayTrafficData.delta_pct ?? 0}
                        unit="clicks"
                        peaks={displayTrafficData.detection?.daily_peaks}
                      />
                    );
                  }
                  return (
                    <div className="min-w-0">
                      <TrafficCard
                        traffic={displayTrafficData}
                        onClick={() => setShowTrafficDetail(true)}
                      />
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center space-y-2 max-w-xs">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      No traffic anomalies
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Select a different date range to analyze
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
