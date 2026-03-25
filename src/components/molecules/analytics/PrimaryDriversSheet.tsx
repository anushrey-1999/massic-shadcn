"use client"

import * as React from "react"
import { format, differenceInCalendarDays, startOfDay, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getAnalyticsPeriodBounds } from "@/utils/analytics-period"
import {
  usePrimaryDrivers,
  type PrimaryDriversContributor,
  type PrimaryDriversDriver,
  type PrimaryDriversOrganicBlock,
  type PrimaryDriversResponse,
  type PrimaryDriversSeverity,
  type PrimaryDriversDirection,
} from "@/hooks/use-primary-drivers"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  GOALS: "Goals",
  SESSIONS: "Sessions",
  CLICKS: "Clicks",
  CVR: "Conversion Rate",
  CTR: "Click-Through Rate",
  IMPRESSIONS: "Impressions",
  AVG_POSITION: "Avg Position",
}

const METRIC_DESCRIPTIONS: Record<string, string> = {
  GOALS: "Form fills, calls, and other conversion actions tracked in GA4",
  SESSIONS: "Total visits to the site across all channels (GA4)",
  CLICKS: "Organic search clicks from Google Search Console",
  CVR: "Share of sessions that converted — Goals ÷ Sessions",
  CTR: "Share of impressions that resulted in a click — Clicks ÷ Impressions",
  IMPRESSIONS: "Times the site appeared in Google search results (GSC)",
  AVG_POSITION: "Average rank in Google search results — lower is better (GSC)",
}

const DRIVER_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Outcome":               { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  "Traffic":               { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200"   },
  "Conversion Efficiency": { bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200" },
  "Click Capture":         { bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200"   },
  "Demand":                { bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200" },
  "Ranking":               { bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-200"  },
}

const SEVERITY_CONFIG: Record<PrimaryDriversSeverity, { badge: string; border: string; dot: string; label: string; description: string }> = {
  HIGH:   { badge: "bg-red-100 text-red-700",     border: "border-red-200",   dot: "bg-red-500",    label: "High Impact",   description: "Change is significant — worth discussing on the client call" },
  MEDIUM: { badge: "bg-amber-100 text-amber-700", border: "border-amber-200", dot: "bg-amber-500",  label: "Medium Impact", description: "Noticeable movement, worth monitoring" },
  LOW:    { badge: "bg-slate-100 text-slate-600", border: "border-slate-200", dot: "bg-slate-400",  label: "Low Impact",    description: "Change is within normal variation" },
}

const WINDOW_BUCKET_LABELS: Record<string, string> = {
  "7d":   "Last 7 days",
  "28d":  "Last 28 days",
  "90d":  "Last 90 days",
  "365d": "Last 12 months",
}

const EDGE_CASE_BANNERS: Record<string, { title: string; description: string; color: "amber" | "red" | "blue" }> = {
  POSSIBLE_TRACKING_ISSUE: {
    title: "Possible tracking issue detected",
    description: "GA4 sessions dropped sharply while search impressions stayed stable. This usually means a GA4 tag problem, not a real traffic loss — verify before reporting to the client.",
    color: "amber",
  },
  POSSIBLE_PENALTY: {
    title: "Possible Google penalty or de-indexing",
    description: "Impressions dropped sharply while sessions held. This could be an algorithmic penalty or pages being removed from the index. Escalate for manual review.",
    color: "red",
  },
  DISTRIBUTED: {
    title: "Change is spread across many segments",
    description: "No single channel, device, or page explains more than 25% of this movement. The change is broad — not driven by one thing.",
    color: "blue",
  },
  LOW_VOLUME: {
    title: "Low data volume — interpret with caution",
    description: "One or more metrics had very few data points in the comparison period. Percentages can look dramatic on small numbers.",
    color: "amber",
  },
}

const DIMENSION_LABELS: Record<string, string> = {
  DEVICE: "Device",
  CHANNEL: "Channel",
  PAGE: "Page",
  QUERY: "Query",
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function toIsoDate(date: Date) { return format(date, "yyyy-MM-dd") }

function createDefaultRange() {
  const { presetAnchorDate } = getAnalyticsPeriodBounds()
  return { from: subDays(presetAnchorDate, 6), to: presetAnchorDate }
}

function formatDisplayRange(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return "Select date range"
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
}

function getRangeLength(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return 0
  return differenceInCalendarDays(startOfDay(range.to), startOfDay(range.from)) + 1
}

function fmtDateRange(start: string, end: string): string {
  // Input: "2025-03-01" ISO strings from the API
  // Output: "Mar 1 – Mar 28" or "Mar 1 – Apr 2, 2025" (year only when it differs from current)
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  const currentYear = new Date().getFullYear()
  const startFmt = format(s, s.getFullYear() !== currentYear ? "MMM d, yyyy" : "MMM d")
  const endFmt   = format(e, e.getFullYear() !== currentYear || s.getFullYear() !== e.getFullYear() ? "MMM d, yyyy" : "MMM d")
  return `${startFmt} – ${endFmt}`
}

function fmtAbsolute(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  const abs = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  if (abs < 1000) return `${sign}${Math.round(abs).toLocaleString("en-US")}`
  if (abs < 1_000_000) return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`
  return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  if (!Number.isFinite(value)) return value > 0 ? "New" : "—"
  const abs = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${(abs * 100).toFixed(abs * 100 >= 10 ? 0 : 1)}%`
}

function fmtPp(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  const abs = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${abs.toFixed(2)}pp`
}

function fmtPos(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  const abs = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${abs.toFixed(1)} pos`
}

function formatDriverChange(driver: PrimaryDriversDriver): string {
  if (driver.metric === "AVG_POSITION") return fmtPos(driver.pct_change)
  if (driver.metric === "CVR" || driver.metric === "CTR") return fmtPp(driver.pct_change)
  return fmtPct(driver.pct_change)
}

function dirColor(direction: PrimaryDriversDirection | "up" | "down", invert = false): string {
  if (direction === "flat") return "text-muted-foreground"
  const isUp = direction === "up"
  const good = invert ? !isUp : isUp
  return good ? "text-emerald-600" : "text-red-600"
}

// ─── Shared primitives ─────────────────────────────────────────────────────────

function DirIcon({ direction, invert = false, className }: { direction: PrimaryDriversDirection | "up" | "down"; invert?: boolean; className?: string }) {
  if (direction === "flat") return <Minus className={cn("text-muted-foreground", className)} />
  const isUp = direction === "up"
  const good = invert ? !isUp : isUp
  const cls = cn(good ? "text-emerald-600" : "text-red-600", className)
  return isUp ? <TrendingUp className={cls} /> : <TrendingDown className={cls} />
}

function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 shrink-0 cursor-default text-muted-foreground/60 hover:text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function TruncatedValue({ value, maxWidth = 200 }: { value: string; maxWidth?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="block truncate cursor-default font-medium text-foreground"
          style={{ maxWidth }}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[340px] break-all text-xs">
        {value}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Warning banners ───────────────────────────────────────────────────────────

function WarningBanner({ title, description, color }: { title: string; description: string; color: "amber" | "red" | "blue" }) {
  const styles = {
    amber: { wrap: "border-amber-200 bg-amber-50", icon: "text-amber-600", title: "text-amber-900", body: "text-amber-800" },
    red:   { wrap: "border-red-200 bg-red-50",     icon: "text-red-600",   title: "text-red-900",   body: "text-red-800"   },
    blue:  { wrap: "border-blue-200 bg-blue-50",   icon: "text-blue-600",  title: "text-blue-900",  body: "text-blue-800"  },
  }[color]

  return (
    <div className={cn("rounded-xl border p-3.5", styles.wrap)}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
        <div>
          <p className={cn("text-sm font-semibold", styles.title)}>{title}</p>
          <p className={cn("mt-0.5 text-xs leading-relaxed", styles.body)}>{description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Primary metric card ───────────────────────────────────────────────────────

function PrimaryMetricCard({ data }: { data: PrimaryDriversResponse }) {
  const { primary_metric, severity, window_bucket, date_range } = data
  const sev = SEVERITY_CONFIG[severity]
  const label = METRIC_LABELS[primary_metric.metric] ?? primary_metric.metric
  const desc = METRIC_DESCRIPTIONS[primary_metric.metric]
  const isPos  = primary_metric.metric === "AVG_POSITION"
  const isDeriv = primary_metric.metric === "CVR" || primary_metric.metric === "CTR"

  const deltaStr = isPos ? fmtPos(primary_metric.absolute_delta)
    : isDeriv ? fmtPp(primary_metric.absolute_delta)
    : fmtAbsolute(primary_metric.absolute_delta)

  const pctStr = primary_metric.pct_change !== null ? fmtPct(primary_metric.pct_change) : null
  const direction = primary_metric.direction

  return (
    <div className={cn("rounded-2xl border bg-white p-5 shadow-xs", sev.border)}>
      {/* top row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", sev.badge, sev.border)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                {sev.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              {sev.description}
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">
            {WINDOW_BUCKET_LABELS[window_bucket] ?? window_bucket}
          </span>
        </div>
        {date_range && (
          <span className="text-[11px] text-muted-foreground">
            {fmtDateRange(date_range.start, date_range.end)}
            <span className="mx-1.5 text-muted-foreground/40">vs</span>
            {fmtDateRange(date_range.comparison_start, date_range.comparison_end)}
          </span>
        )}
      </div>

      {/* metric */}
      <div className="mt-4 flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.14px] text-muted-foreground">{label}</p>
            {desc && <InfoTip content={desc} />}
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className={cn("text-[2rem] font-bold leading-none tracking-tight", dirColor(direction, isPos))}>
              {deltaStr}
            </span>
            {pctStr && (
              <span className={cn("text-base font-semibold", dirColor(direction, isPos))}>
                {pctStr}
              </span>
            )}
            <DirIcon direction={direction} invert={isPos} className="h-5 w-5 mb-0.5" />
          </div>
        </div>
      </div>

      {/* flags */}
      {primary_metric.flags.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {primary_metric.flags.map((f) => (
            <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Drivers section ───────────────────────────────────────────────────────────

function DriversSection({ drivers }: { drivers: PrimaryDriversDriver[] }) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="rounded-xl border border-general-border bg-card p-4 text-sm text-muted-foreground">
        No significant drivers identified for this period.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-general-border bg-white overflow-hidden">
      {/* header */}
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-general-border px-4 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Metric</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Change</span>
      </div>

      {drivers.map((driver, i) => {
        const label = METRIC_LABELS[driver.metric] ?? driver.metric
        const desc  = METRIC_DESCRIPTIONS[driver.metric]
        const typeStyle = DRIVER_TYPE_COLORS[driver.driver_type] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" }
        const isPos = driver.metric === "AVG_POSITION"
        const changeStr = formatDriverChange(driver)
        const isPositiveChange = driver.direction === "up"

        // For CVR: build a tooltip with decomposition details
        const cvrTooltip = driver.metric === "CVR" && driver.cvr_share !== null
          ? `CVR explains ${(driver.cvr_share * 100).toFixed(0)}% of the conversion move. Traffic component: ${fmtAbsolute(driver.delta_traffic)} · CVR component: ${fmtAbsolute(driver.delta_cvr)}`
          : null

        return (
          <div
            key={`${driver.metric}-${i}`}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3",
              i < drivers.length - 1 && "border-b border-general-border/60",
              isPositiveChange ? "bg-emerald-50/30" : "bg-red-50/30",
            )}
          >
            {/* left: icon + label + type badge */}
            <div className="flex min-w-0 items-center gap-2.5">
              <DirIcon direction={driver.direction} invert={isPos} className="h-4 w-4 shrink-0" />
              <div className="flex min-w-0 items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  {desc && <InfoTip content={desc} />}
                  {cvrTooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 shrink-0 cursor-default text-orange-400 hover:text-orange-600" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                        {cvrTooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  typeStyle.bg, typeStyle.text, typeStyle.border,
                )}>
                  {driver.driver_type}
                </span>
                {driver.flags.filter(f => f !== "LOW_VOLUME").map(f => (
                  <span key={f} className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            {/* right: change + score tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0 cursor-default text-right">
                  <p className={cn("text-sm font-bold tabular-nums", dirColor(driver.direction, isPos))}>
                    {changeStr}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Driver score: {driver.driver_score.toFixed(3)}
                <br />
                <span className="text-muted-foreground">Higher = stronger influence on primary metric</span>
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}

// ─── Contributors section ──────────────────────────────────────────────────────

// Column widths (in px) — fixed so header and rows always align
const COL = { share: 100, delta: 72 }

function ShareBar({ percent, positive }: { percent: number; positive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 flex-none rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", positive ? "bg-emerald-500" : "bg-red-400")}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="w-7 flex-none text-right text-[11px] tabular-nums text-muted-foreground">
        {percent}%
      </span>
    </div>
  )
}

function ContributorRow({
  contributor,
  depth = 0,
  totalAbsDelta,
}: {
  contributor: PrimaryDriversContributor
  depth?: number
  totalAbsDelta: number
}) {
  const [expanded, setExpanded] = React.useState(depth === 0)
  const hasChildren = contributor.children && contributor.children.length > 0
  const sharePercent = Math.round(contributor.contribution_share * 100)
  const dimensionLabel = DIMENSION_LABELS[contributor.dimension] ?? contributor.dimension
  const isPositive = contributor.absolute_delta >= 0

  // Indent: 16px per level on the left edge cell only
  const indentPx = depth * 20

  return (
    <>
      <tr
        className={cn(
          "group border-b border-general-border/50 last:border-0",
          hasChildren && "cursor-pointer select-none",
          depth === 0 && "bg-white",
          depth === 1 && "bg-muted/20",
          depth === 2 && "bg-muted/10",
        )}
        onClick={() => hasChildren && setExpanded((v) => !v)}
      >
        {/* Dimension label + expand toggle */}
        <td className="py-2.5 pl-3 pr-2 align-middle" style={{ paddingLeft: `${12 + indentPx}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150", expanded && "rotate-90")} />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              depth === 0 ? "bg-slate-100 text-slate-500" : "bg-transparent text-muted-foreground/70",
            )}>
              {dimensionLabel}
            </span>
          </div>
        </td>

        {/* Segment value — truncated, tooltip on hover */}
        <td className="py-2.5 pr-3 align-middle max-w-0 w-full">
          <TruncatedValue value={contributor.value} maxWidth={220} />
        </td>

        {/* Share bar */}
        <td className="py-2.5 pr-4 align-middle" style={{ width: COL.share }}>
          <ShareBar percent={sharePercent} positive={isPositive} />
        </td>

        {/* Delta */}
        <td className="py-2.5 pr-3 align-middle text-right tabular-nums" style={{ width: COL.delta }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "cursor-default text-sm font-semibold",
                isPositive ? "text-emerald-600" : "text-red-600",
              )}>
                {fmtAbsolute(contributor.absolute_delta)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Explains {sharePercent}% of the total change
              <br />
              <span className="text-muted-foreground">Contributor score: {contributor.contributor_score.toFixed(3)}</span>
            </TooltipContent>
          </Tooltip>
        </td>

        {/* Flags */}
        <td className="py-2.5 pr-3 align-middle">
          <div className="flex gap-1">
            {contributor.flags.slice(0, 1).map(f => (
              <span key={f} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </td>
      </tr>

      {/* Children */}
      {hasChildren && expanded && contributor.children.map((child, i) => (
        <ContributorRow
          key={`${child.dimension}-${child.value}-${i}`}
          contributor={child}
          depth={depth + 1}
          totalAbsDelta={totalAbsDelta}
        />
      ))}
    </>
  )
}

function ContributorsSection({ contributors }: { contributors: PrimaryDriversContributor[] }) {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="rounded-xl border border-general-border bg-card p-4 text-sm text-muted-foreground">
        No contributor breakdown available for this period.
      </div>
    )
  }

  const totalAbsDelta = contributors.reduce((sum, c) => sum + Math.abs(c.absolute_delta), 0)

  return (
    <div className="rounded-xl border border-general-border bg-white overflow-hidden">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {/* dim label col */}
          <col style={{ width: 120 }} />
          {/* value col — takes remaining space */}
          <col />
          {/* share */}
          <col style={{ width: COL.share }} />
          {/* delta */}
          <col style={{ width: COL.delta }} />
          {/* flags */}
          <col style={{ width: 60 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-general-border bg-muted/30">
            <th className="py-2.5 pl-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground" colSpan={2}>
              Where
            </th>
            <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ width: COL.share }}>
              Share of change
            </th>
            <th className="py-2.5 pr-3 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ width: COL.delta }}>
              Delta
            </th>
            <th style={{ width: 60 }} />
          </tr>
        </thead>
        <tbody>
          {contributors.map((c, i) => (
            <ContributorRow
              key={`${c.dimension}-${c.value}-${i}`}
              contributor={c}
              depth={0}
              totalAbsDelta={totalAbsDelta}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Organic block ─────────────────────────────────────────────────────────────

function OrganicStatCard({
  label,
  value,
  isGood,
  tooltip,
}: {
  label: string
  value: string
  isGood: boolean | null
  tooltip?: string
}) {
  const colorCls = isGood === null ? "text-foreground"
    : isGood ? "text-emerald-600"
    : "text-red-600"

  return (
    <div className="rounded-lg border border-general-border bg-muted/20 p-3">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14px] text-muted-foreground">{label}</p>
        {tooltip && <InfoTip content={tooltip} />}
      </div>
      <p className={cn("text-base font-bold tabular-nums", colorCls)}>{value}</p>
    </div>
  )
}

function OrganicBlockSection({ block }: { block: PrimaryDriversOrganicBlock }) {
  if (!block.present) return null

  const hasBrand    = block.brand_clicks_delta !== null
  const hasNonBrand = block.nonbrand_clicks_delta !== null

  return (
    <div className="rounded-xl border border-general-border bg-white overflow-hidden">
      <div className="border-b border-general-border px-4 py-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">Organic Search (GSC)</h3>
          <InfoTip content="Always shown — organic is the primary growth lever for local SEO, even when it isn't the top GA4 driver this period." />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main 4-metric grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OrganicStatCard
            label="Clicks"
            value={fmtAbsolute(block.clicks_delta)}
            isGood={block.clicks_delta === 0 ? null : block.clicks_delta > 0}
            tooltip="Organic search clicks (GSC). How many more or fewer people clicked through from Google."
          />
          <OrganicStatCard
            label="Impressions"
            value={fmtAbsolute(block.impressions_delta)}
            isGood={block.impressions_delta === 0 ? null : block.impressions_delta > 0}
            tooltip="Times the site appeared in search results. Growth = more ranking coverage."
          />
          <OrganicStatCard
            label="CTR"
            value={fmtPp(block.ctr_pp_change)}
            isGood={block.ctr_pp_change === 0 ? null : block.ctr_pp_change > 0}
            tooltip="Click-through rate change in percentage points. Drops often mean title/description issues."
          />
          <OrganicStatCard
            label="Avg Position"
            value={fmtPos(block.position_delta)}
            isGood={block.position_delta === 0 ? null : block.position_delta > 0}
            tooltip="Position improvement = positive number. Lower rank number = ranked higher in Google."
          />
        </div>

        {/* Brand / Non-brand grid */}
        {(hasBrand || hasNonBrand) && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brand vs Non-Brand</p>
                <InfoTip content="Brand = queries containing your business name. Non-brand = everything else. Non-brand growth is the harder, more valuable win for local SEO." />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {hasBrand && (
                  <OrganicStatCard
                    label="Brand clicks"
                    value={fmtAbsolute(block.brand_clicks_delta)}
                    isGood={block.brand_clicks_delta === 0 ? null : (block.brand_clicks_delta ?? 0) > 0}
                  />
                )}
                {hasNonBrand && (
                  <OrganicStatCard
                    label="Non-brand clicks"
                    value={fmtAbsolute(block.nonbrand_clicks_delta)}
                    isGood={block.nonbrand_clicks_delta === 0 ? null : (block.nonbrand_clicks_delta ?? 0) > 0}
                  />
                )}
                {block.brand_impressions_delta !== null && (
                  <OrganicStatCard
                    label="Brand impr."
                    value={fmtAbsolute(block.brand_impressions_delta)}
                    isGood={block.brand_impressions_delta === 0 ? null : block.brand_impressions_delta > 0}
                  />
                )}
                {block.nonbrand_impressions_delta !== null && (
                  <OrganicStatCard
                    label="Non-brand impr."
                    value={fmtAbsolute(block.nonbrand_impressions_delta)}
                    isGood={block.nonbrand_impressions_delta === 0 ? null : block.nonbrand_impressions_delta > 0}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Date range picker ─────────────────────────────────────────────────────────

function PrimaryDriversRangePicker({
  value,
  onChange,
  validationMessage,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  validationMessage: string | null
}) {
  const [open, setOpen] = React.useState(false)
  const { minSelectableDate, presetAnchorDate } = getAnalyticsPeriodBounds()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-start rounded-[10px] border-general-border bg-white px-3 text-left text-sm font-medium">
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {formatDisplayRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b bg-muted/20 px-4 py-3">
          <p className="text-sm font-semibold">Select date range</p>
          <p className="text-xs text-muted-foreground">Minimum 7 days. Previous period compared automatically.</p>
          {validationMessage && <p className="mt-1.5 text-xs font-medium text-red-600">{validationMessage}</p>}
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={(r) => {
            onChange(r)
            if (r?.from && r?.to && getRangeLength(r) >= 7) setOpen(false)
          }}
          numberOfMonths={2}
          disabled={(d) => d < minSelectableDate || d > presetAnchorDate}
          defaultMonth={value?.from}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Sheet ────────────────────────────────────────────────────────────────

interface PrimaryDriversSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string | null
  businessName: string
}

export function PrimaryDriversSheet({ open, onOpenChange, businessId, businessName }: PrimaryDriversSheetProps) {
  const defaultRange = React.useMemo(() => createDefaultRange(), [])
  const [draftRange, setDraftRange]       = React.useState<DateRange | undefined>(defaultRange)
  const [committedRange, setCommittedRange] = React.useState<DateRange | undefined>(defaultRange)
  const [rangeMsg, setRangeMsg]           = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      const d = createDefaultRange()
      setDraftRange(d)
      setCommittedRange(d)
      setRangeMsg(null)
    }
  }, [open])

  const startDate = committedRange?.from ? toIsoDate(committedRange.from) : null
  const endDate   = committedRange?.to   ? toIsoDate(committedRange.to)   : null

  const { data, isLoading, isFetching, isError, error } = usePrimaryDrivers({
    businessId, startDate, endDate, enabled: open,
  })

  const handleRangeChange = React.useCallback((next: DateRange | undefined) => {
    setDraftRange(next)
    if (!next?.from || !next?.to) { setRangeMsg(null); return }
    const len = getRangeLength(next)
    if (len < 7) { setRangeMsg("Select at least 7 days for reliable analysis."); return }
    setRangeMsg(null)
    setCommittedRange({ from: startOfDay(next.from), to: startOfDay(next.to) })
  }, [])

  const banners = React.useMemo(() => {
    if (!data) return []
    return (data.edge_case_flags ?? [])
      .filter((f) => f in EDGE_CASE_BANNERS)
      .map((f) => ({ key: f, ...EDGE_CASE_BANNERS[f] }))
  }, [data])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l border-general-border p-0 pt-8 sm:max-w-3xl">

        {/* Header */}
        <SheetHeader className="border-b border-general-border bg-background px-6 py-4 pr-14">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-xl font-semibold tracking-tight">Primary Drivers</SheetTitle>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{businessName}</p>
            </div>
            <PrimaryDriversRangePicker value={draftRange} onChange={handleRangeChange} validationMessage={rangeMsg} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Computing primary drivers…</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-sm rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-red-600" />
                <h3 className="mt-3 text-sm font-semibold text-red-900">Unable to load Primary Drivers</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                  {error || "Something went wrong. Try changing the date range."}
                </p>
              </div>
            </div>
          ) : data ? (
            <div className="relative h-full">
              <ScrollArea className="h-full">
                <div className="space-y-4 px-6 py-5">

                  {banners.map((b) => (
                    <WarningBanner key={b.key} title={b.title} description={b.description} color={b.color} />
                  ))}

                  {/* What changed */}
                  <PrimaryMetricCard data={data} />

                  {/* What drove it */}
                  <section className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">What drove it</h3>
                      <InfoTip content="Metrics whose change meaningfully explains the overall movement, ranked by influence. Up to 4 are shown." />
                    </div>
                    <DriversSection drivers={data.drivers} />
                  </section>

                  {/* Where it happened */}
                  <section className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">Where it happened</h3>
                      <InfoTip content="Which channels, pages, or search queries explain the movement. Expand rows to drill down." />
                    </div>
                    <ContributorsSection contributors={data.contributors} />
                  </section>

                  {/* Organic always-on block */}
                  {data.organic_block?.present && (
                    <section>
                      <OrganicBlockSection block={data.organic_block} />
                    </section>
                  )}

                </div>
              </ScrollArea>

              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex items-center gap-3 rounded-2xl border border-general-border bg-white px-5 py-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">Recomputing…</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </SheetContent>
    </Sheet>
  )
}
