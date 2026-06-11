"use client";

import * as React from "react";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { ContentConverter } from "@/utils/content-converter";
import { generatePdfFromSeoSnapshotReport } from "@/utils/pdf-generator";
import {
  formatSeoSnapshotNumber,
  seoSnapshotReportToMarkdown,
  stripUrlProtocol,
  type SeoSnapshotReport,
} from "@/utils/seo-snapshot-report";

type SeoSnapshotReportViewerProps = {
  report: SeoSnapshotReport;
  poweredByName?: string;
  onBack: () => void;
};

function displayDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function initials(value: string): string {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "S";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

function humanize(value: string): string {
  const cleaned = String(value || "").replace(/_/g, " ").trim();
  if (!cleaned) return "Opportunity";
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
}

function visibilityClass(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("not visible")) return "bg-red-50 text-red-700 border-red-100";
  if (normalized.includes("missing") || normalized.includes("buried") || normalized.includes("weak")) {
    return "bg-amber-50 text-amber-800 border-amber-100";
  }
  if (normalized.includes("strong")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-neutral-100 text-neutral-700 border-neutral-200";
}

function compactUrl(value: string): string {
  const stripped = stripUrlProtocol(value);
  if (stripped.length <= 54) return stripped;
  return `${stripped.slice(0, 28)}...${stripped.slice(-22)}`;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const target = Number.isFinite(value as number) ? Number(value) : null;
  const [displayValue, setDisplayValue] = React.useState(target ?? 0);

  React.useEffect(() => {
    if (target == null) return;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 750;
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, prefersReducedMotion]);

  if (target == null) return null;

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatSeoSnapshotNumber(displayValue)}
      {suffix}
    </span>
  );
}

function TruncatedText({
  value,
  className,
  maxWidth = "max-w-[220px]",
  children,
}: {
  value: string;
  className?: string;
  maxWidth?: string;
  children?: React.ReactNode;
}) {
  const display = children ?? value;
  const tooltipValue = String(value || "").trim();

  if (!tooltipValue) {
    return <span className={cn("block truncate", maxWidth, className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "block cursor-default truncate outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            maxWidth,
            className
          )}
        >
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[420px] whitespace-normal break-words leading-5"
      >
        {tooltipValue}
      </TooltipContent>
    </Tooltip>
  );
}

function Section({
  number,
  title,
  lead,
  children,
}: {
  number: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-5 rounded-lg border-general-border bg-white p-6 shadow-sm transition-all duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-general-primary">
          {number}
        </div>
        <h2 className="text-[22px] font-medium leading-tight text-general-secondary-foreground">
          {title}
        </h2>
        {lead ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-general-muted-foreground">
            {lead}
          </p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-general-border bg-neutral-50 px-4 py-6 text-sm text-general-muted-foreground">
        No rows available for this section yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-general-border shadow-xs transition-shadow duration-300 hover:shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50">
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-general-border px-3 py-2.5 text-left text-xs font-medium text-general-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-general-border transition-colors duration-200 hover:bg-neutral-50/80 last:border-b-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-3 align-middle text-sm text-general-foreground"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SeoSnapshotReportViewer({
  report,
  poweredByName,
  onBack,
}: SeoSnapshotReportViewerProps) {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const generatedAt = displayDate(report.generatedAt);
  const markdown = React.useMemo(() => seoSnapshotReportToMarkdown(report), [report]);
  const defaultFilename = React.useMemo(() => {
    const host = stripUrlProtocol(report.website).split("/")[0] || report.businessName;
    return host ? `SEO Snapshot Report - ${host}` : "SEO Snapshot Report";
  }, [report.businessName, report.website]);

  const stats = [
    {
      label: "Real searches analyzed",
      value: report.analyzedKeywordCount ?? report.customerDemand.length,
      accent: false,
    },
    {
      label: "High-value searches checked",
      value: report.retainedKeywordCount ?? report.missedVisibility.length,
      accent: false,
    },
    {
      label: "Missed opportunities found",
      value: report.missedVisibility.length,
      accent: true,
    },
    {
      label: "Competitors showing up",
      value: report.competitorVisibility.length,
      accent: false,
    },
  ];

  const handleCopy = React.useCallback(async () => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      toast.error("Nothing to copy yet");
      return;
    }

    const htmlContent = ContentConverter.markdownToHtml(trimmed);

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([trimmed], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
      } else {
        const ok = await copyToClipboard(trimmed);
        if (!ok) throw new Error("copy failed");
      }
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, [markdown]);

  return (
    <div className="h-full overflow-hidden rounded-lg bg-neutral-50 p-6">
      <div className="flex h-full flex-col gap-5">
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
          <div className="mx-auto flex max-w-[960px] flex-col gap-4 pb-8">
            <Card className="rounded-lg border-general-border bg-white p-5 shadow-sm transition-all duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 hover:shadow-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-general-primary text-sm font-medium text-white">
                    {initials(report.businessName)}
                  </div>
                  <div>
                    <h1 className="text-lg font-medium text-general-secondary-foreground">
                      SEO Snapshot - {report.businessName}
                    </h1>
                    <TruncatedText
                      value={[stripUrlProtocol(report.website), report.location, poweredByName ? `Prepared by ${poweredByName}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                      maxWidth="max-w-[560px]"
                      className="mt-1 text-xs text-general-muted-foreground"
                    />
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-general-muted-foreground">
                    Missed Customer Demand
                  </div>
                  {generatedAt ? (
                    <div className="mt-1 text-xs text-general-muted-foreground">{generatedAt}</div>
                  ) : null}
                  <div className="text-xs text-general-muted-foreground">
                    Based on real Google search data
                  </div>
                </div>
              </div>
            </Card>

            <Section
              number="01 · Executive summary"
              title={report.execSummary.execHeadline}
              lead={report.execSummary.execSubhead}
            >
              <div className="rounded-lg border border-general-border border-l-[3px] border-l-general-primary bg-neutral-50 p-5 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Badge className="mb-3 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                      Demand you&apos;re missing
                    </Badge>
                    {report.execSummary.demandLoss != null ? (
                      <div className="text-[40px] font-medium leading-none tracking-normal text-general-foreground">
                        <AnimatedNumber value={report.execSummary.demandLoss} prefix="~" />
                        <span className="text-lg font-normal text-general-muted-foreground">
                          {" "}
                          inquiries / mo
                        </span>
                      </div>
                    ) : (
                      <div className="text-2xl font-medium text-general-foreground">
                        A steady stream of searches every month
                      </div>
                    )}
                    <p className="mt-3 max-w-lg text-sm text-general-muted-foreground">
                      Estimated new customer inquiries each month from people searching for services
                      this business is not capturing yet.
                    </p>
                  </div>
                  <p className="max-w-xs text-left text-xs leading-5 text-general-muted-foreground md:text-right">
                    A high-level estimate to put the opportunity in perspective, not a precise
                    calculation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-general-border bg-neutral-50 p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <div
                      className={cn(
                        "text-3xl font-medium leading-none",
                        stat.accent ? "text-general-primary" : "text-general-foreground"
                      )}
                    >
                      <AnimatedNumber value={stat.value} />
                    </div>
                    <div className="mt-2 text-xs text-general-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-general-border bg-neutral-50 p-4 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-sm">
                  <h3 className="mb-3 text-sm font-medium text-general-secondary-foreground">
                    What we found
                  </h3>
                  <ul className="space-y-2">
                    {(report.execSummary.whatWeFound.length
                      ? report.execSummary.whatWeFound
                      : ["Search demand exists for services this business already offers."]
                    ).map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm leading-6 text-general-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-general-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-general-border bg-neutral-50 p-4 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-sm">
                  <h3 className="mb-3 text-sm font-medium text-general-secondary-foreground">
                    High-impact first steps
                  </h3>
                  <ul className="space-y-2">
                    {report.opportunityMap.slice(0, 3).map((item, index) => (
                      <li key={`${item.label}-${index}`} className="flex gap-2 text-sm leading-6 text-general-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-general-primary" />
                        <span>{item.label || humanize(item.assetType)}</span>
                      </li>
                    ))}
                    {!report.opportunityMap.length ? (
                      <li className="text-sm leading-6 text-general-muted-foreground">
                        Prioritized assets will appear here when the report includes them.
                      </li>
                    ) : null}
                  </ul>
                  {report.firstStepsCaption ? (
                    <p className="mt-3 text-xs text-general-muted-foreground">
                      {report.firstStepsCaption}
                    </p>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section
              number="02 · Customer demand"
              title="Here is what potential customers are searching."
              lead={report.demandIntro}
            >
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                {report.customerDemand.map((row) => (
                  <div
                    key={row.keyword}
                    className="flex items-center justify-between gap-4 border-b border-general-border px-0.5 py-2.5 transition-colors duration-200 hover:bg-neutral-50"
                  >
                    <TruncatedText
                      value={row.keyword}
                      maxWidth="max-w-[320px]"
                      className="text-sm text-general-foreground"
                    />
                    <span className="shrink-0 text-xs text-general-muted-foreground">
                      {row.searchVolume != null ? (
                        <>
                          <span className="font-medium text-general-secondary-foreground">
                            <AnimatedNumber value={row.searchVolume} />
                          </span>{" "}
                          / mo
                        </>
                      ) : (
                        "Demand"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              number="03 · Missed visibility"
              title="High-value searches you are missing."
              lead={report.missedIntro}
            >
              <DataTable
                headers={["Search", "Searches", "Your visibility", "Competitor showing up", "Opportunity"]}
                rows={report.missedVisibility.slice(0, 20).map((row) => [
                  <TruncatedText
                    key="keyword"
                    value={row.keyword}
                    maxWidth="max-w-[210px]"
                    className="font-medium"
                  />,
                  <span key="volume" className="whitespace-nowrap text-general-muted-foreground">
                    {row.searchVolume != null ? `${formatSeoSnapshotNumber(row.searchVolume)}/mo` : ""}
                  </span>,
                  <Badge
                    key="visibility"
                    variant="outline"
                    className={cn("rounded px-2 py-1 font-medium", visibilityClass(row.visibility))}
                  >
                    {row.visibility || "Opportunity"}
                  </Badge>,
                  <TruncatedText
                    key="competitor"
                    value={row.competitorShowingUp || "Competitor advantage"}
                    maxWidth="max-w-[170px]"
                    className="font-medium text-general-secondary-foreground"
                  />,
                  <TruncatedText
                    key="opportunity"
                    value={row.opportunity || "High-value opportunity"}
                    maxWidth="max-w-[190px]"
                    className="text-general-muted-foreground"
                  />,
                ])}
              />
            </Section>

            <Section
              number="04 · Competitor visibility"
              title="These competitors are being found before you."
              lead={report.competitorIntro}
            >
              <DataTable
                headers={["Competitor", "Appears for", "In map pack", "Why they are winning"]}
                rows={report.competitorVisibility.map((row) => [
                  <TruncatedText
                    key="domain"
                    value={row.domain}
                    maxWidth="max-w-[180px]"
                    className="font-medium"
                  />,
                  <span key="appears" className="whitespace-nowrap text-general-muted-foreground">
                    {row.appearancesInTop10 != null ? `${row.appearancesInTop10} searches` : ""}
                  </span>,
                  <Badge
                    key="local"
                    variant="outline"
                    className={cn(
                      "rounded px-2 py-1 font-medium",
                      row.localPackCount && row.localPackCount > 0
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-neutral-200 bg-neutral-100 text-neutral-700"
                    )}
                  >
                    {row.localPackCount && row.localPackCount > 0 ? "Yes" : "No"}
                  </Badge>,
                  <TruncatedText
                    key="why"
                    value={row.whyWinning || "Ranks in top results for multiple searches"}
                    maxWidth="max-w-[330px]"
                    className="text-general-muted-foreground"
                  />,
                ])}
              />
            </Section>

            <Section
              number="05 · Competitor pages"
              title="Here is what competitors built to capture that demand."
              lead="The specific pages doing the work, and the gap on your site for each."
            >
              <DataTable
                headers={["Competitor page", "Demand signal", "Your gap"]}
                rows={report.competitorPages.slice(0, 12).map((row) => [
                  <TruncatedText
                    key="page"
                    value={row.pageAddress || row.domain}
                    maxWidth="max-w-[310px]"
                    className="font-mono text-xs text-general-muted-foreground"
                  >
                    {compactUrl(row.pageAddress || row.domain)}
                  </TruncatedText>,
                  <TruncatedText
                    key="demand"
                    value={
                      row.organicCount != null
                      ? `${formatSeoSnapshotNumber(row.organicCount)} organic keywords`
                      : row.etv != null
                        ? `${formatSeoSnapshotNumber(row.etv)} estimated visits`
                        : "Relevant demand"
                    }
                    maxWidth="max-w-[190px]"
                    className="text-general-muted-foreground"
                  />,
                  <Badge
                    key="gap"
                    variant="outline"
                    className={cn(
                      "rounded px-2 py-1 font-medium",
                      row.clientGap === true
                        ? "border-red-100 bg-red-50 text-red-700"
                        : "border-amber-100 bg-amber-50 text-amber-800"
                    )}
                  >
                    {row.clientGap === true ? "Client gap" : "Review gap"}
                  </Badge>,
                ])}
              />
            </Section>

            <Section
              number="06 · Your opportunity map"
              title="Here is what we would build first."
              lead={report.opportunityIntro}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {report.opportunityMap.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-lg border border-general-border bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-general-secondary-foreground">
                          {item.label || humanize(item.assetType)}
                        </h3>
                        <p className="mt-1 text-xs text-general-muted-foreground">
                          {humanize(item.assetType)}
                          {item.keywordCount != null ? ` · ${item.keywordCount} searches mapped` : ""}
                        </p>
                      </div>
                      <Badge className="rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        {index < 2 ? "Build first" : "Support"}
                      </Badge>
                    </div>
                    {item.keywords.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-general-muted-foreground">
                        {item.keywords.slice(0, 5).map((keyword) => (
                          <li key={keyword}>{keyword}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>

            <div className="pb-2 pt-1 text-center text-xs text-general-muted-foreground">
              SEO Snapshot · {report.businessName}
              {generatedAt ? ` · Generated ${generatedAt}` : ""}
            </div>
          </div>
        </div>
      </div>

      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={markdown}
        defaultFilename={defaultFilename}
        onDownloadPdf={(filename) =>
          generatePdfFromSeoSnapshotReport({
            report,
            filename,
            poweredByName,
          })
        }
      />
    </div>
  );
}
