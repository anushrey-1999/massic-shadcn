"use client";

import * as React from "react";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { formatDate, formatVolume, parseUtcDate } from "@/lib/format";
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

function hostFromUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return stripUrlProtocol(raw).split("/")[0] || raw;
  }
}

function siteNameFromHost(host: string): string {
  const cleaned = String(host || "").trim().toLowerCase().replace(/^www\./, "");
  if (!cleaned) return "";

  const parts = cleaned.split(".").filter(Boolean);
  const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || cleaned;
  const tokens = sld.split(/[-_]+/g).filter(Boolean);

  // common brand special-case
  if (tokens.length === 2 && tokens[0] === "life" && tokens[1] === "time") return "Lifetime";

  const words = tokens.map((t) => {
    if (!t) return "";
    if (t.length <= 4 && /^[a-z0-9]+$/.test(t)) return t.toUpperCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  return words.filter(Boolean).join("");
}

function toneClass(tone: string): string {
  const key = String(tone || "").trim().toLowerCase();
  if (key === "green") return "text-emerald-600";
  if (key === "amber") return "text-amber-600";
  if (key === "red") return "text-red-600";
  return "text-muted-foreground";
}

function formatMonthYear(value: unknown): string {
  const dt = parseUtcDate(value);
  return formatDate(dt || new Date(), "MMMM yyyy");
}

function formatDayMonthYear(value: unknown): string {
  const dt = parseUtcDate(value);
  return dt ? formatDate(dt, "MMMM d, yyyy") : "";
}

function splitFirstSentence(value: string): { headline: string; rest: string } {
  const text = String(value || "").trim();
  if (!text) return { headline: "", rest: "" };
  const idx = text.indexOf(". ");
  if (idx === -1) return { headline: text, rest: "" };
  return { headline: text.slice(0, idx + 1).trim(), rest: text.slice(idx + 2).trim() };
}

function rankTone(position: number): "hi" | "mid" | "lo" {
  if (!Number.isFinite(position)) return "lo";
  if (position <= 3) return "hi";
  if (position <= 10) return "mid";
  return "lo";
}

function rankClass(position: number): string {
  const tone = rankTone(position);
  if (tone === "hi") return "text-emerald-600";
  if (tone === "mid") return "text-amber-600";
  return "text-red-600";
}

function statusBadge(status: string): { label: string; className: string } {
  const key = String(status || "").trim().toLowerCase();
  if (key === "in_place") return { label: "In place", className: "bg-emerald-50 text-emerald-600" };
  if (key === "partly") return { label: "Partly", className: "bg-amber-50 text-amber-700" };
  if (key === "missing") return { label: "Missing", className: "bg-red-50 text-red-600" };
  if (key === "needs_work") return { label: "Needs work", className: "bg-amber-50 text-amber-700" };
  return { label: status || "Status", className: "bg-neutral-100 text-muted-foreground" };
}

function TrendChart({
  points,
  label,
}: {
  points: { year: number; month: number; etv: number }[];
  label: string;
}) {
  const rows = Array.isArray(points) ? points.filter((p) => Number.isFinite(p?.etv)) : [];
  if (rows.length < 2) return null;

  const width = 680;
  const height = 200;
  const padL = 50;
  const padR = 18;
  const padT = 20;
  const padB = 36;

  const max = Math.max(...rows.map((r) => Number(r.etv) || 0), 0);
  const top = Math.max(1, max);

  const y0 = height - padB;
  const y1 = padT;

  const x = (i: number) => {
    const span = (width - padL - padR) / (rows.length - 1);
    return padL + span * i;
  };

  const y = (v: number) => {
    const t = Math.max(0, Math.min(1, (Number(v) || 0) / top));
    return y0 - t * (y0 - y1);
  };

  const ticks = [0, Math.round(top / 2), Math.round(top)];
  const polyPoints = rows.map((r, i) => `${x(i)},${y(r.etv)}`).join(" ");

  const monthLabel = (p: { year: number; month: number }) => {
    try {
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
        new Date(p.year, Math.max(0, (p.month || 1) - 1), 1)
      );
    } catch {
      return String(p.month || "");
    }
  };

  return (
    <div className="mt-6">
      <Typography
        variant="muted"
        className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/70"
      >
        {label}
      </Typography>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Monthly organic traffic trend"
        className="mt-2"
      >
        <g fontSize="11" fill="#b7bec4">
          {ticks.map((t) => {
            const yy = y(t);
            return (
              <g key={t}>
                <line x1={padL} y1={yy} x2={width - padR} y2={yy} stroke="#f0f0f0" />
                <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="#b7bec4">
                  {t.toLocaleString()}
                </text>
              </g>
            );
          })}
        </g>

        <polyline fill="none" stroke="#1f8a53" strokeWidth="2.5" points={polyPoints} />

        <g fill="#1f8a53">
          {rows.map((r, i) => (
            <circle key={`${r.year}-${r.month}-${i}`} cx={x(i)} cy={y(r.etv)} r="3.5" />
          ))}
        </g>

        <g fontSize="12" fill="#9aa4ac" textAnchor="middle">
          {rows.map((r, i) => (
            <text key={`${r.year}-${r.month}-label-${i}`} x={x(i)} y={height - 8} fill="#9aa4ac">
              {monthLabel(r)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

export function WebsiteSnapshotReportViewer({
  report,
  poweredByName,
  onBack,
}: WebsiteSnapshotReportViewerProps) {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);

  const meta = report.meta || {};
  const businessName = String(meta.business_name || "").trim() || "Business";
  const website = String(meta.url || "").trim();
  const location = String(meta.location || "").trim();
  const phone = meta.phone != null ? String(meta.phone || "").trim() : "";
  const reportDateMonthYear = formatMonthYear(meta.report_date);
  const reportDateFull = formatDayMonthYear(meta.report_date);

  const callouts = Array.isArray(report.overview_callouts) ? report.overview_callouts : [];
  const tier = report.tier || {};
  const goal = report.goal || {};
  const goalBody = String((goal as any)?.body ?? (goal as any)?.goal_body ?? "").trim();
  const funnelStepsRaw = Array.isArray((goal as any)?.funnel_steps) ? (goal as any).funnel_steps : [];
  const funnelSteps = funnelStepsRaw.map((s: any) => String(s || "").trim()).filter(Boolean).slice(0, 3);
  const search = report.search || {};
  const competitors = Array.isArray(report.competitors) ? report.competitors : [];
  const underTheHood = report.under_the_hood || {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const ladder = Array.isArray(report.ladder) ? report.ladder : [];
  const plan = Array.isArray(report.plan) ? report.plan : [];

  const markdownForExport = React.useMemo(() => {
    return websiteSnapshotReportToMarkdown(report);
  }, [report]);

  const defaultFilename = React.useMemo(() => {
    const host = hostFromUrl(website);
    return host ? `Website Snapshot Report - ${host}` : "Website Snapshot Report";
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

  return (
    <div className="h-full bg-white rounded-lg px-20 py-6 flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCopy}
            disabled={!String(markdownForExport || "").trim()}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            className="gap-2"
            onClick={() => setIsDownloadDialogOpen(true)}
            disabled={!String(markdownForExport || "").trim()}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6">
        <div className="w-full pb-12">
          <header>
            <div className="flex items-center justify-between text-xs uppercase tracking-[.14em] text-muted-foreground/70">
              <span>Website Snapshot</span>
              <span>{reportDateMonthYear}</span>
            </div>
            <h1 className="mt-4 text-[32px] font-extrabold tracking-tight text-foreground">
              {businessName}
            </h1>
            <p className="mt-3 text-xs text-muted-foreground/70">
              {[website, location].filter(Boolean).join(" · ")}
              {phone ? (
                <>
                  {" "}
                  ·{" "}
                  <a href={`tel:${phone}`} className="hover:underline" style={{ color: "inherit" }}>
                    {phone}
                  </a>
                </>
              ) : null}
            </p>
          </header>

          {callouts.length ? (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  Quick overview
                </Typography>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                {callouts.slice(0, 4).map((c, idx) => {
                  const tone = String(c.tone || "").trim().toLowerCase();
                  const title = String(c.title || "").trim();
                  const body = String(c.body || "").trim();
                  if (!title && !body) return null;
                  const dotClass =
                    tone === "green"
                      ? "bg-emerald-600"
                      : tone === "amber"
                        ? "bg-amber-600"
                        : tone === "red"
                          ? "bg-red-600"
                          : "bg-neutral-400";

                  return (
                    <div key={`${title}-${idx}`}>
                      <h3 className="flex items-center text-[16.5px] font-bold">
                        <span className={cn("mr-2 inline-block h-2 w-2 rounded-sm", dotClass)} />
                        {title}
                      </h3>
                      {body ? (
                        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {(tier.label || tier.reasoning) && (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  What SEO can do for you
                </Typography>
              </div>
              <div className="mt-4">
                {tier.label ? (
                  <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-600">
                    {tier.label}
                  </div>
                ) : null}
                {tier.reasoning ? (
                  (() => {
                    const split = splitFirstSentence(String(tier.reasoning || ""));
                    return (
                      <>
                        {split.headline ? (
                          <h3 className="mt-2 text-[19px] font-extrabold tracking-tight text-foreground">
                            {split.headline}
                          </h3>
                        ) : null}
                        {split.rest ? (
                          <p className="mt-2 text-[15px] text-muted-foreground">
                            {split.rest}
                          </p>
                        ) : null}
                      </>
                    );
                  })()
                ) : null}
                {tier.tier_caveat ? (
                  <p className="mt-4 text-xs text-muted-foreground/70">{tier.tier_caveat}</p>
                ) : null}
              </div>
            </section>
          )}

          {(goalBody || funnelSteps.length || goal.funnel_end || goal.dominant_cta) && (
            <section className="mt-9">
              <div className="border-l-4 border-general-primary pl-5">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-general-primary">
                  Your goal, read from your own site
                </div>
                {goalBody ? (
                  <p className="mt-3 text-[15.5px] leading-relaxed text-foreground">
                    {goalBody}
                  </p>
                ) : goal.dominant_cta ? (
                  <p className="mt-3 text-[15.5px] leading-relaxed text-foreground">
                    {String(goal.dominant_cta || "").trim()}
                  </p>
                ) : null}
                {funnelSteps.length || goal.funnel_end ? (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {funnelSteps[0] ? <span className="font-semibold text-foreground">{funnelSteps[0]}</span> : null}
                    {funnelSteps[1] ? (
                      <>
                        <span className="mx-2 text-muted-foreground/60">›</span>
                        <span className="font-semibold text-foreground">{funnelSteps[1]}</span>
                      </>
                    ) : null}
                    {funnelSteps[2] ? (
                      <>
                        <span className="mx-2 text-muted-foreground/60">›</span>
                        <span className="font-semibold text-foreground">{funnelSteps[2]}</span>
                      </>
                    ) : null}
                    {goal.funnel_end ? (
                      <>
                        <span className="mx-2 text-muted-foreground/60">›</span>
                        <span className="font-bold text-emerald-600">{goal.funnel_end}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          <section className="mt-12">
            <div className="border-t border-border/40 pt-6">
              <Typography variant="h4" className="text-foreground">
                Where you stand in search today
              </Typography>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Real organic search data for your site, from the U.S. Google index.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-6">
              <div>
                <div className="text-[28px] font-extrabold tracking-tight">
                  {search.keywords_count != null ? formatVolume(search.keywords_count) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">keywords ranked</div>
              </div>
              <div>
                <div className="text-[28px] font-extrabold tracking-tight text-emerald-600">
                  {search.etv != null ? `~${formatVolume(Math.round(search.etv))}` : "—"}
                </div>
                <div className="text-sm text-muted-foreground">visits a month</div>
              </div>
              <div>
                <div className="text-[28px] font-extrabold tracking-tight text-emerald-600">
                  {search.top10 != null ? formatVolume(search.top10) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">in Google's top 10</div>
              </div>
              <div>
                <div className="text-[28px] font-extrabold tracking-tight">
                  {search.referring_domains != null ? formatVolume(search.referring_domains) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">sites linking to you</div>
              </div>
            </div>

            {search.traffic_read ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {search.traffic_read}
                {search.trend?.pct_change != null && Number.isFinite(search.trend?.pct_change) ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-bold text-emerald-600">
                      {String(search.trend?.pct_change || 0).trim().startsWith("-") ? "↓" : "↑"}{" "}
                      {Math.abs(Number(search.trend?.pct_change)).toFixed(1)}%
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}

            {Array.isArray(search.trend?.points) && search.trend?.points?.length ? (
              <TrendChart
                points={search.trend.points}
                label={`Monthly organic traffic, ${String(search.trend.window || "").trim() || "available history"}`}
              />
            ) : null}

            <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  You win
                </div>
                <ul className="mt-2">
                  {(Array.isArray(search.topics_won) ? search.topics_won : []).slice(0, 5).map((row, idx) => {
                    const term = String(row.term || "").trim();
                    if (!term) return null;
                    return (
                      <li
                        key={`${term}-${idx}`}
                        className="flex items-baseline justify-between gap-3 border-b border-border/40 py-2 text-sm"
                      >
                        <span className="font-semibold">{term}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Striking distance
                </div>
                <ul className="mt-2">
                  {(Array.isArray(search.gaps?.near_miss) ? search.gaps?.near_miss : []).slice(0, 5).map((row, idx) => {
                    const term = String(row.term || "").trim();
                    if (!term) return null;
                    return (
                      <li
                        key={`${term}-${idx}`}
                        className="flex items-baseline justify-between gap-3 border-b border-border/40 py-2 text-sm"
                      >
                        <span className="font-semibold">{term}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {Array.isArray(search.workhorse?.pages) && search.workhorse?.pages?.length ? (
              <div className="mt-8">
                <Typography
                  variant="muted"
                  className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/70"
                >
                  Workhorse pages
                </Typography>
                <div className="mt-2">
                  {search.workhorse.pages.slice(0, 3).map((page, idx) => {
                    const url = String(page.url || "").trim();
                    if (!url) return null;
                    const urlHost = hostFromUrl(url);
                    const etv = page.etv != null ? Number(page.etv) : null;
                    const terms = Array.isArray(page.top_terms)
                      ? page.top_terms.map((t) => String(t || "").trim()).filter(Boolean)
                      : [];

                    return (
                      <div
                        key={`${url}-${idx}`}
                        className="border-b border-border/40 py-3 last:border-b-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all font-mono text-xs text-general-primary hover:underline"
                          >
                            {urlHost || url}
                          </a>
                          {etv != null && Number.isFinite(etv) ? (
                            <span className="text-xs font-bold text-emerald-600">
                              ~{formatVolume(Math.round(etv))}
                            </span>
                          ) : null}
                        </div>
                        {terms.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {terms.slice(0, 8).map((term) => (
                              <span
                                key={term}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {competitors.length ? (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  Who's winning, and the pages doing it
                </Typography>
              </div>

              {String((report as any)?.competitors_intro || "").trim() ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {String((report as any).competitors_intro).trim()}
                </p>
              ) : null}

              <div className="mt-4">
                {competitors.slice(0, 4).map((c, idx) => {
                  const domain = String(c.domain || "").trim();
                  if (!domain) return null;
                  const title = String((c as any)?.title || "").trim();
                  const note = String(c.note || "").trim();
                  const keywordCount =
                    c.keyword_count != null && Number.isFinite(Number(c.keyword_count))
                      ? formatVolume(Number(c.keyword_count))
                      : "";
                  const etv =
                    c.etv != null && Number.isFinite(Number(c.etv))
                      ? formatVolume(Math.round(Number(c.etv)))
                      : "";
                  const example = c.example || {};
                  const exUrl = String(example.url || "").trim();
                  const exTerm = String(example.term || "").trim();
                  const exPos =
                    example.position != null && Number.isFinite(Number(example.position))
                      ? `#${Number(example.position)}`
                      : "";
                  const exWhy = String((example as any)?.why || "").trim();
                  const websiteName = siteNameFromHost(domain) || domain;
                  const competitorHref = `https://${domain}`;
                  const exampleHref = exUrl || competitorHref;

                  return (
                    <div key={`${domain}-${idx}`} className="border-b border-border/40 py-5 last:border-b-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div>
                          <div className="text-base font-extrabold">{title || domain}</div>
                          {title ? (
                            <div className="mt-0.5 text-xs text-muted-foreground/70">
                              <a
                                href={competitorHref}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                style={{ color: "inherit" }}
                              >
                                {websiteName}
                              </a>
                            </div>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground/70">
                          {[etv ? `~${etv}/mo` : "", keywordCount ? `${keywordCount} keywords` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      {note ? (
                        <p className="mt-2 text-sm text-muted-foreground">{note}</p>
                      ) : null}
                      {exUrl || exTerm ? (
                        <div className="mt-3 border-l-2 border-general-primary pl-4">
                          <a
                            href={exampleHref}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-general-primary hover:underline"
                          >
                            {websiteName}
                          </a>
                          {exTerm || exPos ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {[exPos, exTerm].filter(Boolean).join(" · ")}
                            </div>
                          ) : null}
                          {exWhy ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {exWhy}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {String((report as any)?.competitors_throughline || "").trim() ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  {String((report as any).competitors_throughline).trim()}
                </p>
              ) : null}
            </section>
          ) : null}

          {(underTheHood.rows?.length || underTheHood.pills?.length) && (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  Under the hood
                </Typography>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                What the site runs on, and how it's set up to be found.
              </p>

              {Array.isArray(underTheHood.rows) && underTheHood.rows.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
                          Layer
                        </th>
                        <th className="py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
                          What we found
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {underTheHood.rows.map((row, idx) => {
                        const layer = String(row.layer || "").trim();
                        const verdict = String(row.verdict || "").trim();
                        const detail = String(row.detail || "").trim();
                        if (!layer && !verdict && !detail) return null;
                        return (
                          <tr key={`${layer}-${idx}`} className="border-b border-border/40 last:border-b-0">
                            <td className="py-3 pr-5 font-bold whitespace-nowrap">{layer}</td>
                            <td className="py-3 text-muted-foreground">
                              {verdict ? (
                                <span className="font-semibold text-foreground">{verdict}</span>
                              ) : null}
                              {detail ? (
                                <span>
                                  {verdict ? " — " : ""}
                                  {detail}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {Array.isArray(underTheHood.pills) && underTheHood.pills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {underTheHood.pills.slice(0, 18).map((pill, idx) => {
                    const name = String(pill.name || "").trim();
                    if (!name) return null;
                    const status = String(pill.status || "").trim().toLowerCase();
                    const cls =
                      status === "good"
                        ? "border-emerald-200 text-emerald-700"
                        : status === "none"
                          ? "border-red-200 text-red-700"
                          : "border-border text-muted-foreground";
                    return (
                      <span
                        key={`${name}-${idx}`}
                        className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", cls)}
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </section>
          )}

          {issues.length ? (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  What's holding the site back
                </Typography>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Concrete, fixable items. None are hard, and together they're capping your momentum.
              </p>

              <div className="mt-5">
                {issues.map((it, idx) => {
                  const title = String(it.title || "").trim();
                  const body = String(it.body || "").trim();
                  const sev = String(it.severity || "").trim();
                  if (!title && !body) return null;
                  const sevKey = sev.toLowerCase();
                  const sevCls =
                    sevKey === "high" || sevKey === "crit"
                      ? "text-red-600"
                      : sevKey === "med" || sevKey === "medium"
                        ? "text-amber-600"
                        : "text-muted-foreground";
                  return (
                    <div key={`${title}-${idx}`} className="border-b border-border/40 py-4 last:border-b-0">
                      <h3 className="text-[15.5px] font-bold">
                        {sev ? (
                          <span className={cn("mr-2 text-xs font-extrabold uppercase tracking-wide", sevCls)}>
                            {sev}
                          </span>
                        ) : null}
                        {title}
                      </h3>
                      {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {ladder.length ? (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  Where your content should grow
                </Typography>
              </div>
              {String((report as any)?.ladder_intro || "").trim() ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {String((report as any).ladder_intro).trim()}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Build in this order.</p>
              )}

              <div className="mt-4">
                {ladder.map((rung, idx) => {
                  const title = String((rung as any)?.headline || rung.title || "").trim();
                  const body = String((rung as any)?.body || rung.example || "").trim();
                  const st = statusBadge(String(rung.status || ""));
                  return (
                    <div
                      key={`${rung.rung}-${idx}`}
                      className="grid grid-cols-[24px_1fr] gap-4 border-b border-border/40 py-4 last:border-b-0"
                    >
                      <div className="text-sm font-bold text-muted-foreground/70">
                        {rung.rung ?? idx + 1}
                      </div>
                      <div>
                        <h3 className="text-[15.5px] font-bold">{title || "Rung"}</h3>
                        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", st.className)}>
                          {st.label}
                        </span>
                        {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {String((report as any)?.ladder_summary || "").trim() ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {String((report as any).ladder_summary).trim()}
                </p>
              ) : null}
            </section>
          ) : null}

          {plan.length ? (
            <section className="mt-12">
              <div className="border-t border-border/40 pt-6">
                <Typography variant="h4" className="text-foreground">
                  The plan, in order
                </Typography>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Sequenced for your site's current stage and biggest opportunities.
              </p>

              <div className="mt-4">
                {plan.map((step, idx) => {
                  const title = String(step.title || "").trim();
                  const body = String(step.body || "").trim();
                  if (!title && !body) return null;
                  const num = step.step ?? idx + 1;
                  return (
                    <div
                      key={`${num}-${idx}`}
                      className="grid grid-cols-[26px_1fr] gap-4 border-b border-border/40 py-4 last:border-b-0"
                    >
                      <div className="text-sm font-extrabold text-general-primary">{num}</div>
                      <div>
                        <h3 className="text-[15.5px] font-bold">{title || "Step"}</h3>
                        {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {String(report.takeaway || "").trim() ? (
            <section className="mt-11">
              <div className="border-l-4 border-general-primary pl-5">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-general-primary">
                  The honest takeaway
                </div>
                <p className="mt-3 text-[15.5px] leading-relaxed text-foreground">
                  {String(report.takeaway)}
                </p>
              </div>
            </section>
          ) : null}

          <div className="mt-12 border-t border-border/40 pt-6 text-xs text-muted-foreground/70">
            Built from your live site and public search data. A starting point, not a full audit.
            {reportDateFull ? ` (Report date: ${reportDateFull})` : ""}
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

