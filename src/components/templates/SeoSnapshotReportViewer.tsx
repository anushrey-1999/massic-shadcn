"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Binoculars,
  Check,
  Clapperboard,
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
  ShieldQuestion,
  Star,
  Target,
  Users,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import {
  SnapshotBadge,
  SnapshotDataTable,
  SnapshotMetricTile,
  SnapshotProgressBar,
  SnapshotReportHeader,
  SnapshotReportShell,
  SnapshotSectionCard,
  SnapshotVisibilityMeter,
} from "@/components/organisms/SeoSnapshotReport/SnapshotReportPrimitives";
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
import {
  websiteSnapshotReportToMarkdown,
  type WebsiteSnapshotReport,
} from "@/utils/website-snapshot-report";

/**
 * Color system consistent with WebsiteSnapshotReportViewer
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

function formatTalkingPointsForCopy(talkingPoints: SeoSnapshotTalkingPoint[]): string {
  return talkingPoints
    .map((point, index) => {
      const label = point.label || `Talking point ${index + 1}`;
      return point.script ? `${index + 1}. ${label}\n${point.script}` : `${index + 1}. ${label}`;
    })
    .join("\n\n");
}

function formatObjectionsForCopy(objectionHandlers: SeoSnapshotObjectionHandler[]): string {
  return objectionHandlers
    .map((item, index) => {
      const objection = item.objection || `Objection ${index + 1}`;
      return item.response
        ? `${index + 1}. ${objection}\nResponse: ${item.response}`
        : `${index + 1}. ${objection}`;
    })
    .join("\n\n");
}

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      if (!text.trim()) {
        toast.error("Nothing to copy yet");
        return;
      }
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="h-8 shrink-0 gap-1.5"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy all"}
    </Button>
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
  const talkingPointsCopy = React.useMemo(
    () => formatTalkingPointsForCopy(talkingPoints),
    [talkingPoints]
  );
  const objectionsCopy = React.useMemo(
    () => formatObjectionsForCopy(objectionHandlers),
    [objectionHandlers]
  );

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
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-general-secondary-foreground">
                        Talking points
                      </p>
                      <p className="text-xs text-general-muted-foreground">
                        Copy all {talkingPoints.length} talking points.
                      </p>
                    </div>
                    <CopyTextButton text={talkingPointsCopy} label="talking points" />
                  </div>
                  {talkingPoints.map((point, index) => (
                    <div
                      key={`${point.label}-${index}`}
                      className="group rounded-lg border border-general-border bg-neutral-50 p-4 transition-colors duration-200 hover:bg-white"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-general-border bg-white text-xs font-medium tabular-nums text-general-unofficial-foreground-alt">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-medium text-general-secondary-foreground">
                          {point.label || `Talking point ${index + 1}`}
                        </h3>
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
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-general-secondary-foreground">
                        Objections
                      </p>
                      <p className="text-xs text-general-muted-foreground">
                        Copy all {objectionHandlers.length} objection responses.
                      </p>
                    </div>
                    <CopyTextButton text={objectionsCopy} label="objection responses" />
                  </div>
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
                        <div className="mt-3 flex items-start gap-2.5 border-t border-general-border pt-3">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-general-primary" />
                          <p className="text-sm leading-6 text-general-unofficial-foreground-alt">
                            {item.response}
                          </p>
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

/**
 * New Website Snapshot Report Viewer matching the updated HTML mockup design
 */
export function WebsiteSnapshotReportViewer({
  report,
  poweredByName,
  onBack,
}: {
  report: import("@/utils/website-snapshot-report").WebsiteSnapshotReport;
  poweredByName?: string;
  onBack: () => void;
}) {
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  
  const meta = report.meta || {};
  const businessName = meta.business_name || "Business";
  const website = stripUrlProtocol(meta.url || "");
  const location = meta.location || "";
  const phone = meta.phone || "";
  const reportDate = meta.report_date || "";
  const businessDescription = meta.business_description || "";
  
  const render = report.render || {};
  const hero = report.hero || {};
  const tier = report.tier || {};
  const goal = report.goal || {};
  const search = report.search || {};
  const intentMix = report.intent_mix || {};
  const scaleComparison = report.scale_comparison;
  const showsUp = report.shows_up || {};
  const shouldBe = Array.isArray(report.should_be) ? report.should_be : [];
  const underTheHood = report.under_the_hood || {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const ladder = Array.isArray(report.ladder) ? report.ladder : [];
  const tactics = Array.isArray(report.tactics) ? report.tactics : [];
  const callouts = Array.isArray(report.overview_callouts) ? report.overview_callouts : [];
  
  const toneColor = (tone: string) => {
    switch (tone?.toLowerCase()) {
      case "green": return "text-green-600 border-green-200 bg-green-50";
      case "amber": return "text-amber-600 border-amber-200 bg-amber-50";
      case "red": return "text-red-600 border-red-200 bg-red-50";
      default: return "text-gray-600 border-gray-200 bg-gray-50";
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
            <Button variant="outline" className="gap-2" onClick={() => {
              const markdown = websiteSnapshotReportToMarkdown(report);
              const trimmed = markdown.trim();
              if (!trimmed) {
                toast.error("Nothing to copy yet");
                return;
              }
              navigator.clipboard?.writeText(trimmed).then(() => {
                toast.success("Copied");
              }).catch(() => {
                toast.error("Failed to copy");
              });
            }}>
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
          <div className="mx-auto ">
            {/* PAGE 1: Cover + Hero + Quick Overview */}
            <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
              {/* Cover Top */}
              <div className="flex items-start justify-between gap-5 mb-8">
                <div>
                  <div className="font-mono text-[11px] font-medium tracking-[0.16em]" style={{ color: COLORS.green }}>
                    KANAHIKU · SNAPSHOT
                  </div>
                  <div className="mt-1 font-mono text-[11px] tracking-[0.14em] text-gray-400 uppercase">
                    Website Snapshot · {reportDate ? new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "2026"}
                  </div>
                </div>
                <div className="text-right font-mono text-[11.5px] text-gray-600 leading-relaxed">
                  <div>{website}</div>
                  {location && <div>{location}</div>}
                  {phone && <div>{phone}</div>}
                </div>
              </div>

              <hr className="border-0 border-t-2 my-8" style={{ borderColor: COLORS.green }} />

              <h1 className="text-[34px] font-bold tracking-tight leading-tight text-gray-900">
                {businessName}
              </h1>
              {businessDescription && (
                <p className="mt-5 text-[14.5px] text-gray-600">
                  {businessDescription}
                </p>
              )}

              {/* Hero Section */}
              {render.hero !== false && hero.display && (
                <>
                  <hr className="border-0 border-t border-[#e6e8e3] my-8" />
                  {report.diagnosis && (
                    <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                      {report.diagnosis}
                    </div>
                  )}
                  <div className="text-[104px] font-bold tracking-tight leading-[0.9] my-4" style={{ color: COLORS.green }}>
                    {hero.display}
                  </div>
                  {hero.label && (
                    <p className="text-[20px] font-semibold tracking-tight max-w-[46ch] mb-3">
                      {hero.label}
                    </p>
                  )}
                  {hero.description && (
                    <p className="text-[14.5px] text-gray-600">
                      {hero.description}
                    </p>
                  )}
                </>
              )}

              {/* Quick Overview Callouts */}
              {callouts.length === 4 && (
                <div className="mt-8 grid grid-cols-2 gap-x-11">
                  {callouts.map((callout, index) => (
                    <div key={index} className="py-5 border-t border-[#e6e8e3]">
                      <div className="flex items-center gap-2.5 text-[14.5px] font-semibold mb-2">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: callout.tone === "green" ? COLORS.green :
                                       callout.tone === "amber" ? COLORS.amber :
                                       callout.tone === "red" ? COLORS.red : "#9ca3af"
                          }}
                        />
                        {callout.title}
                      </div>
                      <div className="text-[13.5px] text-gray-600 leading-relaxed">
                        {callout.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAGE 2: What SEO Can Do */}
            {(tier.name || goal.body) && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  What SEO can do for you
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  {tier.name || "Your SEO opportunity tier"}
                </h2>
                <p className="text-[14.5px] text-gray-600">
                  {tier.reasoning}
                </p>

                <hr className="border-0 border-t border-[#e6e8e3] my-8" />

                {/* Tier Cards */}
                <div className="grid grid-cols-3 gap-3.5 mt-8">
                  {[1, 2, 3].map((level) => (
                    <div key={level} className={cn(
                      "border rounded p-4.5 relative",
                      tier.level === level ? "bg-[#fbfdfb]" : ""
                    )}
                    style={{
                      borderColor: tier.level === level ? COLORS.green : COLORS.hair
                    }}>
                      {tier.level === level && (
                        <div className="absolute top-3.5 right-3.5 font-mono text-[9.5px] tracking-wider text-white px-2 py-1 rounded-sm" style={{ background: COLORS.green }}>
                          YOUR FIT
                        </div>
                      )}
                      <div className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
                        Tier {level}
                      </div>
                      <div className="font-semibold text-[15px] my-2.5">
                        {level === 1 ? "A growth channel" : level === 2 ? "A competitive channel" : "A visibility channel"}
                      </div>
                      <div className="text-[12.5px] text-gray-600 leading-relaxed">
                        {level === 1 ? "Search can bring real customers" :
                         level === 2 ? "Leads are possible but depend on local competition" :
                         "Supports credibility more than acquisition"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Goal Box */}
                {goal.body && (
                  <div className="mt-7 border-l-[3px] p-5.5" style={{ borderColor: COLORS.green, background: COLORS.greenSoft }}>
                    <div className="font-mono text-[10.5px] tracking-wider uppercase mb-2.5" style={{ color: COLORS.greenLine }}>
                      Your goal, read from your own site
                    </div>
                    <p className="text-[14px] mb-3">{goal.body}</p>
                    {Array.isArray(goal.funnel_steps) && goal.funnel_steps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                        {goal.funnel_steps.map((step, i) => (
                          <React.Fragment key={i}>
                            <div className="bg-white border border-[#e6e8e3] rounded px-3 py-1.5">
                              {step}
                            </div>
                            {i < goal.funnel_steps!.length - 1 && (
                              <span className="text-gray-400">›</span>
                            )}
                          </React.Fragment>
                        ))}
                        {goal.funnel_end && (
                          <>
                            <span className="text-gray-400">›</span>
                            <div className="text-white font-semibold rounded px-3 py-1.5" style={{ background: COLORS.green }}>
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
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  Where you stand in search today
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  Real organic search data, from the U.S. Google index.
                </h2>
                <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
                  Organic positions only · six months of available history · {reportDate ? new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric' }) : "2026"}.
                </p>

                {/* Stats Row */}
                {render.stats_row !== false && (
                  <div className="grid grid-cols-4 gap-0 mt-7">
                    <div className="px-5 border-l border-[#e6e8e3] first:pl-0 first:border-l-0">
                      <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-2">Keywords</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none">{search.keywords_count || 0}</div>
                      <div className="text-[12px] text-gray-600 mt-2">terms ranked</div>
                    </div>
                    <div className="px-5 border-l border-[#e6e8e3]">
                      <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-2">Traffic</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.green }}>
                        ~{typeof search.etv === 'number' ? Math.round(search.etv).toLocaleString() : search.etv || 0}
                      </div>
                      <div className="text-[12px] text-gray-600 mt-2">
                        visits a month
                        {search.trend?.pct_change ? `, ${search.trend.direction === "growing" ? "up" : search.trend.direction === "declining" ? "down" : ""} ${Math.abs(search.trend.pct_change).toFixed(1)}%` : ""}
                      </div>
                    </div>
                    <div className="px-5 border-l border-[#e6e8e3]">
                      <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-2">Top 10</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none">{search.top10 || 0}</div>
                      <div className="text-[12px] text-gray-600 mt-2">in Google's top 10</div>
                    </div>
                    <div className="px-5 border-l border-[#e6e8e3]">
                      <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-2">Authority</div>
                      <div className="text-[34px] font-bold tracking-tight leading-none">{search.referring_domains || 0}</div>
                      <div className="text-[12px] text-gray-600 mt-2">sites linking to you</div>
                    </div>
                  </div>
                )}

                {/* Trend Chart */}
                {render.trend_chart !== false && search.trend?.points && search.trend.points.length > 0 && (
                  <div className="mt-8">
                    <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-3">
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
                          <RechartsTooltip 
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
                      <div className="mt-3 text-[13px] text-gray-600">
                        {search.trend.direction === "growing" ? "↑" : search.trend.direction === "declining" ? "↓" : "→"}{" "}
                        <span className="text-gray-900 font-semibold">
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
                        <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-3">
                          Brand vs non-brand
                        </div>
                        <div className="flex h-7 rounded overflow-hidden font-mono text-[11px] text-white">
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
                        <div className="flex gap-4 text-[11px] text-gray-600 mt-2">
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
                        <div className="font-mono text-[10.5px] tracking-wider text-gray-400 uppercase mb-3">
                          Search intent mix
                        </div>
                        <div className="flex h-7 rounded overflow-hidden font-mono text-[11px] text-white">
                          {intentMix.transactional != null && intentMix.transactional > 0 && (
                            <div className="flex items-center justify-center" style={{ width: `${Math.round(intentMix.transactional * 100)}%`, background: COLORS.green }}>
                              {Math.round(intentMix.transactional * 100)}%
                            </div>
                          )}
                          {intentMix.commercial != null && intentMix.commercial > 0 && (
                            <div className="flex items-center justify-center" style={{ width: `${Math.round(intentMix.commercial * 100)}%`, background: '#4a7c59' }}>
                              {Math.round(intentMix.commercial * 100)}%
                            </div>
                          )}
                          {intentMix.informational != null && intentMix.informational > 0 && (
                            <div className="flex items-center justify-center" style={{ width: `${Math.round(intentMix.informational * 100)}%`, background: '#7a8c7e' }}>
                              {Math.round(intentMix.informational * 100)}%
                            </div>
                          )}
                          {intentMix.navigational != null && intentMix.navigational > 0 && (
                            <div className="flex items-center justify-center" style={{ width: `${Math.round(intentMix.navigational * 100)}%`, background: '#9aa8a0' }}>
                              {Math.round(intentMix.navigational * 100)}%
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-gray-600 mt-2">
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
                          <div className="text-[12.5px] text-gray-600 mt-2">
                            Local pack share: <b>{Math.round(intentMix.local_share * 100)}%</b> — buyers, not browsers.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <hr className="border-0 border-t border-[#e6e8e3] my-8" />

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
            {(showsUp || shouldBe.length > 0) && (
              <div className="rounded-lg border border-[#e6e8e3] bg-white p-14 shadow-sm">
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-5">
                  Who shows up in your market
                </div>
                <h2 className="text-[23px] font-semibold tracking-tight leading-tight mb-3">
                  {report.competitor_buckets?.gap || "Your competitive landscape."}
                </h2>
                <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
                  {report.competitor_buckets?.setup?.market}
                  {report.competitor_buckets?.setup?.delivery && ` · ${report.competitor_buckets.setup.delivery}`}
                </p>

                {/* Similar Elsewhere */}
                {Array.isArray(showsUp.similar_elsewhere) && showsUp.similar_elsewhere.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider text-gray-400 uppercase mb-2.5">
                      Similar, elsewhere
                    </div>
                    {showsUp.similar_elsewhere_note && (
                      <p className="text-[13.5px] text-gray-600 leading-relaxed mb-3">
                        {showsUp.similar_elsewhere_note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {showsUp.similar_elsewhere.map((item, i) => (
                        <span key={i} className="font-mono text-[11px] text-gray-600 border border-[#e6e8e3] rounded px-2 py-0.5 bg-[#fbfbf9]">
                          {item.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Directories & Tools */}
                {Array.isArray(showsUp.directories_tools) && showsUp.directories_tools.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider text-gray-400 uppercase mb-2.5">
                      Directories & tools
                    </div>
                    {showsUp.directories_tools_note && (
                      <p className="text-[13.5px] text-gray-600 leading-relaxed mb-3">
                        {showsUp.directories_tools_note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {showsUp.directories_tools.map((item, i) => (
                        <span key={i} className="font-mono text-[11px] text-gray-600 border border-[#e6e8e3] rounded px-2 py-0.5 bg-[#fbfbf9]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Who Should Be There */}
                {shouldBe.length > 0 && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] tracking-wider text-gray-400 uppercase mb-2.5">
                      Who should be there
                    </div>
                    <p className="text-[13.5px] text-gray-600 leading-relaxed mb-3">
                      The real competition — every one of them missing from your results.
                    </p>
                    {shouldBe.map((item, i) => (
                      <div key={i} className="flex justify-between gap-5 py-3 border-t border-[#e6e8e3] text-[13.5px]">
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-gray-600 text-right max-w-[52%]">{item.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Gap Box */}
                {report.competitor_buckets?.gap && (
                  <div className="mt-6 border-l-[3px] border-red-600 bg-[#f6e9ec] p-4 text-[14px] text-gray-900 leading-relaxed">
                    <b>The gap:</b> {report.competitor_buckets.gap}
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
                <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
                  The technical inventory — the plumbing, not the content.
                </p>

                {/* Table */}
                {Array.isArray(underTheHood.rows) && underTheHood.rows.length > 0 && (
                  <div className="mt-6 overflow-hidden rounded-lg border border-[#e6e8e3]">
                    <table className="w-full text-[13.5px]">
                      <thead>
                        <tr className="bg-[#fafafa]">
                          <th className="px-3 py-2.5 text-left font-mono text-[10.5px] tracking-wider text-gray-400 uppercase border-b-2" style={{ borderColor: COLORS.green }}>
                            Layer
                          </th>
                          <th className="px-3 py-2.5 text-left font-mono text-[10.5px] tracking-wider text-gray-400 uppercase border-b-2" style={{ borderColor: COLORS.green }}>
                            Status
                          </th>
                          <th className="px-3 py-2.5 text-left font-mono text-[10.5px] tracking-wider text-gray-400 uppercase border-b-2" style={{ borderColor: COLORS.green }}>
                            What we found
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {underTheHood.rows.map((row, i) => (
                          <tr key={i} className="border-b border-[#e6e8e3] last:border-b-0">
                            <td className="px-3 py-3.5 font-semibold text-gray-900 align-top">{row.layer}</td>
                            <td className="px-3 py-3.5 align-top">
                              <span className={cn(
                                "inline-block font-mono text-[10.5px] tracking-wider px-2.5 py-1 rounded",
                                row.verdict === "Fine" ? "bg-[#e7efe9]" :
                                row.verdict === "Gap" ? "bg-[#f5eeda]" :
                                row.verdict === "Critical" ? "bg-[#f6e9ec]" :
                                "bg-gray-100 text-gray-600"
                              )}
                              style={{
                                color: row.verdict === "Fine" ? COLORS.green :
                                       row.verdict === "Gap" ? COLORS.amber :
                                       row.verdict === "Critical" ? COLORS.red :
                                       undefined
                              }}>
                                {row.verdict}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-gray-600 align-top">{row.detail}</td>
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
                <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
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
                  <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
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
                <p className="text-[14.5px] text-gray-600 max-w-[60ch]">
                  A focused route through the map, sequenced for your stage.
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
              <div className="rounded-lg text-[#eaf1ec] p-11 border-0" style={{ background: COLORS.green }}>
                <div className="font-mono text-[11px] font-medium tracking-[0.16em] text-[#8fb8a1] uppercase mb-5">
                  The honest takeaway
                </div>
                <p className="text-[15.5px] leading-relaxed">
                  {report.takeaway.split('.')[0] && (
                    <span className="text-white font-semibold">{report.takeaway.split('.')[0]}.</span>
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
        markdownContent={websiteSnapshotReportToMarkdown(report)}
        defaultFilename={`Website Snapshot - ${businessName}`}
        onDownloadPdf={async (filename) => {
          // PDF generation will be handled by the existing system
          toast.info("PDF generation not yet implemented for new format");
        }}
      />
    </div>
  );
}

// Keep the original function for backward compatibility
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

  const websiteLabel = stripUrlProtocol(report.website).split("/")[0] || "";
  const verifiedText = generatedAt
    ? `Verified search data from ${generatedAt}`
    : "Verified search data";
  const demandLossValue = report.execSummary.demandLoss.value;
  const demandLossDigits = demandLossValue == null ? 0 : formatSeoSnapshotNumber(demandLossValue).length;
  const demandMax = Math.max(
    1,
    ...report.customerDemand.map((row) => row.searchVolume ?? 0)
  );
  const missedRows = report.missedVisibility.slice(0, 20);
  const missedVolumeMax = Math.max(
    1,
    ...missedRows.map((row) => row.searchVolume ?? 0)
  );
  const competitorPageRows = report.competitorPages.slice(0, 12);
  const visibilityCounts = missedRows.reduce(
    (acc, row) => {
      const tone = visibilityVisual(row.visibility).tone;
      if (tone === "red") acc.notVisible += 1;
      else if (tone === "amber") acc.weak += 1;
      else acc.visible += 1;
      return acc;
    },
    { notVisible: 0, weak: 0, visible: 0 }
  );

  return (
    <div className="h-full overflow-hidden rounded-lg bg-neutral-50 p-6">
      <div className="flex h-full flex-col gap-4">
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
          <SnapshotReportShell
            footer={
              <>
                SEO Snapshot · {report.businessName}
                {generatedAt ? ` · Generated ${generatedAt}` : ""}
              </>
            }
          >
            <SnapshotReportHeader
              title="SEO Snapshot Report"
              website={websiteLabel}
              verifiedText={verifiedText}
              verifiedIcon={BadgeCheck}
              logo={
                <ReportFavicon
                  domain={report.website || report.businessName}
                  size={44}
                  className="size-14 rounded-lg border-0 bg-[#d9d9d9] p-2"
                />
              }
            />

            <div className="mt-6 flex flex-col gap-8">
              <SnapshotSectionCard eyebrow="OVERVIEW">
                <div className="flex w-full items-start gap-3">
                  <div className="flex h-[166px] w-[506px] shrink-0 items-center gap-6 rounded-lg border border-general-border bg-[#fafafa] px-3 py-4">
                    <div
                      className={cn(
                        "flex h-full shrink-0 flex-col items-start gap-3",
                        demandLossDigits > 3 ? "w-[205px]" : "w-[181px]"
                      )}
                    >
                      <div className="flex w-full items-end gap-2 whitespace-nowrap">
                        <span
                          className={cn(
                            "shrink-0 font-semibold leading-none tracking-[-0.48px] text-general-foreground",
                            demandLossDigits > 5
                              ? "text-[34px]"
                              : demandLossDigits > 3
                                ? "text-[38px]"
                                : "text-[48px]"
                          )}
                        >
                          {demandLossValue != null ? (
                            <AnimatedNumber value={demandLossValue} />
                          ) : (
                            "—"
                          )}
                        </span>
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pb-1 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
                          inquiries/month
                        </span>
                      </div>
                      <SnapshotBadge
                        tone="red"
                        icon={CircleAlert}
                        className="w-full text-[10px] tracking-[0.15px]"
                      >
                        Demand you&apos;re missing
                      </SnapshotBadge>
                    </div>
                    <div className="flex h-full min-w-0 flex-1 flex-col items-start gap-2">
                      <p className="w-full whitespace-normal break-words text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-red-600">
                        {report.execSummary.execHeadline ||
                          "Searches per month looking for your services miss you."}
                      </p>
                      <p className="w-full whitespace-normal break-words text-[10px] font-normal leading-[1.5] tracking-[0.15px] text-general-muted-foreground">
                        {capitalizeFirst(report.execSummary.demandLoss.disclaimer)}
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                    {stats.map((stat) => (
                      <SnapshotMetricTile
                        key={stat.label}
                        label={stat.label}
                        icon={stat.icon}
                        accent={stat.accent}
                        value={<AnimatedNumber value={stat.value} />}
                      />
                    ))}
                  </div>
                </div>

                <SnapshotVisibilityMeter
                  notVisible={visibilityCounts.notVisible}
                  weak={visibilityCounts.weak}
                  visible={visibilityCounts.visible}
                />

                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="min-h-[137px] rounded-lg border border-general-border p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
                      <Binoculars className="size-4" />
                      What we found
                    </div>
                    <div className="space-y-2">
                      {(report.execSummary.whatWeFound.length
                        ? report.execSummary.whatWeFound.slice(0, 2)
                        : ["Search demand exists for services this business already offers."]
                      ).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-[10px] font-normal leading-[1.5] tracking-[0.15px] text-general-foreground"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-general-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[137px] rounded-lg border border-general-border p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
                      <Clapperboard className="size-4" />
                      High-impact first steps
                    </div>
                    <div className="space-y-2">
                      {report.opportunityMap.slice(0, 3).map((item, index) => (
                        <div
                          key={`${item.label}-${index}`}
                          className="flex items-start gap-2 text-[10px] font-normal leading-[1.5] tracking-[0.15px] text-general-foreground"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-general-primary" />
                          <span>{item.label || humanize(item.assetType)}</span>
                        </div>
                      ))}
                    </div>
                    {report.firstStepsCaption ? (
                      <p className="mt-2 text-[10px] font-normal leading-[1.5] tracking-[0.15px] text-general-muted-foreground">
                        {report.firstStepsCaption}
                      </p>
                    ) : null}
                  </div>
                </div>
              </SnapshotSectionCard>

              <SnapshotSectionCard
                eyebrow="CUSTOMER DEMAND"
                title="Here is what potential customers are searching."
                description={report.demandIntro}
              >
                <div className="grid w-full grid-cols-2 gap-x-8">
                  {report.customerDemand.map((row) => (
                    <div
                      key={row.keyword}
                      className="flex min-h-[57px] flex-col gap-1.5 border-b border-general-border py-3 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <TruncatedText
                          value={row.keyword}
                          maxWidth="max-w-[320px]"
                          className="text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-foreground"
                        />
                        <div className="flex shrink-0 items-center gap-0.5 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
                          <span className="text-[14px] font-medium tracking-[0.07px] text-general-primary">
                            {row.searchVolume != null ? (
                              <AnimatedNumber value={row.searchVolume} />
                            ) : (
                              "—"
                            )}
                          </span>
                          <span>/</span>
                          <span>month</span>
                        </div>
                      </div>
                      <SnapshotProgressBar
                        value={
                          row.searchVolume != null
                            ? (row.searchVolume / demandMax) * 100
                            : 0
                        }
                      />
                    </div>
                  ))}
                </div>
              </SnapshotSectionCard>

              <SnapshotSectionCard
                eyebrow="MISSED VISIBILITY"
                title="High-value searches you are missing."
                description={report.missedIntro}
              >
                <SnapshotDataTable
                  minWidth={1016}
                  headers={[
                    { label: "Search" },
                    { label: "Searches" },
                    { label: "Your visibility", className: "w-[150px]" },
                    { label: "Found instead" },
                    { label: "Opportunity", className: "w-[150px]" },
                  ]}
                  rows={missedRows.map((row) => {
                    const vis = visibilityVisual(row.visibility);
                    const opp = opportunityVisual(row.opportunity);
                    const barPercent =
                      row.searchVolume != null
                        ? (Math.sqrt(row.searchVolume) / Math.sqrt(missedVolumeMax)) * 100
                        : 0;

                    return [
                      <TruncatedText
                        key="keyword"
                        value={row.keyword}
                        maxWidth="max-w-[220px]"
                        className="text-[14px] font-normal"
                      />,
                      <div key="volume" className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-0.5 text-[10px] text-general-muted-foreground">
                          <span className="text-[12px] font-medium text-general-primary">
                            {row.searchVolume != null
                              ? formatSeoSnapshotNumber(row.searchVolume)
                              : ""}
                          </span>
                          {row.searchVolume != null ? (
                            <>
                              <span>/</span>
                              <span>month</span>
                            </>
                          ) : null}
                        </div>
                        <SnapshotProgressBar value={barPercent} className="w-full max-w-[210px]" />
                      </div>,
                      <SnapshotBadge
                        key="visibility"
                        tone={vis.tone === "red" ? "red" : vis.tone === "amber" ? "orange" : "green"}
                        icon={vis.Icon ?? undefined}
                      >
                        {vis.label}
                      </SnapshotBadge>,
                      row.competitorShowingUp ? (
                        <div key="competitor" className="flex items-center gap-2">
                          <ReportFavicon domain={row.competitorShowingUp} />
                          <TruncatedText
                            value={row.competitorShowingUp}
                            maxWidth="max-w-[170px]"
                          />
                        </div>
                      ) : (
                        <span key="competitor" className="text-general-muted-foreground">
                          -
                        </span>
                      ),
                      <SnapshotBadge key="opportunity" tone="outline">
                        {opp.label}
                      </SnapshotBadge>,
                    ];
                  })}
                />
              </SnapshotSectionCard>

              <SnapshotSectionCard
                eyebrow="COMPETITOR VISIBILITY"
                title="These competitors are being found before you."
                description={report.competitorIntro}
              >
                <SnapshotDataTable
                  minWidth={1016}
                  headers={[
                    { label: "Competitor" },
                    { label: "Appears in", className: "w-[181px]" },
                    { label: "Map Pack", className: "w-[181px]" },
                    { label: "Why they are winning", className: "w-[363px]" },
                  ]}
                  rows={report.competitorVisibility.map((row) => {
                    const inMapPack = !!(row.localPackCount && row.localPackCount > 0);
                    return [
                      <div key="domain" className="flex items-center gap-2">
                        <ReportFavicon domain={row.domain} />
                        <TruncatedText value={row.domain} maxWidth="max-w-[220px]" />
                      </div>,
                      <span key="appears" className="whitespace-nowrap">
                        {row.appearancesInTop10 != null
                          ? `${formatSeoSnapshotNumber(row.appearancesInTop10)} searches`
                          : ""}
                      </span>,
                      <SnapshotBadge key="map" tone="muted">
                        {inMapPack ? "Listed" : "Not Listed"}
                      </SnapshotBadge>,
                      <TruncatedText
                        key="why"
                        value={row.whyWinning || "ranks in top 3 for multiple high-value keywords"}
                        maxWidth="max-w-[340px]"
                      />,
                    ];
                  })}
                />
              </SnapshotSectionCard>

              <SnapshotSectionCard
                eyebrow="COMPETITOR PAGES"
                title="Here is what competitors built to capture that demand."
                description="The specific pages doing the work, and the gap on your site for each."
              >
                <SnapshotDataTable
                  minWidth={1016}
                  headers={[
                    { label: "Competitor page" },
                    { label: "Demand signal", className: "w-[181px]" },
                    { label: "Your gap", className: "w-[181px]" },
                  ]}
                  rows={competitorPageRows.map((row) => {
                    const full = row.pageAddress || row.domain;
                    const { host, path } = splitPath(full);
                    return [
                      <div key="page" className="flex items-center gap-2">
                        <ReportFavicon domain={row.domain || full} />
                        <div className="min-w-0">
                          <TruncatedText
                            value={host}
                            maxWidth="max-w-[520px]"
                            className="text-[10px] font-medium leading-[1.5] tracking-[0.15px] text-general-muted-foreground"
                          />
                          <TruncatedText
                            value={full}
                            maxWidth="max-w-[520px]"
                            className="text-[14px] font-normal leading-[1.5] tracking-[0.07px] text-general-foreground"
                          >
                            {path}
                          </TruncatedText>
                        </div>
                      </div>,
                      <SnapshotBadge key="demand" tone="muted">
                        {row.organicCount != null
                          ? `${formatSeoSnapshotNumber(row.organicCount)} keywords`
                          : row.demandCaptured || "Relevant demand"}
                      </SnapshotBadge>,
                      <SnapshotBadge key="gap" tone={row.clientGap === true ? "red" : "orange"}>
                        {row.clientGap === true ? "Client gap" : "Review gap"}
                      </SnapshotBadge>,
                    ];
                  })}
                />
              </SnapshotSectionCard>

              <SnapshotSectionCard
                eyebrow="OPPORTUNITY MAP"
                title="Here is what we would build first."
                description={report.opportunityIntro}
              >
                <SnapshotDataTable
                  minWidth={1016}
                  headers={[
                    { label: "Tactic", className: "w-[220px]" },
                    { label: "Description" },
                  ]}
                  rows={report.opportunityMap.map((item) => {
                    const tactic = humanize(item.assetType || item.bucket || "Service page");
                    const description = item.label || tactic;
                    const keywords = item.keywords.filter(Boolean).slice(0, 6);

                    return [
                      <SnapshotBadge key="type" tone="muted">
                        {tactic}
                      </SnapshotBadge>,
                      <div key="description" className="flex min-w-0 flex-col gap-2">
                        <TruncatedText
                          value={description}
                          maxWidth="max-w-[680px]"
                          className="text-[14px] font-normal leading-[1.5] tracking-[0.07px] text-general-foreground"
                        />
                        {keywords.length ? (
                          <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword) => (
                              <SnapshotBadge key={keyword} tone="outline">
                                {keyword}
                              </SnapshotBadge>
                            ))}
                          </div>
                        ) : null}
                      </div>,
                    ];
                  })}
                />
              </SnapshotSectionCard>
            </div>
          </SnapshotReportShell>
        </div>
      </div>

      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={markdown}
        defaultFilename={defaultFilename}
        onDownloadPdf={async (filename) =>
          await generatePdfFromSeoSnapshotReport({
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
