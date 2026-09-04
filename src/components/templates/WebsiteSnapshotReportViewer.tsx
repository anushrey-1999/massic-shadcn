"use client";

import * as React from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { generatePdfFromWebsiteSnapshotReport } from "@/utils/pdf-generator";
import {
  type WebsiteSnapshotReport,
  websiteSnapshotReportToMarkdown,
  issueSeverityTone,
  issueSeverityLabel,
  ladderStatusKey,
  ladderStatusLabel,
  formatUncapturedMoneyShare,
} from "@/utils/website-snapshot-report";

type WebsiteSnapshotReportViewerProps = {
  report: WebsiteSnapshotReport;
  poweredByName?: string;
  mode?: "private" | "public";
  onBack?: () => void;
  onShare?: () => void;
  isSharing?: boolean;
};

function stripUrlProtocol(value: string): string {
  return String(value || "").replace(/^https?:\/\//i, "").replace(/\/$/i, "");
}

/**
 * Website Snapshot Report Viewer matching the updated HTML mockup design
 * Based on Snapshot-Mockup-Wares.html and Snapshot-FE-Field-Map.md
 */
/**
 * Color system from Snapshot-Mockup-Wares.html
 */
const COLORS = {
  green: '#123c28',
  greenSoft: '#e7efe9',
  greenLine: '#2f6b4a',
  red: '#b0566b',
  redSoft: '#f6e9ec',
  amber: '#9c7a2f',
  amberSoft: '#f5eeda',
  ink: '#1c1f1d',
  muted: '#6d726f',
  faint: '#9aa09c',
  hair: '#e6e8e3',
  paper: '#ffffff',
  bg: '#f2f2ec',
} as const;

export function WebsiteSnapshotReportViewer({
  report,
  poweredByName,
  mode = "private",
  onBack,
  onShare,
  isSharing = false,
}: WebsiteSnapshotReportViewerProps) {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const isPublic = mode === "public";
  
  const meta = report.meta || {};
  const businessName = meta.business_name || "Business";
  const website = stripUrlProtocol(meta.url || "");
  const location = meta.location || "";
  const phone = (() => {
    try {
      return meta.phone ? decodeURIComponent(String(meta.phone)) : "";
    } catch {
      return meta.phone || "";
    }
  })();
  const reportDate = meta.report_date || "";
  const businessDescription = meta.business_description || "";
  
  // Render flags only gate sections built from scalars, where a missing value and a
  // zero look identical. List-backed sections render whenever the list has content,
  // so a stale flag can never hide data the report actually contains.
  const render = report.render || {
    hero: true,
    stats_row: true,
    trend_chart: true,
    brand_split: true,
    intent_mix: true,
    scale_comparison: true,
    goal_chain: true,
    health_table: true,
    technology_chips: true,
    coverage_map: true,
    tactics: true,
  };
  
  const tier = report.tier || {};
  const goal = report.goal || {};
  const search = report.search || {};
  const intentMix = report.intent_mix || {};
  const scaleComparison = report.scale_comparison;
  const competitorBuckets = report.competitor_buckets || {};
  // shows_up / should_be arrive at the report root in some runs and nested under
  // competitor_buckets in others. An empty container at either location must not
  // shadow a populated one, so prefer whichever actually carries content.
  const showsUp =
    (Object.keys(report.shows_up || {}).length ? report.shows_up : null) ||
    competitorBuckets.shows_up ||
    {};
  const shouldBe =
    (report.should_be?.length ? report.should_be : null) ||
    (competitorBuckets.should_be?.length ? competitorBuckets.should_be : null) ||
    [];
  const shouldBeNote = report.should_be_note || competitorBuckets.should_be_note || "";
  const directNote = String(showsUp.direct_note || "").trim();
  const setupLine = String(competitorBuckets.setup?.market || "").trim();
  const underTheHood = report.under_the_hood || {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const ladder = Array.isArray(report.ladder) ? report.ladder : [];
  const tactics = Array.isArray(report.tactics) ? report.tactics : [];
  const beats = Array.isArray(report.beats) ? report.beats : [];
  const callouts = Array.isArray(report.overview_callouts) ? report.overview_callouts : [];
  const verdict = String(report.verdict || report.hero?.label || "").trim();
  const verdictSub = String(report.verdict_sub || report.hero?.description || "").trim();
  const metricLabel = String(report.metric_label || "").trim();
  const metricSub = String(report.metric_sub || "").trim();
  const opening = String(report.opening || "").trim();
  const closing = String(report.close || report.takeaway || "").trim();
  const planIntro = String(report.plan_intro || goal.body || "").trim();
  const inferredGoal = String(goal.inferred_goal || "").trim();
  const dominantCta = String(goal.dominant_cta || "").trim();
  const hasLegacyFunnel =
    !inferredGoal &&
    !dominantCta &&
    !!(goal.body || (Array.isArray(goal.funnel_steps) && goal.funnel_steps.length) || goal.funnel_end);

  const headroomBits = (() => {
    const headroom = report.headroom;
    if (!headroom) return [];
    const uncaptured = formatUncapturedMoneyShare(headroom.uncaptured_money_share);
    const missingRungs = headroom.missing_rungs;
    const peerVolume = headroom.peer_exclusive?.volume;
    return [
      uncaptured ? `${uncaptured} of commercial demand still uncaptured` : "",
      typeof missingRungs === "number" && missingRungs > 0
        ? `${missingRungs} missing content rung${missingRungs === 1 ? "" : "s"}`
        : "",
      typeof peerVolume === "number" && peerVolume > 0
        ? `${peerVolume.toLocaleString()} monthly searches competitors own that you miss`
        : "",
    ].filter(Boolean);
  })();

  const STATIC_TIERS = [
    {
      name: "SEO is a growth channel",
      blurb: "Search can bring real customers. You rank #1 for your name; the next wins are service and location pages that capture buyers who don't know you yet.",
    },
    {
      name: "SEO is a competitive channel",
      blurb: "Leads are possible but depend on local competition and demand. Start focused, evaluate at six months.",
    },
    {
      name: "SEO is a visibility channel",
      blurb: "Supports credibility more than acquisition. Not you — a six-county consumer market rewards being found.",
    },
  ] as const;
  
  const hero = report.hero || {};
  const diagnosis = report.diagnosis || null;

  const markdownForExport = React.useMemo(() => {
    return websiteSnapshotReportToMarkdown(report);
  }, [report]);

  const defaultFilename = React.useMemo(() => {
    return website ? `Website Snapshot - ${website.split("/")[0]}` : "Website Snapshot Report";
  }, [website]);

  const handleCopy = React.useCallback(async () => {
    const markdown = String(markdownForExport || "").trim();
    if (!markdown) {
      toast.error("Nothing to copy yet");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const ok = await copyToClipboard(markdown);
        if (!ok) throw new Error("copy failed");
      }
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, [markdownForExport]);

  const formatReportDate = (date: string) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return date;
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden bg-[#f2f2ec] p-3 sm:p-6 lg:p-10",
        isPublic ? "h-screen" : "h-full rounded-lg",
      )}
    >
      <div className="flex h-full flex-col gap-4">
        <div className={cn(
          "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
          isPublic && "mx-auto w-full max-w-[1200px]"
        )}>
          {!isPublic ? (
            onBack ? (
              <Button variant="ghost" className="gap-2" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            ) : (
              <div />
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isPublic ? (
              <>
                {onShare ? (
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                    onClick={onShare}
                    disabled={isSharing}
                  >
                    {isSharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isSharing ? "Sharing..." : "Share"}</span>
                  </Button>
                ) : null}
                <Button variant="outline" className="gap-2 hidden sm:flex" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </>
            ) : null}
            <Button className="gap-2 flex-1 sm:flex-none" onClick={() => setIsDownloadDialogOpen(true)}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn(
            "mx-auto space-y-4 sm:space-y-7",
            isPublic && "max-w-[1200px]"
          )}>
            {/* PAGE 1: Cover + Hero + Quick Overview */}
            <div className="rounded-lg border p-6 sm:p-10 lg:p-14 shadow-sm" style={{ 
              borderColor: COLORS.hair, 
              background: COLORS.paper 
            }}>
              {/* Cover Top */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-5 mb-6 sm:mb-8">
                <div>
                  <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase" style={{ color: COLORS.faint }}>
                    Website Snapshot · {formatReportDate(reportDate) || "2026"}
                  </div>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] sm:text-[11.5px] leading-relaxed" style={{ color: COLORS.muted }}>
                  {website && <div className="break-all">{website}</div>}
                  {location && <div>{location}</div>}
                  {phone && <div>{phone}</div>}
                </div>
              </div>

              <hr className="border-0 border-t-2 my-6 sm:my-8" style={{ borderColor: COLORS.green }} />

              <h1 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold tracking-tight leading-tight" style={{ color: COLORS.ink }}>
                {businessName}
              </h1>
              {businessDescription && (
                <p className="text-[14px] sm:text-[15px] mt-3 sm:mt-4 leading-relaxed" style={{ color: COLORS.muted }}>
                  {businessDescription}
                </p>
              )}

              {/* Hero Section - The "Search Thing Big" */}
              {render.hero !== false && hero.display && (
                <>
                  <hr className="border-0 border-t my-6 sm:my-8" style={{ borderColor: COLORS.hair }} />
                  {diagnosis && (
                    <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase mb-4 sm:mb-5" style={{ color: COLORS.faint }}>
                      {diagnosis}
                    </div>
                  )}
                  <div className="text-[60px] sm:text-[80px] lg:text-[120px] font-bold tracking-tight leading-[0.85] my-4 sm:my-5" style={{ color: COLORS.green }}>
                    {hero.display}
                  </div>
                  {(metricLabel || metricSub) && (
                    <div className="mb-4 sm:mb-5">
                      {metricLabel && (
                        <p className="text-[14px] sm:text-[15px] font-semibold leading-tight" style={{ color: COLORS.ink }}>
                          {metricLabel}
                        </p>
                      )}
                      {metricSub && (
                        <p className="text-[13px] sm:text-[14px] mt-1 leading-relaxed" style={{ color: COLORS.muted }}>
                          {metricSub}
                        </p>
                      )}
                    </div>
                  )}
                  {verdict && (
                    <p className="text-[16px] sm:text-[18px] lg:text-[21px] font-semibold tracking-tight mb-3 sm:mb-4 leading-tight" style={{ color: COLORS.ink }}>
                      {verdict}
                    </p>
                  )}
                  {verdictSub && (
                    <p className="text-[14px] sm:text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                      {verdictSub}
                    </p>
                  )}
                  {opening && (
                    <p className="text-[14px] sm:text-[15px] mt-4 leading-relaxed" style={{ color: COLORS.ink }}>
                      {opening}
                    </p>
                  )}
                </>
              )}

              {beats.length > 0 ? (
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-11 sm:gap-y-4">
                  {beats.map((beat, index) => (
                    <div key={index} className="py-4 sm:py-5 border-t" style={{ borderColor: COLORS.hair }}>
                      {beat.so_what && (
                        <div
                          className="inline-block font-mono text-[10px] sm:text-[10.5px] tracking-wider px-2 py-1 rounded mb-2 sm:mb-2.5 leading-snug"
                          style={{ background: COLORS.greenSoft, color: COLORS.green }}
                        >
                          {beat.so_what}
                        </div>
                      )}
                      <div className="text-[13px] sm:text-[14px] leading-relaxed" style={{ color: COLORS.muted }}>
                        {beat.finding}
                      </div>
                    </div>
                  ))}
                </div>
              ) : callouts.length > 0 ? (
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-11 sm:gap-y-4">
                  {callouts.map((callout, index) => {
                    const dotColor = 
                      callout.tone === "green" ? COLORS.green :
                      callout.tone === "amber" ? COLORS.amber :
                      callout.tone === "red" ? COLORS.red : COLORS.faint;
                    
                    return (
                      <div key={index} className="py-4 sm:py-5 border-t" style={{ borderColor: COLORS.hair }}>
                        <div className="flex items-center gap-2.5 text-[14px] sm:text-[15px] font-semibold mb-2 sm:mb-2.5 leading-normal" style={{ color: COLORS.ink }}>
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                          {callout.title}
                        </div>
                        <div className="text-[13px] sm:text-[14px] leading-relaxed" style={{ color: COLORS.muted }}>
                          {callout.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* PAGE 2: What SEO Can Do */}
            {(tier.name || inferredGoal || dominantCta || hasLegacyFunnel) && (
              <div className="rounded-lg border p-6 sm:p-10 lg:p-14 shadow-sm" style={{ 
                borderColor: COLORS.hair, 
                background: COLORS.paper 
              }}>
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase mb-4 sm:mb-5" style={{ color: COLORS.faint }}>
                  What SEO can do for you
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3" style={{ color: COLORS.ink }}>
                  {tier.name || (tier as any).label || "Your SEO opportunity tier"}
                </h2>
                {tier.reasoning && (
                  <p className="text-[13.5px] sm:text-[14.5px] leading-normal" style={{ color: COLORS.muted }}>
                    {tier.reasoning}
                  </p>
                )}

                <hr className="border-0 border-t my-6 sm:my-8" style={{ borderColor: COLORS.hair }} />

                {/* Tier Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 mt-6 sm:mt-8">
                  {[1, 2, 3].map((level) => {
                    const isSelected = tier.level === level;
                    const defaults = STATIC_TIERS[level - 1];
                    const name = isSelected && tier.name ? tier.name : defaults.name;
                    return (
                      <div 
                        key={level} 
                        className="border rounded p-4.5 relative" 
                        style={{ 
                          borderColor: isSelected ? COLORS.green : COLORS.hair,
                          background: isSelected ? '#fbfdfb' : COLORS.paper
                        }}
                      >
                        {isSelected && (
                          <div 
                            className="absolute top-3.5 right-3.5 font-mono text-[9.5px] tracking-wider px-2 py-1 rounded-sm" 
                            style={{ background: COLORS.green, color: COLORS.paper }}
                          >
                            YOUR FIT
                          </div>
                        )}
                        <div className="font-mono text-[10px] tracking-wider uppercase" style={{ color: COLORS.faint }}>
                          Tier {level}
                        </div>
                        <div className="font-semibold text-[15px] my-2.5 pr-16" style={{ color: COLORS.ink }}>
                          {name}
                        </div>
                        <div className="text-[12.5px] leading-relaxed" style={{ color: COLORS.muted }}>
                          {defaults.blurb}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(render.goal_chain !== false && (inferredGoal || dominantCta)) ? (
                  <div className="mt-7 border-l-[3px] p-5.5" style={{ 
                    borderColor: COLORS.green, 
                    background: COLORS.greenSoft 
                  }}>
                    <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.greenLine }}>
                      Your goal, read from your own site
                    </div>
                    {inferredGoal && (
                      <p className="text-[14px] leading-normal" style={{ color: COLORS.ink }}>{inferredGoal}</p>
                    )}
                    {dominantCta && (
                      <p className="text-[13px] mt-2 leading-normal" style={{ color: COLORS.muted }}>
                        Primary CTA: {dominantCta}
                      </p>
                    )}
                  </div>
                ) : hasLegacyFunnel ? (
                  <div className="mt-7 border-l-[3px] p-5.5" style={{ 
                    borderColor: COLORS.green, 
                    background: COLORS.greenSoft 
                  }}>
                    <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.greenLine }}>
                      Your goal, read from your own site
                    </div>
                    {goal.body && (
                      <p className="text-[14px] mb-3 leading-normal" style={{ color: COLORS.ink }}>{goal.body}</p>
                    )}
                    {Array.isArray(goal.funnel_steps) && goal.funnel_steps.length > 0 && (
                      <div className="flex sm:flex-row flex-col sm:flex-wrap items-center sm:items-center gap-2 text-[12.5px]">
                        {goal.funnel_steps.map((step, i) => (
                          <React.Fragment key={i}>
                            <div className="border rounded px-3 py-1.5 w-full sm:w-auto text-center sm:text-left" style={{ 
                              background: COLORS.paper, 
                              borderColor: COLORS.hair,
                              color: COLORS.ink
                            }}>
                              {step}
                            </div>
                            {i < goal.funnel_steps!.length - 1 && (
                              <span className="rotate-90 sm:rotate-0" style={{ color: COLORS.faint }}>›</span>
                            )}
                          </React.Fragment>
                        ))}
                        {goal.funnel_end && (
                          <>
                            <span className="rotate-90 sm:rotate-0" style={{ color: COLORS.faint }}>›</span>
                            <div className="font-semibold rounded px-3 py-1.5 w-full sm:w-auto text-center sm:text-left" style={{ 
                              background: COLORS.green, 
                              color: COLORS.paper 
                            }}>
                              {goal.funnel_end}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* PAGE 3: Where You Stand */}
            {(render.stats_row !== false || search.traffic_read) && (
              <div className="rounded-lg border p-6 sm:p-10 lg:p-14 shadow-sm" style={{ 
                borderColor: COLORS.hair, 
                background: COLORS.paper 
              }}>
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase mb-4 sm:mb-5" style={{ color: COLORS.faint }}>
                  Where you stand in search today
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3" style={{ color: COLORS.ink }}>
                  Real organic search data, from the U.S. Google index.
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] leading-normal" style={{ color: COLORS.muted }}>
                  Organic positions only · six months of available history · {formatReportDate(reportDate) || "2026"}.
                </p>

                {/* Stats Row */}
                {render.stats_row !== false && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 mt-6 sm:mt-7">
                    <div className="px-0 sm:px-5 border-l-0 sm:border-l sm:first:pl-0 sm:first:border-l-0 pb-4 sm:pb-0 border-b sm:border-b-0" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10px] sm:text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Keywords</div>
                      <div className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.keywords_count || 0}</div>
                      <div className="text-[11px] sm:text-[12px] mt-2" style={{ color: COLORS.muted }}>terms ranked</div>
                    </div>
                    <div className="px-0 sm:px-5 sm:border-l pb-4 sm:pb-0 border-b sm:border-b-0" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10px] sm:text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Traffic</div>
                      <div className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.green }}>
                        ~{typeof search.etv === 'number' ? Math.round(search.etv).toLocaleString() : search.etv || 0}
                      </div>
                      <div className="text-[11px] sm:text-[12px] mt-2" style={{ color: COLORS.muted }}>
                        visits a month
                        {search.trend?.pct_change ? `, ${search.trend.direction === "growing" ? "up" : search.trend.direction === "declining" ? "down" : ""} ${Math.abs(search.trend.pct_change).toFixed(1)}%` : ""}
                      </div>
                    </div>
                    <div className="px-0 sm:px-5 sm:border-l" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10px] sm:text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Top 10</div>
                      <div className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.top10 || 0}</div>
                      <div className="text-[11px] sm:text-[12px] mt-2" style={{ color: COLORS.muted }}>in Google's top 10</div>
                    </div>
                    <div className="px-0 sm:px-5 sm:border-l" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10px] sm:text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Authority</div>
                      <div className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.referring_domains || 0}</div>
                      <div className="text-[11px] sm:text-[12px] mt-2" style={{ color: COLORS.muted }}>sites linking to you</div>
                    </div>
                  </div>
                )}

                {/* Trend Chart */}
                {search.trend?.points && search.trend.points.length > 0 && (
                  <div className="mt-8">
                    <div className="font-mono text-[10.5px] tracking-wider uppercase mb-3" style={{ color: COLORS.faint }}>
                      Traffic trend · {search.trend.window || "6 months"}
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={search.trend.points.map((point) => ({
                            label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][point.month - 1]} '${String(point.year).slice(-2)}`,
                            etv: Math.round(point.etv)
                          }))}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <XAxis 
                            dataKey="label" 
                            tick={{ fill: COLORS.muted, fontSize: 11 }}
                            axisLine={{ stroke: COLORS.hair }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: COLORS.muted, fontSize: 11 }}
                            axisLine={{ stroke: COLORS.hair }}
                            tickLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              background: COLORS.paper, 
                              border: `1px solid ${COLORS.hair}`,
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}
                            labelStyle={{ color: COLORS.ink, fontWeight: 600 }}
                            formatter={(value: number) => [`${value.toLocaleString()} visits`, 'Traffic']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="etv" 
                            stroke={COLORS.green} 
                            strokeWidth={2.5}
                            dot={{ fill: COLORS.green, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {search.trend.pct_change && (
                      <div className="mt-3 text-[13px]" style={{ color: COLORS.muted }}>
                        {search.trend.direction === "growing" ? "↑" : search.trend.direction === "declining" ? "↓" : "→"}{" "}
                        <span style={{ color: COLORS.ink, fontWeight: 600 }}>
                          {Math.abs(search.trend.pct_change).toFixed(1)}%
                        </span>
                        {" "}{search.trend.direction === "growing" ? "growth" : search.trend.direction === "declining" ? "decline" : "change"} over the period
                      </div>
                    )}
                  </div>
                )}

                {/* Brand vs Non-brand & Intent Mix */}
                {(search.brand_share != null || Object.keys(intentMix).length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mt-6 sm:mt-7">
                    {search.brand_share != null && (
                      <div>
                        <div className="font-mono text-[10.5px] tracking-wider uppercase mb-3" style={{ color: COLORS.faint }}>
                          Brand vs non-brand
                        </div>
                        <div className="flex h-7 rounded overflow-hidden font-mono text-[11px]" style={{ color: COLORS.paper }}>
                          <div 
                            className="flex items-center justify-center"
                            style={{ 
                              background: COLORS.green,
                              width: `${Math.round(search.brand_share * 100)}%` 
                            }}
                          >
                            {Math.round(search.brand_share * 100)}%
                          </div>
                          <div 
                            className="flex items-center justify-center"
                            style={{ 
                              background: '#7a9d8a',
                              width: `${Math.round((1 - search.brand_share) * 100)}%` 
                            }}
                          >
                            {Math.round((1 - search.brand_share) * 100)}%
                          </div>
                        </div>
                        <div className="flex gap-4 text-[11px] mt-2" style={{ color: COLORS.muted }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: COLORS.green }} />
                            <span>Branded: {Math.round(search.brand_share * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: '#7a9d8a' }} />
                            <span>Non-brand: {Math.round((1 - search.brand_share) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {Object.keys(intentMix).length > 0 && (
                      <div>
                        <div className="font-mono text-[10.5px] tracking-wider uppercase mb-3" style={{ color: COLORS.faint }}>
                          Search intent mix
                        </div>
                        <div className="flex h-7 rounded overflow-hidden font-mono text-[11px]" style={{ color: COLORS.paper }}>
                          {intentMix.transactional != null && intentMix.transactional > 0 && (
                            <div className="flex items-center justify-center" style={{ 
                              background: COLORS.green, 
                              width: `${Math.round(intentMix.transactional * 100)}%` 
                            }}>
                              {Math.round(intentMix.transactional * 100)}%
                            </div>
                          )}
                          {intentMix.commercial != null && intentMix.commercial > 0 && (
                            <div className="flex items-center justify-center" style={{ 
                              background: '#4a7c59', 
                              width: `${Math.round(intentMix.commercial * 100)}%` 
                            }}>
                              {Math.round(intentMix.commercial * 100)}%
                            </div>
                          )}
                          {intentMix.informational != null && intentMix.informational > 0 && (
                            <div className="flex items-center justify-center" style={{ 
                              background: '#7a8c7e', 
                              width: `${Math.round(intentMix.informational * 100)}%` 
                            }}>
                              {Math.round(intentMix.informational * 100)}%
                            </div>
                          )}
                          {intentMix.navigational != null && intentMix.navigational > 0 && (
                            <div className="flex items-center justify-center" style={{ 
                              background: '#9aa8a0', 
                              width: `${Math.round(intentMix.navigational * 100)}%` 
                            }}>
                              {Math.round(intentMix.navigational * 100)}%
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] mt-2" style={{ color: COLORS.muted }}>
                          {intentMix.transactional != null && intentMix.transactional > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: COLORS.green }} />
                              <span>Transactional: {Math.round(intentMix.transactional * 100)}%</span>
                            </div>
                          )}
                          {intentMix.commercial != null && intentMix.commercial > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#4a7c59' }} />
                              <span>Commercial: {Math.round(intentMix.commercial * 100)}%</span>
                            </div>
                          )}
                          {intentMix.informational != null && intentMix.informational > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#7a8c7e' }} />
                              <span>Informational: {Math.round(intentMix.informational * 100)}%</span>
                            </div>
                          )}
                          {intentMix.navigational != null && intentMix.navigational > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#9aa8a0' }} />
                              <span>Nav: {Math.round(intentMix.navigational * 100)}%</span>
                            </div>
                          )}
                        </div>
                        {intentMix.local_share != null && (
                          <div className="text-[12.5px] mt-2" style={{ color: COLORS.muted }}>
                            Local pack share: <b style={{ color: COLORS.ink }}>{Math.round(intentMix.local_share * 100)}%</b> — buyers, not browsers.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <hr className="border-0 border-t my-8" style={{ borderColor: COLORS.hair }} />

                {/* You Win vs Missing Columns */}
                {(search.you_win?.length || search.buyers_elsewhere?.length) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                    <div>
                      <div className="font-mono text-[11px] tracking-wider uppercase mb-4" style={{ color: COLORS.green }}>
                        ▲ You win
                      </div>
                      {Array.isArray(search.you_win) && search.you_win.map((group, i) => (
                        <div key={i} className="mb-5">
                          {group.cluster && (
                            <div className="font-semibold text-[14px] mb-2">{group.cluster}</div>
                          )}
                          {Array.isArray(group.examples) && group.examples.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {group.examples.map((ex, j) => (
                                <span key={j} className="font-mono text-[11px] text-gray-600 border border-[#e6e8e3] rounded px-2 py-0.5 bg-[#fbfbf9]">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          )}
                          {group.blurb && (
                            <div className="text-[13.5px] text-gray-600 leading-relaxed">{group.blurb}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="font-mono text-[11px] tracking-wider text-red-600 uppercase mb-4">
                        ▼ What you're missing
                      </div>
                      {Array.isArray(search.buyers_elsewhere) && search.buyers_elsewhere.map((group, i) => (
                        <div key={i} className="mb-5">
                          {group.cluster && (
                            <div className="font-semibold text-[14px] mb-2">{group.cluster}</div>
                          )}
                          {Array.isArray(group.examples) && group.examples.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {group.examples.map((ex, j) => (
                                <span key={j} className="font-mono text-[11px] text-gray-600 border border-[#e6e8e3] rounded px-2 py-0.5 bg-[#fbfbf9]">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          )}
                          {group.blurb && (
                            <div className="text-[13.5px] text-gray-600 leading-relaxed">{group.blurb}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAGE 4: Who Shows Up */}
            {(Object.keys(showsUp).length > 0 || shouldBe.length > 0) && (
              <div className="rounded-lg border p-6 sm:p-10 lg:p-14 shadow-sm" style={{
                borderColor: COLORS.hair,
                background: COLORS.paper
              }}>
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase mb-4 sm:mb-5" style={{ color: COLORS.faint }}>
                  Who shows up in your market
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3" style={{ color: COLORS.ink }}>
                  {setupLine || directNote || "Your competitive landscape."}
                </h2>

                {/* Direct Competitors */}
                {Array.isArray(showsUp.direct_competitors) && showsUp.direct_competitors.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.faint }}>
                      Direct Rivals
                    </div>
                    {setupLine && directNote && (
                      <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: COLORS.muted }}>
                        {directNote}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {showsUp.direct_competitors.map((item: any, i: number) => (
                        <span key={i} className="font-mono text-[11px] border rounded px-2 py-0.5" style={{ 
                          color: COLORS.muted,
                          borderColor: COLORS.hair,
                          background: '#fbfbf9'
                        }}>
                          {item.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar Elsewhere */}
                {Array.isArray(showsUp.similar_elsewhere) && showsUp.similar_elsewhere.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.faint }}>
                      Similar, elsewhere
                    </div>
                    {showsUp.similar_elsewhere_note && (
                      <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: COLORS.muted }}>
                        {showsUp.similar_elsewhere_note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {showsUp.similar_elsewhere.map((item: any, i: number) => (
                        <span key={i} className="font-mono text-[11px] border rounded px-2 py-0.5" style={{ 
                          color: COLORS.muted,
                          borderColor: COLORS.hair,
                          background: '#fbfbf9'
                        }}>
                          {item.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Noise */}
                {Array.isArray(showsUp.noise) && showsUp.noise.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.faint }}>
                      Noise
                    </div>
                    {showsUp.noise_note && (
                      <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: COLORS.muted }}>
                        {showsUp.noise_note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {showsUp.noise.slice(0, 6).map((item: any, i: number) => (
                        <span key={i} className="font-mono text-[11px] border rounded px-2 py-0.5" style={{
                          color: COLORS.muted,
                          borderColor: COLORS.hair,
                          background: '#fbfbf9'
                        }}>
                          {item}
                        </span>
                      ))}
                      {showsUp.noise.length > 6 && (
                        <span className="font-mono text-[11px] border rounded px-2 py-0.5" style={{
                          color: COLORS.muted,
                          borderColor: COLORS.hair,
                          background: '#fbfbf9'
                        }}>
                          + {showsUp.noise.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Who Should Be There */}
                {shouldBe.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.faint }}>
                      Who should be there
                    </div>
                    <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: COLORS.muted }}>
                      {shouldBeNote || "The competitors your customers actually choose between — every one of them in your market."}
                    </p>
                    <div className="space-y-0">
                      {shouldBe.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between gap-5 py-3 border-t text-[13.5px]" style={{ borderColor: COLORS.hair }}>
                          <div>
                            <div className="font-semibold mb-0.5" style={{ color: COLORS.ink }}>{item.name}</div>
                            {item.where && (
                              <div className="text-[12px]" style={{ color: COLORS.faint }}>{item.where}</div>
                            )}
                          </div>
                          <div className="text-right max-w-[52%]" style={{ color: COLORS.muted }}>{item.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gap Box */}
                {competitorBuckets.gap && (
                  <div className="mt-6 border-l-[3px] p-4 text-[14px] leading-relaxed" style={{
                    borderColor: COLORS.red,
                    background: COLORS.redSoft,
                    color: COLORS.ink
                  }}>
                    <b>The gap:</b> {competitorBuckets.gap}
                  </div>
                )}
              </div>
            )}

            {/* PAGE 5: Under the Hood */}
            {Boolean(underTheHood.rows?.length || underTheHood.pills?.length) && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-6 sm:p-10 lg:p-14 shadow-sm">
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-4 sm:mb-5">
                  Under the hood
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3">
                  What the site runs on, and how it's set up to be found.
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] text-gray-600 leading-normal">
                  The technical inventory — the plumbing, not the content. Green is fine, amber needs a look, red is a problem.
                </p>

                {/* Table */}
                {Array.isArray(underTheHood.rows) && underTheHood.rows.length > 0 && (
                  <div className="mt-6 overflow-x-auto -mx-6 sm:-mx-10 lg:-mx-14 px-6 sm:px-10 lg:px-14">
                    <table className="w-full text-[12.5px] sm:text-[13.5px] min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="px-0 py-2.5 text-left font-mono text-[10.5px] tracking-wider uppercase" style={{ color: COLORS.faint }}>
                            Layer
                          </th>
                          <th className="px-3 py-2.5 text-left font-mono text-[10.5px] tracking-wider uppercase" style={{ color: COLORS.faint }}>
                            Status
                          </th>
                          <th className="px-3 py-2.5 text-left font-mono text-[10.5px] tracking-wider uppercase" style={{ color: COLORS.faint }}>
                            What we found
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {underTheHood.rows.map((row, i) => (
                          <tr key={i} className="border-b" style={{ borderColor: COLORS.hair }}>
                            <td className="px-0 py-3.5 font-semibold align-top" style={{ color: COLORS.ink }}>{row.layer}</td>
                            <td className="px-3 py-3.5 align-top">
                              <span className={cn(
                                "inline-block font-mono text-[10.5px] tracking-wider px-2.5 py-1 rounded",
                                row.verdict === "Fine" ? "bg-[#e7efe9]" :
                                row.verdict === "Gap" ? "bg-[#f5eeda]" :
                                row.verdict === "Critical" ? "bg-[#f6e9ec]" :
                                "bg-gray-100"
                              )}
                              style={{
                                color: row.verdict === "Fine" ? COLORS.green :
                                       row.verdict === "Gap" ? COLORS.amber :
                                       row.verdict === "Critical" ? COLORS.red :
                                       COLORS.muted
                              }}>
                                {row.verdict}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 align-top" style={{ color: COLORS.muted }}>{row.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tech Pills */}
                {Array.isArray(underTheHood.pills) && underTheHood.pills.length > 0 && (
                  <div className="mt-5.5 flex flex-wrap gap-2">
                    {underTheHood.pills.map((pill, i) => (
                      <span key={i} className={cn(
                        "font-mono text-[11px] border rounded px-2 py-0.5",
                        pill.status === "warn" ? "bg-[#f5eeda] text-amber-700 border-transparent" :
                        "text-gray-600 border-[#e6e8e3] bg-white"
                      )}>
                        {pill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PAGE 6: What's Holding Back */}
            {issues.length > 0 && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-6 sm:p-10 lg:p-14 shadow-sm">
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-4 sm:mb-5">
                  What's holding the site back
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3">
                  Concrete, fixable items — none of them hard.
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] text-gray-600 leading-normal">
                  Separate from the plumbing. These are what's capping your momentum, in priority order.
                </p>

                <div className="mt-3.5 space-y-0">
                  {issues.map((issue, i) => {
                    const tone = issueSeverityTone(issue.severity);
                    const finding = String(issue.finding || issue.body || "").trim();
                    const fix = String(issue.fix || "").trim();
                    return (
                    <div key={i} className="py-4 sm:py-4.5 border-t border-[#e6e8e3] grid grid-cols-[92px_1fr] sm:grid-cols-[110px_1fr] gap-3 sm:gap-4">
                      <div className={cn(
                        "font-mono text-[10px] tracking-wider text-center py-1 px-1.5 rounded h-fit leading-snug",
                        tone === "critical" ? "bg-[#f6e9ec] text-red-600" :
                        tone === "worth_fixing" ? "bg-[#f5eeda] text-amber-700" :
                        "bg-[#eef0eb] text-gray-600"
                      )}>
                        {issueSeverityLabel(issue.severity)}
                      </div>
                      <div>
                        <div className="font-semibold text-[14.5px] mb-1.5">{issue.title}</div>
                        {finding && (
                          <div className="text-[13.5px] text-gray-600 leading-relaxed">{finding}</div>
                        )}
                        {fix && (
                          <div className="text-[13px] mt-2 leading-relaxed" style={{ color: COLORS.ink }}>
                            <span className="font-semibold">Fix: </span>{fix}
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PAGE 7: Content Map */}
            {ladder.length > 0 && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-6 sm:p-10 lg:p-14 shadow-sm">
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-4 sm:mb-5">
                  Where your content should grow
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3">
                  The full opportunity map.
                </h2>
                {report.ladder_intro && (
                  <p className="text-[14.5px] text-gray-600 leading-normal">
                    {report.ladder_intro}
                  </p>
                )}

                <div className="mt-3 space-y-0">
                  {ladder.map((rung, i) => {
                    const statusKey = ladderStatusKey(rung.status);
                    return (
                    <div key={i} className="py-4 sm:py-4.5 border-t border-[#e6e8e3]">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="font-mono text-[12px] text-gray-400">{String(rung.rung || i + 1).padStart(2, '0')}</span>
                          <span className="font-semibold text-[14px] sm:text-[14.5px]">{rung.headline || rung.title}</span>
                        </div>
                        <span className="sm:ml-auto">
                          <span className={cn(
                            "inline-block font-mono text-[10px] sm:text-[10.5px] tracking-wider px-2.5 py-1 rounded",
                            statusKey === "in_place" ? "bg-[#e7efe9]" :
                            statusKey === "partly" ? "bg-[#f5eeda]" :
                            "bg-[#f6e9ec]"
                          )}
                          style={{
                            color: statusKey === "in_place" ? COLORS.green :
                                   statusKey === "partly" ? COLORS.amber :
                                   COLORS.red
                          }}>
                            {ladderStatusLabel(rung.status)}
                          </span>
                        </span>
                      </div>
                      <div className="text-[13px] sm:text-[13.5px] text-gray-600 leading-relaxed pl-0 sm:pl-6 mt-2">{rung.body}</div>
                    </div>
                    );
                  })}
                </div>

                {report.ladder_summary && (
                  <p className="mt-6 text-[13.5px] sm:text-[14.5px] text-gray-600 leading-normal">
                    {report.ladder_summary}
                  </p>
                )}
              </div>
            )}

            {/* PAGE 8: Tactics */}
            {tactics.length > 0 && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-6 sm:p-10 lg:p-14 shadow-sm">
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-4 sm:mb-5">
                  The plan, in order
                </div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[23px] font-semibold tracking-tight leading-tight mb-2 sm:mb-3">
                  Where we would start, and why.
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] text-gray-600 leading-normal">
                  {planIntro || "A focused route through the map, sequenced for your stage."}
                </p>
                {headroomBits.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {headroomBits.map((bit) => (
                      <span
                        key={bit}
                        className="font-mono text-[10.5px] sm:text-[11px] tracking-wide px-2.5 py-1.5 rounded"
                        style={{ background: COLORS.greenSoft, color: COLORS.green }}
                      >
                        {bit}
                      </span>
                    ))}
                  </div>
                )}

                {(() => {
                  let currentPhase = "";
                  let stepInPhase = 0;
                  return tactics.map((tactic, i) => {
                    const isNewPhase = tactic.phase !== currentPhase;
                    if (isNewPhase) {
                      currentPhase = tactic.phase || "";
                      stepInPhase = 0;
                    } else {
                      stepInPhase++;
                    }

                    return (
                      <React.Fragment key={i}>
                        {isNewPhase && tactic.phase && (
                          <>
                            <div className="flex flex-col items-start gap-2 mt-6 sm:mt-8">
                              <span className="font-mono text-[10px] sm:text-[11px] tracking-wider text-white px-3 py-1.5 rounded w-fit" style={{ background: COLORS.green }}>
                                {tactic.phase.toUpperCase()}
                              </span>
                              <span className="font-semibold text-[15px] sm:text-[16px]">{tactic.title}</span>
                            </div>
                            <hr className="border-0 border-t border-[#e6e8e3] my-3 sm:my-2.5" />
                          </>
                        )}
                        {!isNewPhase && (
                          <div className="py-3 sm:py-3.5 border-b border-[#e6e8e3]">
                            <div className="flex items-baseline gap-2 mb-2">
                              <span 
                                className="font-mono text-[12px] sm:text-[13px] font-medium" 
                                style={{ color: COLORS.green }}
                              >
                                {stepInPhase}.
                              </span>
                              <span className="font-semibold text-[13.5px] sm:text-[14px]">{tactic.title}</span>
                            </div>
                            <div className="text-[12.5px] sm:text-[13px] text-gray-600 leading-relaxed pl-0 sm:pl-6">{tactic.body}</div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            )}

            {/* PAGE 9: Takeaway */}
            {closing && (
              <div className="rounded-lg p-6 sm:p-8 lg:p-11 border-0" style={{ 
                background: COLORS.green,
                color: '#eaf1ec'
              }}>
                <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase mb-4 sm:mb-5" style={{ color: '#8fb8a1' }}>
                  The honest takeaway
                </div>
                <p className="text-[14px] sm:text-[15.5px] leading-relaxed">
                  {closing.split('.')[0] && (
                    <span style={{ color: COLORS.paper, fontWeight: 600 }}>{closing.split('.')[0]}.</span>
                  )}
                  {closing.substring(closing.indexOf('.') + 1)}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={markdownForExport}
        defaultFilename={defaultFilename}
        onDownloadPdf={async (filename) => {
          await generatePdfFromWebsiteSnapshotReport({ report, filename });
        }}
      />
    </div>
  );
}
