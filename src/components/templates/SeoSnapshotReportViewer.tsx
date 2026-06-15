"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FileText,
  Flag,
  GitCompare,
  Lightbulb,
  MapPin,
  MessageSquareQuote,
  MessagesSquare,
  PlusCircle,
  Search as SearchIcon,
  ShieldCheck,
  ShieldQuestion,
  Star,
  Target,
  TrendingDown,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type SeoSnapshotObjectionHandler,
  type SeoSnapshotReport,
  type SeoSnapshotTalkingPoint,
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

function capitalizeFirst(value: string): string {
  const str = String(value || "").trim();
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function faviconHost(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./i, "");
    return host.includes(".") ? host : null;
  } catch {
    const candidate = raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/\s]/)[0];
    return candidate && candidate.includes(".") && !/\s/.test(candidate) ? candidate : null;
  }
}

function splitPath(value: string): { host: string; path: string } {
  const stripped = stripUrlProtocol(value);
  const slash = stripped.indexOf("/");
  if (slash === -1) return { host: stripped, path: "/" };
  return { host: stripped.slice(0, slash), path: stripped.slice(slash) || "/" };
}

const BADGE_TONE: Record<string, string> = {
  red: "border-red-100 bg-red-50 text-red-700",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  gray: "border-neutral-200 bg-neutral-100 text-neutral-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

function ReportFavicon({
  domain,
  size = 20,
  className,
}: {
  domain: string;
  size?: 20 | 44;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const host = faviconHost(domain);
  const letter = (host || String(domain || "?"))
    .replace(/^www\./, "")
    .charAt(0)
    .toUpperCase();
  const isLarge = size === 44;

  const wrapper = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-neutral-100 font-medium text-general-unofficial-foreground-alt",
    isLarge
      ? "h-11 w-11 rounded-[10px] border border-general-border text-base"
      : "h-5 w-5 rounded-[5px] text-[10px]",
    className
  );

  if (!host || failed) {
    return <span className={wrapper}>{letter}</span>;
  }

  return (
    <span className={wrapper}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${isLarge ? 128 : 64}`}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function AnimatedBar({
  percent,
  className,
  trackClassName,
}: {
  percent: number;
  className?: string;
  trackClassName?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const target = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const [width, setWidth] = React.useState(prefersReducedMotion ? target : 0);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setWidth(target);
      return;
    }
    const frame = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(frame);
  }, [target, prefersReducedMotion]);

  return (
    <div className={cn("h-[5px] overflow-hidden rounded-full bg-neutral-100", trackClassName)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-general-primary to-general-primary-gradient-to transition-[width] duration-700 ease-out",
          className
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

type VisibilityVisual = { label: string; tone: keyof typeof BADGE_TONE; Icon: typeof Eye | null };

function visibilityVisual(value: string): VisibilityVisual {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("not visible")) {
    return { label: value || "Not visible", tone: "red", Icon: EyeOff };
  }
  if (
    normalized.includes("missing") ||
    normalized.includes("buried") ||
    normalized.includes("weak")
  ) {
    return { label: value || "Weak", tone: "amber", Icon: AlertTriangle };
  }
  if (normalized.includes("strong")) {
    return { label: value || "Strong", tone: "green", Icon: Eye };
  }
  return { label: value || "Opportunity", tone: "gray", Icon: null };
}

function opportunityVisual(value: string): { label: string; tone: keyof typeof BADGE_TONE } {
  const normalized = String(value || "").toLowerCase();
  const short = String(value || "").split(/[—\-:]/)[0]?.trim() || value || "Opportunity";
  if (normalized.startsWith("service")) return { label: "Service page", tone: "blue" };
  if (normalized.startsWith("audience")) return { label: "Audience page", tone: "violet" };
  if (normalized.includes("comparison")) return { label: "Comparison page", tone: "violet" };
  if (normalized.includes("local")) return { label: "Local landing page", tone: "green" };
  if (normalized.includes("cost") || normalized.includes("pricing")) {
    return { label: "Cost/pricing guide", tone: "amber" };
  }
  return { label: short, tone: "gray" };
}

function OpportunityIcon({ assetType, label }: { assetType: string; label: string }) {
  const key = `${assetType} ${label}`.toLowerCase();
  let Icon = FileText;
  if (key.includes("local") || key.includes("gbp") || key.includes("map")) Icon = MapPin;
  else if (key.includes("comparison") || key.includes("compare")) Icon = GitCompare;
  else if (key.includes("review") || key.includes("reputation")) Icon = Star;
  else if (key.includes("audience")) Icon = Users;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function ReportBadge({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: keyof typeof BADGE_TONE;
  icon?: typeof Eye;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 rounded px-2 py-1 font-medium", BADGE_TONE[tone], className)}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </Badge>
  );
}

function CoverageMeter({ rows }: { rows: { visibility: string }[] }) {
  const total = rows.length;
  if (!total) return null;

  let weak = 0;
  let out = 0;
  for (const row of rows) {
    const tone = visibilityVisual(row.visibility).tone;
    if (tone === "amber") weak += 1;
    else if (tone === "red") out += 1;
  }
  const visible = Math.max(0, total - weak - out);
  const pct = (n: number) => (n / total) * 100;

  const segments = [
    { key: "vis", n: visible, color: "bg-emerald-500" },
    { key: "weak", n: weak, color: "bg-amber-500" },
    { key: "out", n: out, color: "bg-red-500" },
  ].filter((seg) => seg.n > 0);

  return (
    <div className="rounded-lg border border-general-border bg-white p-4 shadow-xs transition-shadow duration-300 hover:shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-general-secondary-foreground">
          Search visibility
          <span className="text-xs font-normal text-general-muted-foreground">
            Across the {total} high-value searches tracked
          </span>
        </div>
        <div className="text-xs text-general-muted-foreground">
          <span className="text-base font-medium text-general-foreground">{visible}</span> / {total} visible
        </div>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-neutral-100">
        {segments.map((seg, index) => (
          <div
            key={seg.key}
            className={cn(seg.color, index < segments.length - 1 && "border-r-2 border-white")}
            style={{ width: `${pct(seg.n)}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-general-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-emerald-500" />
          Visible <b className="font-medium text-general-secondary-foreground">{visible}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-amber-500" />
          Weak <b className="font-medium text-general-secondary-foreground">{weak}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-red-500" />
          Not visible <b className="font-medium text-general-secondary-foreground">{out}</b>
        </span>
      </div>
    </div>
  );
}

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ok = await copyToClipboard(text);
        if (!ok) throw new Error("copy failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="h-7 w-7 shrink-0 text-general-muted-foreground transition-colors hover:text-general-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-general-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{copied ? "Copied" : `Copy ${label}`}</TooltipContent>
    </Tooltip>
  );
}

function TalkingPointsDrawer({
  open,
  onOpenChange,
  talkingPoints,
  objectionHandlers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talkingPoints: SeoSnapshotTalkingPoint[];
  objectionHandlers: SeoSnapshotObjectionHandler[];
}) {
  const hasObjections = objectionHandlers.length > 0;
  const hasTalkingPoints = talkingPoints.length > 0;
  const [tab, setTab] = React.useState(hasTalkingPoints ? "points" : "objections");

  React.useEffect(() => {
    if (open) setTab(hasTalkingPoints ? "points" : "objections");
  }, [open, hasTalkingPoints]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="w-full gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-general-border p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary">
              <MessagesSquare className="h-[18px] w-[18px]" />
            </span>
            <SheetTitle className="text-base font-medium text-general-secondary-foreground">
              Sales talking points
            </SheetTitle>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              {hasTalkingPoints ? (
                <TabsTrigger value="points" className="gap-1.5">
                  <MessageSquareQuote className="h-4 w-4" />
                  Talking points
                  <span className="text-xs text-general-muted-foreground">
                    {talkingPoints.length}
                  </span>
                </TabsTrigger>
              ) : null}
              {hasObjections ? (
                <TabsTrigger value="objections" className="gap-1.5">
                  <ShieldQuestion className="h-4 w-4" />
                  Objections
                  <span className="text-xs text-general-muted-foreground">
                    {objectionHandlers.length}
                  </span>
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="p-6 pt-4">
              {hasTalkingPoints ? (
                <TabsContent value="points" className="mt-0 space-y-3">
                  {talkingPoints.map((point, index) => (
                    <div
                      key={`${point.label}-${index}`}
                      className="group rounded-lg border border-general-border bg-neutral-50 p-4 transition-colors duration-200 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-general-border bg-white text-xs font-medium tabular-nums text-general-unofficial-foreground-alt">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-medium text-general-secondary-foreground">
                            {point.label || `Talking point ${index + 1}`}
                          </h3>
                        </div>
                        {point.script ? (
                          <CopyTextButton text={point.script} label="script" />
                        ) : null}
                      </div>
                      {point.script ? (
                        <p className="mt-2.5 text-sm leading-6 text-general-unofficial-foreground-alt">
                          {point.script}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </TabsContent>
              ) : null}

              {hasObjections ? (
                <TabsContent value="objections" className="mt-0 space-y-3">
                  {objectionHandlers.map((item, index) => (
                    <div
                      key={`${item.objection}-${index}`}
                      className="rounded-lg border border-general-border bg-neutral-50 p-4 transition-colors duration-200 hover:bg-white"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-sm font-medium text-general-secondary-foreground">
                          {item.objection}
                        </p>
                      </div>
                      {item.response ? (
                        <div className="mt-3 flex items-start justify-between gap-3 border-t border-general-border pt-3">
                          <div className="flex items-start gap-2.5">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-general-primary" />
                            <p className="text-sm leading-6 text-general-unofficial-foreground-alt">
                              {item.response}
                            </p>
                          </div>
                          <CopyTextButton text={item.response} label="response" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </TabsContent>
              ) : null}
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
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
  accessory,
  children,
}: {
  number: string;
  title: string;
  lead?: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-5 rounded-lg border-general-border bg-white p-6 shadow-sm transition-all duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-general-primary">
          {number}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-[22px] font-medium leading-tight text-general-secondary-foreground">
            {title}
          </h2>
          {accessory}
        </div>
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
  const [isTalkingPointsOpen, setIsTalkingPointsOpen] = React.useState(false);
  const hasTalkingPoints =
    report.talkingPoints.length > 0 || report.objectionHandlers.length > 0;
  const generatedAt = displayDate(report.generatedAt);
  const markdown = React.useMemo(() => seoSnapshotReportToMarkdown(report), [report]);
  const defaultFilename = React.useMemo(() => {
    const host = stripUrlProtocol(report.website).split("/")[0] || report.businessName;
    return host ? `SEO Snapshot Report - ${host}` : "SEO Snapshot Report";
  }, [report.businessName, report.website]);

  const stats = [
    {
      label: "Real searches analyzed",
      value: report.statTiles.searchesAnalyzed,
      accent: false,
      icon: SearchIcon,
    },
    {
      label: "High-value searches checked",
      value: report.statTiles.highValueChecked,
      accent: false,
      icon: Target,
    },
    {
      label: "Missed opportunities found",
      value: report.statTiles.missedFound,
      accent: true,
      icon: Crosshair,
    },
    {
      label: "Competitors showing up",
      value: report.statTiles.competitorsOutranking,
      accent: false,
      icon: Users,
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
            {hasTalkingPoints ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsTalkingPointsOpen(true)}
              >
                <MessagesSquare className="h-4 w-4" />
                Talking points
              </Button>
            ) : null}
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
                <div className="flex items-center gap-3.5">
                  {faviconHost(report.website) ? (
                    <ReportFavicon domain={report.website} size={44} />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-general-primary text-base font-medium text-white">
                      {initials(report.businessName)}
                    </div>
                  )}
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
                <div className="flex flex-col items-start gap-1.5 md:items-end">
                  {generatedAt ? (
                    <div className="text-sm tabular-nums text-general-secondary-foreground">{generatedAt}</div>
                  ) : null}
                  <ReportBadge tone="blue" icon={BadgeCheck}>
                    Real Google search data
                  </ReportBadge>
                </div>
              </div>
            </Card>

            <Section
              number="01 · Executive summary"
              title={report.execSummary.execHeadline}
              lead={report.execSummary.execSubhead}
              accessory={
                <ReportBadge tone="blue" icon={ShieldCheck}>
                  Data verified
                </ReportBadge>
              }
            >
              <div className="rounded-lg border border-general-border border-l-[3px] border-l-general-primary bg-general-primary/[0.06] p-5 shadow-xs transition-all duration-300 hover:bg-general-primary/10 hover:shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <ReportBadge tone="red" icon={TrendingDown} className="mb-3">
                      Demand you&apos;re missing
                    </ReportBadge>
                    {report.execSummary.demandLoss.value != null ? (
                      <div className="text-[40px] font-medium leading-none tracking-normal text-general-foreground">
                        <AnimatedNumber value={report.execSummary.demandLoss.value} prefix="~" />
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
                    {capitalizeFirst(report.execSummary.demandLoss.disclaimer)}
                  </p>
                </div>
              </div>

              <CoverageMeter rows={report.missedVisibility} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex flex-col rounded-lg border border-general-border bg-neutral-50 p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-h-[34px] text-[13px] font-medium leading-snug text-general-muted-foreground">
                          {stat.label}
                        </span>
                        <StatIcon
                          className={cn(
                            "mt-0.5 h-[18px] w-[18px] shrink-0",
                            stat.accent ? "text-general-primary" : "text-general-muted-foreground"
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          "mt-2 text-[29px] font-medium leading-none tracking-[-0.5px]",
                          stat.accent ? "text-general-primary" : "text-general-foreground"
                        )}
                      >
                        <AnimatedNumber value={stat.value} />
                      </div>
                    </div>
                  );
                })}
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
              {(() => {
                const demandMax = Math.max(
                  1,
                  ...report.customerDemand.map((row) => row.searchVolume ?? 0)
                );
                return (
                  <div className="grid grid-cols-1 gap-x-7 md:grid-cols-2">
                    {report.customerDemand.map((row) => (
                      <div
                        key={row.keyword}
                        className="border-b border-general-border py-3 transition-colors duration-200"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <TruncatedText
                            value={row.keyword}
                            maxWidth="max-w-[260px]"
                            className="text-sm text-general-foreground"
                          />
                          <span className="shrink-0 text-sm font-medium text-general-foreground">
                            {row.searchVolume != null ? (
                              <>
                                <AnimatedNumber value={row.searchVolume} />{" "}
                                <span className="text-xs font-normal text-general-muted-foreground">
                                  / mo
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-normal text-general-muted-foreground">
                                Demand
                              </span>
                            )}
                          </span>
                        </div>
                        <AnimatedBar
                          trackClassName="mt-2.5"
                          percent={
                            row.searchVolume != null
                              ? (row.searchVolume / demandMax) * 100
                              : 0
                          }
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Section>

            <Section
              number="03 · Missed visibility"
              title="High-value searches you are missing."
              lead={report.missedIntro}
            >
              {(() => {
                const missedRows = report.missedVisibility.slice(0, 20);
                const volumeMax = Math.max(
                  1,
                  ...missedRows.map((row) => row.searchVolume ?? 0)
                );
                return (
                  <DataTable
                    headers={["Search", "Searches", "Your visibility", "Found instead", "Opportunity"]}
                    rows={missedRows.map((row) => {
                      const vis = visibilityVisual(row.visibility);
                      const opp = opportunityVisual(row.opportunity);
                      const competitorHost = faviconHost(row.competitorShowingUp);
                      const barPercent =
                        row.searchVolume != null
                          ? (Math.sqrt(row.searchVolume) / Math.sqrt(volumeMax)) * 100
                          : 0;
                      return [
                        <TruncatedText
                          key="keyword"
                          value={row.keyword}
                          maxWidth="max-w-[210px]"
                          className="font-medium"
                        />,
                        <div key="volume" className="flex flex-col items-start gap-1.5">
                          <span className="whitespace-nowrap text-sm text-general-foreground">
                            {row.searchVolume != null
                              ? formatSeoSnapshotNumber(row.searchVolume)
                              : ""}
                            {row.searchVolume != null ? (
                              <span className="text-xs text-general-muted-foreground">/mo</span>
                            ) : null}
                          </span>
                          {row.searchVolume != null ? (
                            <AnimatedBar percent={barPercent} trackClassName="w-full max-w-[120px]" />
                          ) : null}
                        </div>,
                        <ReportBadge key="visibility" tone={vis.tone} icon={vis.Icon ?? undefined}>
                          {vis.label}
                        </ReportBadge>,
                        row.competitorShowingUp ? (
                          <div key="competitor" className="flex items-center gap-2">
                            {competitorHost ? <ReportFavicon domain={row.competitorShowingUp} /> : null}
                            <TruncatedText
                              value={row.competitorShowingUp}
                              maxWidth="max-w-[150px]"
                              className="text-general-secondary-foreground"
                            />
                          </div>
                        ) : (
                          <span key="competitor" className="text-general-muted-foreground">
                            —
                          </span>
                        ),
                        <ReportBadge key="opportunity" tone={opp.tone}>
                          {opp.label}
                        </ReportBadge>,
                      ];
                    })}
                  />
                );
              })()}
            </Section>

            <Section
              number="04 · Competitor visibility"
              title="These competitors are being found before you."
              lead={report.competitorIntro}
            >
              <DataTable
                headers={["Competitor", "Appears for", "Map pack", "Why they are winning"]}
                rows={report.competitorVisibility.map((row) => {
                  const inMapPack = !!(row.localPackCount && row.localPackCount > 0);
                  return [
                    <div key="domain" className="flex items-center gap-2">
                      <ReportFavicon domain={row.domain} />
                      <TruncatedText
                        value={row.domain}
                        maxWidth="max-w-[180px]"
                        className="font-medium"
                      />
                    </div>,
                    <span key="appears" className="whitespace-nowrap text-general-muted-foreground">
                      {row.appearancesInTop10 != null
                        ? `${formatSeoSnapshotNumber(row.appearancesInTop10)} searches`
                        : ""}
                    </span>,
                    <ReportBadge key="local" tone={inMapPack ? "green" : "gray"}>
                      {inMapPack ? "Listed" : "Not listed"}
                    </ReportBadge>,
                    <TruncatedText
                      key="why"
                      value={row.whyWinning || "Ranks in top results for multiple searches"}
                      maxWidth="max-w-[330px]"
                      className="text-general-muted-foreground"
                    />,
                  ];
                })}
              />
            </Section>

            <Section
              number="05 · Competitor pages"
              title="Here is what competitors built to capture that demand."
              lead="The specific pages doing the work, and the gap on your site for each."
            >
              {(() => {
                const pageRows = report.competitorPages.slice(0, 12);
                const organicMax = Math.max(
                  1,
                  ...pageRows.map((row) => row.organicCount ?? 0)
                );
                return (
                  <DataTable
                    headers={["Competitor page", "Demand signal", "Your gap"]}
                    rows={pageRows.map((row) => {
                      const full = row.pageAddress || row.domain;
                      const { host, path } = splitPath(full);
                      return [
                        <div key="page" className="flex items-center gap-2.5">
                          <ReportFavicon domain={row.domain || full} />
                          <div className="min-w-0">
                            <div className="text-xs leading-tight text-general-muted-foreground">
                              {host}
                            </div>
                            <TruncatedText
                              value={full}
                              maxWidth="max-w-[260px]"
                              className="text-sm text-general-foreground"
                            >
                              {path}
                            </TruncatedText>
                          </div>
                        </div>,
                        row.organicCount != null ? (
                          <div key="demand" className="flex items-center gap-2">
                            <span className="whitespace-nowrap text-sm tabular-nums text-general-foreground">
                              {formatSeoSnapshotNumber(row.organicCount)}
                            </span>
                            <span className="text-xs text-general-muted-foreground">keywords</span>
                            <AnimatedBar
                              percent={(row.organicCount / organicMax) * 100}
                              trackClassName="w-[54px] shrink-0"
                              className="bg-general-border-three bg-none"
                            />
                          </div>
                        ) : (
                          <TruncatedText
                            key="demand"
                            value={
                              row.demandCaptured ||
                              (row.etv != null
                                ? `${formatSeoSnapshotNumber(row.etv)} estimated visits`
                                : "Relevant demand")
                            }
                            maxWidth="max-w-[190px]"
                            className="text-general-muted-foreground"
                          />
                        ),
                        <ReportBadge key="gap" tone={row.clientGap === true ? "red" : "amber"}>
                          {row.clientGap === true ? "Client gap" : "Review gap"}
                        </ReportBadge>,
                      ];
                    })}
                  />
                );
              })()}
            </Section>

            <Section
              number="06 · Your opportunity map"
              title="Here is what we would build first."
              lead={report.opportunityIntro}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {report.opportunityMap.map((item, index) => {
                  const buildFirst = index < 2;
                  return (
                    <div
                      key={`${item.label}-${index}`}
                      className="rounded-lg border border-general-border bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <OpportunityIcon assetType={item.assetType} label={item.label} />
                          <div>
                            <h3 className="text-base font-medium text-general-foreground">
                              {item.label || humanize(item.assetType)}
                            </h3>
                            <p className="mt-1 text-xs text-general-muted-foreground">
                              {item.bucket || humanize(item.assetType)}
                              {item.keywordCount != null
                                ? ` · ${formatSeoSnapshotNumber(item.keywordCount)} searches mapped`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <ReportBadge
                          tone="gray"
                          icon={buildFirst ? Flag : PlusCircle}
                          className="shrink-0"
                        >
                          {buildFirst ? "Build first" : "Support"}
                        </ReportBadge>
                      </div>
                      <div className="mt-3.5 border-t border-general-border pt-3.5">
                        {item.keywords.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.keywords.slice(0, 6).map((keyword) => (
                              <span
                                key={keyword}
                                className="inline-flex items-center rounded bg-neutral-100 px-2.5 py-1 text-xs text-general-unofficial-foreground-alt"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-general-muted-foreground">
                            Foundational work — strengthens visibility across the searches above.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      <TalkingPointsDrawer
        open={isTalkingPointsOpen}
        onOpenChange={setIsTalkingPointsOpen}
        talkingPoints={report.talkingPoints}
        objectionHandlers={report.objectionHandlers}
      />
    </div>
  );
}
