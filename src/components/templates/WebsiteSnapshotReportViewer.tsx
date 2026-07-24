"use client";

import * as React from "react";
import { ArrowLeft, Copy, Download } from "lucide-react";
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
} from "@/utils/website-snapshot-report";

type WebsiteSnapshotReportViewerProps = {
  report: WebsiteSnapshotReport;
  poweredByName?: string;
  onBack: () => void;
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
  onBack,
}: WebsiteSnapshotReportViewerProps) {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  
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
  
  // If render flags are missing, default to showing all sections
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
  const showsUp = (competitorBuckets as any).shows_up || {};
  const shouldBe = Array.isArray((competitorBuckets as any).should_be) ? (competitorBuckets as any).should_be : [];
  const underTheHood = report.under_the_hood || {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const ladder = Array.isArray(report.ladder) ? report.ladder : [];
  const tactics = Array.isArray(report.tactics) ? report.tactics : [];
  const callouts = Array.isArray(report.overview_callouts) ? report.overview_callouts : [];
  
  // Derive hero from search.brand_share if hero object is missing
  const hero = React.useMemo(() => {
    if (report.hero && report.hero.display) {
      return report.hero;
    }
    
    // Fallback: derive from brand_share if available
    if (search.brand_share !== undefined) {
      const brandSharePct = Math.round(search.brand_share * 100);
      return {
        display: `${brandSharePct}%`,
        label: "of your traffic is people already searching for you by name.",
        description: `Most of your organic visitors already know ${businessName} and look you up directly — which means strangers in your market searching for your services aren't finding you yet. That gap is the whole opportunity.`,
      };
    }
    
    return {};
  }, [report.hero, search.brand_share, businessName]);
  
  // Generate diagnosis (eyebrow text) if missing
  const diagnosis = React.useMemo(() => {
    // Use existing diagnosis if provided
    if (report.diagnosis) {
      return report.diagnosis;
    }
    
    // Fallback: generate based on brand_share
    if (search.brand_share !== undefined) {
      const brandSharePct = search.brand_share * 100;
      
      if (brandSharePct >= 60) {
        return "Beloved but invisible";
      } else if (brandSharePct >= 40) {
        return "Known locally, but not widely";
      } else if (brandSharePct >= 20) {
        return "Building awareness";
      } else {
        return "Discovery opportunity";
      }
    }
    
    return null;
  }, [report.diagnosis, search.brand_share]);

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
    <div className="h-full overflow-hidden rounded-lg bg-[#f2f2ec] p-10">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button className="gap-2" onClick={() => setIsDownloadDialogOpen(true)}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto  space-y-7">
            {/* PAGE 1: Cover + Hero + Quick Overview */}
            <div className="rounded-lg border p-14 shadow-sm" style={{ 
              borderColor: COLORS.hair, 
              background: COLORS.paper 
            }}>
              {/* Cover Top */}
              <div className="flex items-start justify-between gap-5 mb-8">
                <div>
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: COLORS.faint }}>
                    Website Snapshot · {formatReportDate(reportDate) || "2026"}
                  </div>
                </div>
                <div className="text-right font-mono text-[11.5px] leading-relaxed" style={{ color: COLORS.muted }}>
                  {website && <div>{website}</div>}
                  {location && <div>{location}</div>}
                  {phone && <div>{phone}</div>}
                </div>
              </div>

              <hr className="border-0 border-t-2 my-8" style={{ borderColor: COLORS.green }} />

              <h1 className="text-[34px] font-bold tracking-tight leading-tight" style={{ color: COLORS.ink }}>
                {businessName}
              </h1>
              {businessDescription && (
                <p className="text-[15px] mt-4 leading-relaxed" style={{ color: COLORS.muted }}>
                  {businessDescription}
                </p>
              )}

              {/* Hero Section - The "Search Thing Big" */}
              {render.hero !== false && hero.display && (
                <>
                  <hr className="border-0 border-t my-8" style={{ borderColor: COLORS.hair }} />
                  {/* Eyebrow label - diagnostic headline (e.g., "Beloved but invisible") */}
                  {diagnosis && (
                    <div className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase mb-5" style={{ color: COLORS.faint }}>
                      {diagnosis}
                    </div>
                  )}
                  {/* Hero number - make it REALLY BIG as in mockup */}
                  <div className="text-[120px] font-bold tracking-tight leading-[0.85] my-5" style={{ color: COLORS.green }}>
                    {hero.display}
                  </div>
                  {/* Hero label - what the number means */}
                  {hero.label && (
                    <p className="text-[21px] font-semibold tracking-tight max-w-[46ch] mb-4 leading-tight" style={{ color: COLORS.ink }}>
                      {hero.label}
                    </p>
                  )}
                  {/* Hero description - the deeper explanation */}
                  {hero.description && (
                    <p className="text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                      {hero.description}
                    </p>
                  )}
                </>
              )}

              {/* Quick Overview Callouts */}
              {callouts.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-x-11 gap-y-4">
                  {callouts.map((callout, index) => {
                    const dotColor = 
                      callout.tone === "green" ? COLORS.green :
                      callout.tone === "amber" ? COLORS.amber :
                      callout.tone === "red" ? COLORS.red : COLORS.faint;
                    
                    return (
                      <div key={index} className="py-5 border-t" style={{ borderColor: COLORS.hair }}>
                        <div className="flex items-center gap-2.5 text-[15px] font-semibold mb-2.5 leading-normal" style={{ color: COLORS.ink }}>
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                          {callout.title}
                        </div>
                        <div className="text-[14px] leading-relaxed" style={{ color: COLORS.muted }}>
                          {callout.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAGE 2: What SEO Can Do */}
            {(tier.name || goal.body) && (
              <div className="rounded-lg border p-14 shadow-sm" style={{ 
                borderColor: COLORS.hair, 
                background: COLORS.paper 
              }}>
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase mb-5" style={{ color: COLORS.faint }}>
                  What SEO can do for you
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3" style={{ color: COLORS.ink }}>
                  {tier.name || (tier as any).label || "Your SEO opportunity tier"}
                </h2>
                {tier.reasoning && (
                  <p className="text-[14.5px] leading-normal" style={{ color: COLORS.muted }}>
                    {tier.reasoning}
                  </p>
                )}

                <hr className="border-0 border-t my-8" style={{ borderColor: COLORS.hair }} />

                {/* Tier Cards */}
                <div className="grid grid-cols-3 gap-3.5 mt-8">
                  {[1, 2, 3].map((level) => {
                    // API provides tier.level
                    const isSelected = tier.level === level;
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
                        <div className="font-semibold text-[15px] my-2.5" style={{ color: COLORS.ink }}>
                          {level === 1 ? "A growth channel" : level === 2 ? "A competitive channel" : "A visibility channel"}
                        </div>
                        <div className="text-[12.5px] leading-relaxed" style={{ color: COLORS.muted }}>
                          {level === 1 ? "Search can bring real customers. You rank #1 for your name; the next wins are service and location pages that capture buyers who don't know you yet." :
                           level === 2 ? "Leads are possible but depend on local competition and demand. Start focused, evaluate at six months." :
                           "Supports credibility more than acquisition. Not you — a six-county consumer market rewards being found."}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Goal Box */}
                {goal.body && (
                  <div className="mt-7 border-l-[3px] p-5.5" style={{ 
                    borderColor: COLORS.green, 
                    background: COLORS.greenSoft 
                  }}>
                    <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.greenLine }}>
                      Your goal, read from your own site
                    </div>
                    <p className="text-[14px] mb-3 leading-normal" style={{ color: COLORS.ink }}>{goal.body}</p>
                    {Array.isArray(goal.funnel_steps) && goal.funnel_steps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                        {goal.funnel_steps.map((step, i) => (
                          <React.Fragment key={i}>
                            <div className="border rounded px-3 py-1.5" style={{ 
                              background: COLORS.paper, 
                              borderColor: COLORS.hair,
                              color: COLORS.ink
                            }}>
                              {step}
                            </div>
                            {i < goal.funnel_steps!.length - 1 && (
                              <span style={{ color: COLORS.faint }}>›</span>
                            )}
                          </React.Fragment>
                        ))}
                        {goal.funnel_end && (
                          <>
                            <span style={{ color: COLORS.faint }}>›</span>
                            <div className="font-semibold rounded px-3 py-1.5" style={{ 
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
                )}
              </div>
            )}

            {/* PAGE 3: Where You Stand */}
            {(render.stats_row !== false || search.traffic_read) && (
              <div className="rounded-lg border p-14 shadow-sm" style={{ 
                borderColor: COLORS.hair, 
                background: COLORS.paper 
              }}>
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase mb-5" style={{ color: COLORS.faint }}>
                  Where you stand in search today
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3" style={{ color: COLORS.ink }}>
                  Real organic search data, from the U.S. Google index.
                </h2>
                <p className="text-[14.5px] max-w-[60ch] leading-normal" style={{ color: COLORS.muted }}>
                  Organic positions only · six months of available history · {formatReportDate(reportDate) || "2026"}.
                </p>

                {/* Stats Row */}
                {render.stats_row !== false && (
                  <div className="grid grid-cols-4 gap-0 mt-7">
                    <div className="px-5 border-l first:pl-0 first:border-l-0" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Keywords</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.keywords_count || 0}</div>
                      <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>terms ranked</div>
                    </div>
                    <div className="px-5 border-l" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Traffic</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.green }}>
                        ~{typeof search.etv === 'number' ? Math.round(search.etv).toLocaleString() : search.etv || 0}
                      </div>
                      <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>
                        visits a month
                        {search.trend?.pct_change ? `, ${search.trend.direction === "growing" ? "up" : search.trend.direction === "declining" ? "down" : ""} ${Math.abs(search.trend.pct_change).toFixed(1)}%` : ""}
                      </div>
                    </div>
                    <div className="px-5 border-l" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Top 10</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.top10 || 0}</div>
                      <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>in Google's top 10</div>
                    </div>
                    <div className="px-5 border-l" style={{ borderColor: COLORS.hair }}>
                      <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2" style={{ color: COLORS.faint }}>Authority</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.ink }}>{search.referring_domains || 0}</div>
                      <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>sites linking to you</div>
                    </div>
                  </div>
                )}

                {/* Trend Chart */}
                {render.trend_chart !== false && search.trend?.points && search.trend.points.length > 0 && (
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
                  <div className="grid grid-cols-2 gap-10 mt-7">
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
                  <div className="grid grid-cols-2 gap-10">
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
              <div className="rounded-lg border p-14 shadow-sm" style={{
                borderColor: COLORS.hair,
                background: COLORS.paper
              }}>
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase mb-5" style={{ color: COLORS.faint }}>
                  Who shows up in your market
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3" style={{ color: COLORS.ink }}>
                  {showsUp.direct_note || "Your competitive landscape."}
                </h2>
                <p className="text-[14.5px] leading-normal" style={{ color: COLORS.muted }}>
                  {competitorBuckets.setup?.market}
                  {competitorBuckets.setup?.delivery && ` · ${competitorBuckets.setup.delivery}`}
                </p>

                {/* Direct Competitors */}
                {Array.isArray(showsUp.direct_competitors) && showsUp.direct_competitors.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.faint }}>
                      Direct Rivals
                    </div>
                    {showsUp.direct_note && (
                      <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: COLORS.muted }}>
                        {showsUp.direct_note}
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
                      {(competitorBuckets as any).should_be_note || "The competitors your customers actually choose between — every one of them in your market."}
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
            {render.health_table !== false && (underTheHood.rows?.length || underTheHood.pills?.length) && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  Under the hood
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  What the site runs on, and how it's set up to be found.
                </h2>
                <p className="text-[14.5px] text-gray-600 max-w-[60ch] leading-normal">
                  The technical inventory — the plumbing, not the content. Green is fine, amber needs a look, red is a problem.
                </p>

                {/* Table */}
                {Array.isArray(underTheHood.rows) && underTheHood.rows.length > 0 && (
                  <div className="mt-6">
                    <table className="w-full text-[13.5px]">
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
                {render.technology_chips !== false && Array.isArray(underTheHood.pills) && underTheHood.pills.length > 0 && (
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
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  What's holding the site back
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  Concrete, fixable items — none of them hard.
                </h2>
                <p className="text-[14.5px] text-gray-600 max-w-[60ch] leading-normal">
                  Separate from the plumbing. These are what's capping your momentum, in priority order.
                </p>

                <div className="mt-3.5 space-y-0">
                  {issues.map((issue, i) => (
                    <div key={i} className="py-4.5 border-t border-[#e6e8e3] grid grid-cols-[64px_1fr] gap-4">
                      <div className={cn(
                        "font-mono text-[10px] tracking-wider text-center py-1 rounded h-fit",
                        issue.severity === "high" ? "bg-[#f6e9ec] text-red-600" :
                        issue.severity === "med" ? "bg-[#f5eeda] text-amber-700" :
                        "bg-[#eef0eb] text-gray-600"
                      )}>
                        {issue.severity?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[14.5px] mb-1.5">{issue.title}</div>
                        <div className="text-[13.5px] text-gray-600 leading-relaxed">{issue.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAGE 7: Content Map */}
            {render.coverage_map !== false && ladder.length > 0 && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  Where your content should grow
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  The full opportunity map.
                </h2>
                {report.ladder_intro && (
                  <p className="text-[14.5px] text-gray-600 max-w-[60ch] leading-normal">
                    {report.ladder_intro}
                  </p>
                )}

                <div className="mt-3 space-y-0">
                  {ladder.map((rung, i) => (
                    <div key={i} className="py-4.5 border-t border-[#e6e8e3]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-[12px] text-gray-400">{String(rung.rung || i + 1).padStart(2, '0')}</span>
                        <span className="font-semibold text-[14.5px]">{rung.headline || rung.title}</span>
                        <span className="ml-auto">
                          <span className={cn(
                            "inline-block font-mono text-[10.5px] tracking-wider px-2.5 py-1 rounded",
                            rung.status === "in_place" ? "bg-[#e7efe9]" :
                            rung.status === "partly" || rung.status === "needs_work" ? "bg-[#f5eeda]" :
                            "bg-[#f6e9ec]"
                          )}
                          style={{
                            color: rung.status === "in_place" ? COLORS.green :
                                   rung.status === "partly" || rung.status === "needs_work" ? COLORS.amber :
                                   COLORS.red
                          }}>
                            {rung.status === "in_place" ? "In place" :
                             rung.status === "partly" ? "Thin" :
                             rung.status === "needs_work" ? "Needs work" :
                             "Missing"}
                          </span>
                        </span>
                      </div>
                      <div className="text-[13.5px] text-gray-600 leading-relaxed pl-6">{rung.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAGE 8: Tactics */}
            {render.tactics !== false && tactics.length > 0 && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  The plan, in order
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  Where we would start, and why.
                </h2>
                <p className="text-[14.5px] text-gray-600 max-w-[60ch] leading-normal">
                  A focused route through the map, sequenced for your stage. Everything you rank for sits on one page today — so we build pages first, then optimize.
                </p>

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
                          <div className="flex items-center gap-3.5 mt-8 mb-1.5">
                            <span className="font-mono text-[11px] tracking-wider text-white px-3 py-1.5 rounded" style={{ background: COLORS.green }}>
                              {tactic.phase.toUpperCase()}
                            </span>
                            <span className="font-semibold text-[15px]">{tactic.title}</span>
                          </div>
                        )}
                        {isNewPhase && <hr className="border-0 border-t border-[#e6e8e3] my-2.5" />}
                        {!isNewPhase && (
                          <div className="grid grid-cols-[26px_1fr] gap-3 py-3.5 border-b border-[#e6e8e3]">
                            <div className="font-mono text-[13px] font-medium" style={{ color: COLORS.green }}>{stepInPhase}</div>
                            <div>
                              <div className="font-semibold text-[14px] mb-1">{tactic.title}</div>
                              <div className="text-[13px] text-gray-600 leading-relaxed">{tactic.body}</div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            )}

            {/* PAGE 9: Takeaway */}
            {report.takeaway && (
              <div className="rounded-lg p-11 border-0" style={{ 
                background: COLORS.green,
                color: '#eaf1ec'
              }}>
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase mb-5" style={{ color: '#8fb8a1' }}>
                  The honest takeaway
                </div>
                <p className="text-[15.5px] leading-relaxed">
                  {report.takeaway.split('.')[0] && (
                    <span style={{ color: COLORS.paper, fontWeight: 600 }}>{report.takeaway.split('.')[0]}.</span>
                  )}
                  {report.takeaway.substring(report.takeaway.indexOf('.') + 1)}
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
