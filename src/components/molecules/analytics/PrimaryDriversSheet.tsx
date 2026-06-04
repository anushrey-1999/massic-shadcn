"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { format, differenceInCalendarDays, startOfDay, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { AlertTriangle, Calendar as CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, History, Info, Loader2, Search, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  getAnalyticsPeriodBounds,
  PERIOD_SELECTOR_GROUPS,
  formatTimePeriodSummary,
  resolveTimePeriodRange,
  type TimePeriodPreset,
} from "@/utils/analytics-period"
import {
  type CallPrepRunDetail,
  usePrimaryDrivers,
  type CallPrepBriefResponse,
  type PrimaryDriversBaseline,
  type PrimaryDriversContributor,
  type PrimaryDriversHeadlineReel,
  type PrimaryDriversPageContributor,
  type PrimaryDriversQuery,
  type PrimaryDriversLegacyResponse,
  type PrimaryDriversResponse,
  type PrimaryDriversV2Channel,
  type PrimaryDriversV2Cta,
  type PrimaryDriversV2Page,
  type PrimaryDriversV2Response,
  type PrimaryDriversV2Source,
  type PrimaryDriversWin,
} from "@/hooks/use-primary-drivers"
import { useCallPrepBrief } from "@/hooks/use-call-prep-brief"
import { useCallPrepRunDetail, useCallPrepRuns } from "@/hooks/use-call-prep-runs"
import { CallPrepBriefView } from "./CallPrepBriefView"
import { SourceFavicon } from "./SourceFavicon"

// ─── Formatters ─────────────────────────────────────────────────────────────────

const POSITIVE_TEXT_CLASS = "text-[#0F6E56]"
const POSITIVE_ACCENT_CLASS = "bg-[#1D9E75]"
const POSITIVE_PILL_CLASS = "border-[#9FE1CB] bg-[#F0FDFA] text-[#0F6E56]"
const WARNING_PILL_CLASS = "border-[#FAC775] bg-[#FFFBEB] text-[#854F0B]"
const NEUTRAL_QUERY_PILL_CLASS = "border-border/60 bg-background text-muted-foreground"
const SINGLE_LINE_PILL_CLASS = "inline-flex h-6 min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap rounded-full border px-2 text-[11px] leading-none"
const PILL_TEXT_CLASS = "block min-w-0 truncate"

function toIsoDate(date: Date) { return format(date, "yyyy-MM-dd") }

function createDefaultRange() {
  const { presetAnchorDate } = getAnalyticsPeriodBounds()
  return { from: subDays(presetAnchorDate, 13), to: presetAnchorDate }
}

function formatDisplayRange(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return "Select date range"
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
}

function getRangeLength(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return 0
  return differenceInCalendarDays(startOfDay(range.to), startOfDay(range.from)) + 1
}

function rangeMatchesPreset(value: DateRange | undefined, preset: TimePeriodPreset): boolean {
  if (!value?.from || !value?.to) return false
  const r = resolveTimePeriodRange(preset)
  if (!r) return false
  return (
    startOfDay(value.from).getTime() === r.from.getTime()
    && startOfDay(value.to).getTime() === r.to.getTime()
  )
}

function matchesAnyPreset(value: DateRange | undefined): boolean {
  for (const group of PERIOD_SELECTOR_GROUPS) {
    for (const period of group.options) {
      if (rangeMatchesPreset(value, period.value)) return true
    }
  }
  return false
}

function fmtDateRange(start: string, end: string): string {
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

function fmtPp(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "—"
  // value is already in percentage points (e.g. -1.2 = -1.2 pp) — do NOT multiply by 100
  const abs = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${abs.toFixed(decimals)} pts`
}

function fmtPosDelta(delta: number): string {
  const abs = Math.abs(delta)
  const sign = delta > 0 ? "↑" : delta < 0 ? "↓" : ""
  return `${sign}${abs.toFixed(1)}`
}

function deltaColor(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "text-muted-foreground"
  return value > 0 ? POSITIVE_TEXT_CLASS : "text-[#A32D2D]"
}

// ─── Baseline phrase ─────────────────────────────────────────────────────────────

function formatBaselinePeriod(baselineDays: number): string {
  if (baselineDays < 90) {
    const weeks = Math.round(baselineDays / 7)
    return `${weeks}-week`
  }
  const months = Math.round(baselineDays / 30)
  return `${months}-month`
}

function buildBaselinePhrase(baseline: PrimaryDriversBaseline, anchor: string): string | null {
  if (baseline.status === "NONE") return null
  const metricKey = anchor.toLowerCase() as "goals" | "sessions" | "clicks"
  const anchorMetric =
    baseline.per_metric[metricKey] ??
    baseline.per_metric.sessions
  if (!anchorMetric || anchorMetric.vs_baseline_pct === null) return null

  const vsPct = anchorMetric.vs_baseline_pct
  const period = formatBaselinePeriod(baseline.baseline_days)
  const suffix = baseline.status === "PARTIAL" ? " (limited history)" : ""

  if (Math.abs(vsPct) < 0.10) return `in line with ${period} average${suffix}`
  if (vsPct >= 0.10) return `above ${period} average${suffix}`
  return `below ${period} average${suffix}`
}

// ─── Headline reel colour mapping ─────────────────────────────────────────────────
// Direction comes directly from the backend — no keyword scanning needed.

type ReelColor = "neg" | "pos" | "flat" | "neutral"

const DIRECTION_TO_COLOR: Record<PrimaryDriversHeadlineReel["direction"], ReelColor> = {
  down:    "neg",
  up:      "pos",
  flat:    "flat",
  neutral: "neutral",
}

const REEL_COLOR_CLS: Record<ReelColor, string> = {
  neg:     "text-[#A32D2D] font-medium",
  pos:     cn(POSITIVE_TEXT_CLASS, "font-medium"),
  flat:    "text-muted-foreground font-medium",
  neutral: "text-muted-foreground",
}

// ─── Bottom line builder ──────────────────────────────────────────────────────────

interface BottomSegment {
  text: string
  color: ReelColor
}

function buildBottomLine(
  contributors: PrimaryDriversContributor[],
  baseline: PrimaryDriversBaseline,
  anchor: string,
  isDivergence: boolean,
): BottomSegment[] {
  const parts: BottomSegment[] = []

  // Channel breakdown (top 3)
  for (const ch of contributors.slice(0, 3)) {
    const sessions = ch.sessions_delta
    if (sessions === null) continue

    const isOrganic = ch.value.toLowerCase().includes("organic")
    let text = `${ch.value} ${fmtAbsolute(sessions)} sessions`
    if (isOrganic && ch.clicks_delta !== null) {
      text += `, ${fmtAbsolute(ch.clicks_delta)} clicks`
    }
    const dir: ReelColor = sessions > 0 ? "pos" : sessions < 0 ? "neg" : "neutral"
    parts.push({ text, color: dir })
  }

  // CVR detail when divergence
  if (isDivergence) {
    const organic = contributors.find((c) => c.value.toLowerCase().includes("organic"))
    if (organic?.cvr_pp_delta !== null && organic?.cvr_pp_delta !== undefined) {
      const pp = Math.abs(organic.cvr_pp_delta).toFixed(1)
      const dir = organic.cvr_pp_delta > 0 ? "rose" : "dropped"
      const topPage = organic.children?.[0]?.value ?? ""
      const pageStr = topPage ? ` on ${topPage}` : ""
      parts.push({ text: `CVR ${dir} ${pp} pts${pageStr}`, color: organic.cvr_pp_delta > 0 ? "pos" : "neg" })
    }
  }

  // Baseline phrase
  const baselinePhrase = buildBaselinePhrase(baseline, anchor)
  if (baselinePhrase) {
    const isAbove = baselinePhrase.startsWith("above")
    const isBelow = baselinePhrase.startsWith("below")
    parts.push({ text: baselinePhrase, color: isAbove ? "pos" : isBelow ? "neg" : "flat" })
  }

  return parts
}

// ─── Window tag ───────────────────────────────────────────────────────────────────

function WindowTag({ bucket, baseline }: { bucket: string; baseline: PrimaryDriversBaseline }) {
  const is7d = bucket === "7d"
  const isPartialBaseline = baseline.status === "PARTIAL" && bucket !== "7d"

  let label = bucket === "7d" ? "7 days" : bucket === "28d" ? "28 days" : bucket === "90d" ? "90 days" : "12 months"
  let noisy = false

  if (is7d) { label = "7 days · high variance"; noisy = true }
  else if (isPartialBaseline) { label += " · limited baseline"; noisy = true }

  return (
    <span className={cn(
      "inline-flex h-6 items-center rounded border px-2 text-[10px] leading-none",
      noisy
        ? WARNING_PILL_CLASS
        : "border-border/50 text-muted-foreground",
    )}>
      {label}
    </span>
  )
}

// ─── Notice bar ───────────────────────────────────────────────────────────────────

function NoticeBar({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 max-w-full items-start gap-2 rounded-md border border-[#FAC775] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#633806]">
      {icon ?? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-[#B45309]" />}
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{text}</span>
    </div>
  )
}

function InfoBar({ text }: { text: string }) {
  return (
    <div className="flex min-w-0 max-w-full items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
      <Info className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{text}</span>
    </div>
  )
}

// ─── Headline panel ───────────────────────────────────────────────────────────────

function HeadlinePanel({ data }: { data: PrimaryDriversLegacyResponse }) {
  // Use structured reels from backend — each has an explicit direction tag.
  // Fall back to plain-text split only if headline_reels is missing (old API response).
  const reels: PrimaryDriversHeadlineReel[] = data.headline_reels?.length
    ? data.headline_reels
    : data.headline
        .split(/\s{1,2}·\s{1,2}/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ text: s, direction: "neutral" as const }))

  const bottomParts = buildBottomLine(
    data.contributors,
    data.baseline,
    data.contributor_anchor,
    data.contributor_divergence,
  )

  return (
    <div className="mb-3.5 min-w-0 max-w-full overflow-hidden rounded-lg bg-secondary/60 px-3.5 py-3">
      {/* Top line */}
      <p className="mb-1 min-w-0 break-words text-[15px] leading-[1.5] [overflow-wrap:anywhere]">
        {reels.map((reel, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-foreground/70 mx-[6px] text-[18px] leading-none">·</span>}
            <span className={REEL_COLOR_CLS[DIRECTION_TO_COLOR[reel.direction]]}>{reel.text}</span>
          </React.Fragment>
        ))}
      </p>

      {/* Bottom line */}
      {bottomParts.length > 0 && (
        <p className="min-w-0 break-words text-[12px] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
          {bottomParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-1 text-foreground/60 text-[14px] leading-none">·</span>}
              <span className={cn(
                part.color === "neg" ? "text-[#E24B4A]"
                : part.color === "pos" ? POSITIVE_TEXT_CLASS
                : undefined,
              )}>
                {part.text}
              </span>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  )
}

// ─── Wins bar ─────────────────────────────────────────────────────────────────────

function WinsBar({ wins }: { wins: PrimaryDriversWin[] }) {
  if (!wins || wins.length === 0) return null

  return (
    <div className="mb-4 flex min-w-0 max-w-full items-start gap-2 overflow-hidden rounded-lg border border-[#9FE1CB] bg-[#F0FDFA] px-3 py-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-[#0F6E56]">
        Wins
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {wins.map((win, i) => (
          <span key={i} className="min-w-0 break-words text-[12px] leading-snug text-[#085041] [overflow-wrap:anywhere]">
            <span className="text-[#9FE1CB] mr-1">·</span>
            {win.label} {win.value}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Channel stat columns ─────────────────────────────────────────────────────────

interface StatDef {
  key: "goals" | "sessions" | "clicks" | "cvr"
  value: number | null
}

function getChannelStats(
  ch: PrimaryDriversContributor,
  anchor: string,
  isDivergence: boolean,
): StatDef[] {
  const isOrganic = ch.value.toLowerCase().includes("organic")

  if (isDivergence) {
    return [
      { key: "goals",    value: ch.goals_delta },
      { key: "sessions", value: ch.sessions_delta },
      { key: "cvr",      value: ch.cvr_pp_delta },
    ].filter((s) => s.value !== null) as StatDef[]
  }

  const order = anchor === "CLICKS"
    ? ["clicks", "sessions", "goals"]
    : anchor === "SESSIONS"
      ? ["sessions", "goals", "clicks"]
      : ["goals", "sessions", "clicks"]

  const result: StatDef[] = []
  for (const key of order) {
    if (key === "clicks" && !isOrganic) continue
    const val = key === "goals" ? ch.goals_delta
      : key === "sessions" ? ch.sessions_delta
      : ch.clicks_delta
    if (val !== null && val !== 0) {
      result.push({ key: key as StatDef["key"], value: val })
    }
  }
  return result
}

function getPageStats(
  page: PrimaryDriversPageContributor,
  anchor: string,
  isDivergence: boolean,
  isOrganic: boolean,
): StatDef[] {
  if (isDivergence) {
    return [
      { key: "goals",    value: page.goals_delta },
      { key: "sessions", value: page.sessions_delta },
      { key: "cvr",      value: page.cvr_pp_delta },
    ].filter((s) => s.value !== null) as StatDef[]
  }

  const order = anchor === "CLICKS"
    ? ["clicks", "sessions", "goals"]
    : anchor === "SESSIONS"
      ? ["sessions", "goals", "clicks"]
      : ["goals", "sessions", "clicks"]

  const result: StatDef[] = []
  for (const key of order) {
    if (key === "clicks" && !isOrganic) continue
    const val = key === "goals" ? page.goals_delta
      : key === "sessions" ? page.sessions_delta
      : page.clicks_delta
    if (val !== null && val !== 0) {
      result.push({ key: key as StatDef["key"], value: val })
    }
  }
  return result
}

function statLabel(key: StatDef["key"], value: number | null): string {
  if (key === "cvr") return "CVR"
  const base = key === "goals" ? "Goals" : key === "sessions" ? "Sessions" : "Clicks"
  if (value === null || value === 0) return base
  return value > 0 ? `${base} gained` : `${base} lost`
}

function statDisplay(key: StatDef["key"], value: number | null): string {
  if (value === null) return "—"
  if (key === "cvr") return fmtPp(value)
  return fmtAbsolute(value)
}

// ─── Channel header stat chip ─────────────────────────────────────────────────────

function ChStat({ def }: { def: StatDef }) {
  const val = def.value
  const cls = val === null ? "text-muted-foreground"
    : def.key === "cvr" ? (val > 0 ? POSITIVE_TEXT_CLASS : val < 0 ? "text-[#A32D2D]" : "text-muted-foreground")
    : deltaColor(val)

  return (
    <div className="text-right">
      <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70 mb-px">
        {statLabel(def.key, def.value)}
      </p>
      <p className={cn("text-[14px] font-medium tabular-nums", cls)}>
        {statDisplay(def.key, val)}
      </p>
    </div>
  )
}

// ─── Query section ────────────────────────────────────────────────────────────────

function buildQuerySummary(queries: PrimaryDriversQuery[]) {
  const totalClicks = queries.reduce((s, q) => s + q.clicks_delta, 0)
  const totalImpr   = queries.reduce((s, q) => s + q.impressions_delta, 0)
  const avgPos      = queries.length > 0
    ? queries.reduce((s, q) => s + q.position_delta, 0) / queries.length
    : 0
  return { totalClicks, totalImpr, avgPos }
}

function QuerySection({ queries, is7d }: { queries: PrimaryDriversQuery[]; is7d: boolean }) {
  if (is7d) {
    return (
    <div className="min-w-0 break-words border-t border-dashed border-border/50 bg-secondary/40 py-2 pl-8 pr-4 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
        Query data unavailable for 7-day windows
      </div>
    )
  }

  if (!queries || queries.length === 0) return null

  const { totalClicks, totalImpr, avgPos } = buildQuerySummary(queries)

  const clicksColor = deltaColor(totalClicks)
  const imprColor   = deltaColor(totalImpr)
  const posColor    = Math.abs(avgPos) < 0.1
    ? "text-muted-foreground"
    : avgPos > 0 ? POSITIVE_TEXT_CLASS : "text-[#A32D2D]"

  return (
    <div className="min-w-0 max-w-full overflow-hidden border-t border-dashed border-border/50 bg-secondary/30 py-2.5 pl-8 pr-4">
      {/* Summary numbers */}
      <div className="mb-1.5 flex flex-wrap gap-3">
        <span className={cn("text-[11px] font-medium", clicksColor)}>
          <span className="text-[9px] font-normal text-muted-foreground mr-0.5">clicks</span>
          {fmtAbsolute(totalClicks)}
        </span>
        <span className={cn("text-[11px] font-medium", imprColor)}>
          <span className="text-[9px] font-normal text-muted-foreground mr-0.5">impr</span>
          {fmtAbsolute(totalImpr)}
        </span>
        <span className={cn("text-[11px] font-medium", posColor)}>
          <span className="text-[9px] font-normal text-muted-foreground mr-0.5">pos avg</span>
          {fmtPosDelta(avgPos)}
        </span>
      </div>

      {/* Query pills */}
      <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
        {queries.map((q, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className={cn(SINGLE_LINE_PILL_CLASS, "cursor-default sm:max-w-[240px]", NEUTRAL_QUERY_PILL_CLASS)}>
                <span className={PILL_TEXT_CLASS}>{q.query_full || q.query}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
              {q.query_full || q.query}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

// ─── Page row ─────────────────────────────────────────────────────────────────────

function PageRow({
  page,
  isOrganic,
  anchor,
  isDivergence,
  is7d,
}: {
  page: PrimaryDriversPageContributor
  isOrganic: boolean
  anchor: string
  isDivergence: boolean
  is7d: boolean
}) {
  const stats = getPageStats(page, anchor, isDivergence, isOrganic)
  const hasQueries = isOrganic && !!page.queries && page.queries.length > 0
  const showQuerySection = isOrganic  // organic shows query section (7d shows "unavailable")

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      {/* Page row */}
      <div className="grid min-w-0 gap-2 py-2 pl-8 pr-4 transition-colors hover:bg-secondary/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
        <div className="min-w-0 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block min-w-0 cursor-default break-all font-mono text-[11px] text-muted-foreground sm:max-w-[220px] sm:truncate">
                {page.value}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px] break-all text-xs">{page.value}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex min-w-0 flex-wrap gap-3 sm:flex-shrink-0 sm:justify-end">
          {stats.map((def, i) => (
            <div key={i} className="text-right">
              <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/60 mb-px">
                {def.key === "cvr" ? "CVR" : def.key === "goals" ? "Goals" : def.key === "sessions" ? "Sessions" : "Clicks"}
              </p>
              <p className={cn("text-[12px] font-medium tabular-nums",
                def.value === null ? "text-muted-foreground"
                : deltaColor(def.value),
              )}>
                {def.value === null ? "—" : def.key === "cvr" ? fmtPp(def.value) : fmtAbsolute(def.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Query section */}
      {showQuerySection && (
        <QuerySection queries={hasQueries ? page.queries! : []} is7d={is7d} />
      )}
    </div>
  )
}

// ─── Coverage indicator ───────────────────────────────────────────────────────────

function CoverageRow({
  shownPct,
  hiddenCount,
  channelName,
}: {
  shownPct: number
  hiddenCount: number
  channelName: string
}) {
  const pct = Math.round(shownPct * 100)
  const channelLabel = channelName.toLowerCase()

  if (pct >= 100 && hiddenCount === 0) {
    return (
      <div className="px-4 py-1.5 text-[11px] text-muted-foreground/70">
        Showing 100% of {channelLabel} change
      </div>
    )
  }

  return (
    <div className="px-4 py-1.5 text-[11px] text-muted-foreground/70">
      {hiddenCount > 0 ? `+ ${hiddenCount} more ${hiddenCount === 1 ? "page" : "pages"} · ` : ""}
      showing {pct}% of {channelLabel} change
    </div>
  )
}

// ─── Channel block ────────────────────────────────────────────────────────────────

function ChannelBlock({
  ch,
  anchor,
  isDivergence,
  is7d,
}: {
  ch: PrimaryDriversContributor
  anchor: string
  isDivergence: boolean
  is7d: boolean
}) {
  const isOrganic = ch.value.toLowerCase().includes("organic")
  const isPos = ch.anchor_delta >= 0
  const stats = getChannelStats(ch, anchor, isDivergence)
  const lastPage = ch.children[ch.children.length - 1]
  const shownPct = lastPage?.coverage_pct ?? ch.coverage_pct

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/40">
      {/* Channel header */}
      <div className={cn(
        "grid min-w-0 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        isPos
          ? "bg-[#F0FDFA] border-b border-[#9FE1CB]"
          : "bg-[#FEF2F2] border-b border-[#F7C1C1]",
      )}>
        <div className="flex min-w-0 items-start gap-2.5">
          <div className={cn("w-1 h-[22px] rounded-sm flex-shrink-0", isPos ? POSITIVE_ACCENT_CLASS : "bg-[#E24B4A]")} />
          <span className="min-w-0 break-words text-[13px] font-medium [overflow-wrap:anywhere]">{ch.value}</span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-4 sm:justify-end">
          {stats.map((def, i) => (
            <ChStat key={i} def={def} />
          ))}
        </div>
      </div>

      {/* Page list */}
      <div className="bg-background divide-y divide-border/30">
        {ch.children.map((page, i) => (
          <PageRow
            key={`${page.value}-${i}`}
            page={page}
            isOrganic={isOrganic}
            anchor={anchor}
            isDivergence={isDivergence}
            is7d={is7d}
          />
        ))}
        {ch.children.length > 0 && (
          <CoverageRow
            shownPct={shownPct}
            hiddenCount={ch.page_hidden_count ?? 0}
            channelName={ch.value}
          />
        )}
      </div>
    </div>
  )
}

// ─── Date range picker ────────────────────────────────────────────────────────────

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
  const [customExpanded, setCustomExpanded] = React.useState(false)
  const { minSelectableDate, presetAnchorDate } = getAnalyticsPeriodBounds()

  React.useEffect(() => {
    if (!open) return
    setCustomExpanded(!matchesAnyPreset(value))
  }, [open, value])

  const handlePresetSelect = (preset: TimePeriodPreset) => {
    const r = resolveTimePeriodRange(preset)
    if (!r) return
    onChange({ from: r.from, to: r.to })
    setCustomExpanded(false)
    if (getRangeLength({ from: r.from, to: r.to }) >= 7) {
      setOpen(false)
    }
  }

  const handleCustomCalendarSelect = (r: DateRange | undefined) => {
    onChange(r)
    if (r?.from && r?.to && getRangeLength(r) >= 7) {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-start rounded-[10px] border-general-border bg-white px-3 text-left text-sm font-medium">
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {formatDisplayRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[min(100vw-1rem,720px)] min-w-[260px] max-h-[calc(100vh-5rem)] overflow-y-auto p-0">
        <div className="border-b bg-muted/20 px-4 py-3">
          <p className="text-sm font-semibold">Select date range</p>
          <p className="text-xs text-muted-foreground">Minimum 7 days. Previous period compared automatically.</p>
          {validationMessage && <p className="mt-1.5 text-xs font-medium text-red-600">{validationMessage}</p>}
        </div>

        {PERIOD_SELECTOR_GROUPS.map((group, index) => (
          <div key={group.id}>
            {index > 0 ? <Separator /> : null}
            <div className="p-1">
              {group.options.map((period) => {
                const isActive = rangeMatchesPreset(value, period.value)
                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => handlePresetSelect(period.value)}
                    className={cn(
                      "flex w-full items-start justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60",
                      isActive && "bg-muted",
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{period.label}</span>
                      {isActive ? (
                        <span className="text-xs text-muted-foreground">
                          {formatTimePeriodSummary(period.value)}
                        </span>
                      ) : null}
                    </span>
                    {isActive ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <Separator />

        <div className="p-1">
          <button
            type="button"
            onClick={() => setCustomExpanded((e) => !e)}
            className={cn(
              "flex w-full items-start justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60",
              (customExpanded || !matchesAnyPreset(value)) && "bg-muted",
            )}
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Custom</span>
              {(customExpanded || !matchesAnyPreset(value)) && value?.from && value?.to ? (
                <span className="text-xs text-muted-foreground">{formatDisplayRange(value)}</span>
              ) : null}
            </span>
            {!matchesAnyPreset(value) && value?.from && value?.to ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : null}
          </button>
        </div>

        {customExpanded ? (
          <>
            <Separator />
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleCustomCalendarSelect}
              numberOfMonths={2}
              disabled={(d) => d < minSelectableDate || d > presetAnchorDate}
              defaultMonth={value?.from}
              initialFocus
            />
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────────

interface PrimaryDriversSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string | null
  businessName: string
}

type PrimaryDriversSheetView = "whats-happening" | "call-brief"
type PrimaryDriversSheetMode = "current" | "history"
type HistoryDetailTab = "call-brief" | "primary-drivers"

function isPrimaryDriversV2Response(value: unknown): value is PrimaryDriversV2Response {
  return Boolean(value)
    && typeof value === "object"
    && Array.isArray((value as Record<string, unknown>).ctas)
}

function isPrimaryDriversLegacyResponse(value: unknown): value is PrimaryDriversLegacyResponse {
  return Boolean(value)
    && typeof value === "object"
    && "headline" in (value as Record<string, unknown>)
    && Array.isArray((value as PrimaryDriversLegacyResponse).drivers)
    && Array.isArray((value as PrimaryDriversLegacyResponse).contributors)
}

function isPrimaryDriversSnapshot(value: unknown): value is PrimaryDriversResponse {
  return isPrimaryDriversV2Response(value) || isPrimaryDriversLegacyResponse(value)
}

function getPrimaryDriversWins(data: PrimaryDriversResponse | null | undefined): PrimaryDriversWin[] {
  if (!data) return []
  if (isPrimaryDriversV2Response(data)) {
    const [primaryCta, ...secondaryCtas] = data.ctas
    const wins = [...(primaryCta?.wins ?? [])]

    if (primaryCta?.direction === "down") {
      secondaryCtas
        .filter((cta) => cta.direction === "up")
        .forEach((cta) => {
          wins.push({
            type: "other_cta",
            label: cta.display_name,
            value: `${fmtAbsolute(cta.absolute_delta)} (${pctDisplay(cta.pct_change)})`,
          })
        })
    }

    return wins.slice(0, 3)
  }
  return data.wins ?? []
}

function getHistoryWindowBucketLabel(bucket: string | null | undefined) {
  if (bucket === "7d") return "7 days"
  if (bucket === "28d") return "28 days"
  if (bucket === "90d") return "90 days"
  if (bucket === "365d") return "12 months"
  return "Custom"
}

function LegacyPrimaryDriversSnapshotView({
  data,
  businessName,
}: {
  data: PrimaryDriversLegacyResponse
  businessName: string
}) {
  return (
    <div className="min-w-0 max-w-full space-y-3.5 overflow-hidden">
      <div className="min-w-0">
        <p className="mb-1 break-words text-[15px] font-medium text-foreground [overflow-wrap:anywhere]">{businessName}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
            {fmtDateRange(data.date_range.start, data.date_range.end)}
            <span className="mx-1.5">·</span>
            vs {fmtDateRange(data.date_range.comparison_start, data.date_range.comparison_end)}
          </span>
          <WindowTag bucket={data.window_bucket} baseline={data.baseline} />
        </div>
      </div>

      {(data.no_goal_tracking || data.anomalous_comparison_period || data.contributor_divergence) && (
        <div className="space-y-2">
          {data.no_goal_tracking && (
            <InfoBar text="Goal tracking not configured · showing Sessions as primary metric" />
          )}
          {data.anomalous_comparison_period && (
            <NoticeBar text="Prior period was unusually high — comparison may be inflated" />
          )}
          {data.contributor_divergence && (
            <NoticeBar text="Goal loss and session gain on different pages — conversion rate is the story, not traffic" />
          )}
        </div>
      )}

      {data.headline ? <HeadlinePanel data={data} /> : null}
      {data.wins && data.wins.length > 0 ? <WinsBar wins={data.wins} /> : null}

      {data.contributors && data.contributors.length > 0 ? (
        <div className="space-y-2">
          {data.contributors.map((ch, i) => (
            <ChannelBlock
              key={`${ch.value}-${i}`}
              ch={ch}
              anchor={data.contributor_anchor}
              isDivergence={data.contributor_divergence}
              is7d={data.window_bucket === "7d"}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No contributor breakdown available for this period.</p>
      )}
    </div>
  )
}

function pctDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${Math.abs(value * 100).toFixed(0)}%`
}

function flagCopy(flag: string): string {
  const normalized = flag.replace(/_/g, " ")
  if (flag === "possible_tracking_issue") return "Sessions dropped sharply while impressions held steady. Treat this as a possible tracking issue."
  if (flag === "possible_penalty") return "Search impressions dropped sharply while sessions held steady. This may be worth investigating."
  if (flag === "anomalous_comparison_period") return "The comparison period looks unusual, so read the movement with extra context."
  if (flag === "distributed_movement") return "Movement is spread across several contributors rather than concentrated in one place."
  if (flag === "new") return "This CTA did not fire in the previous period."
  if (flag === "ended") return "This CTA did not fire in the current period."
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function CtaPills({ channels }: { channels: PrimaryDriversV2Channel[] }) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 overflow-hidden">
      {channels.map((channel) => {
        const delta = channel.goals_delta ?? 0
        const cls = delta > 0
          ? POSITIVE_PILL_CLASS
          : delta < 0
            ? "border-[#F7C1C1] bg-[#FEF2F2] text-[#A32D2D]"
            : "border-border/60 bg-secondary/30 text-muted-foreground"
        return (
          <Tooltip key={channel.channel_name}>
            <TooltipTrigger asChild>
              <span className={cn(SINGLE_LINE_PILL_CLASS, "cursor-default font-medium sm:max-w-[220px]", cls)}>
                <span className={PILL_TEXT_CLASS}>{channel.channel_name} {fmtAbsolute(delta)}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
              {channel.channel_name} {fmtAbsolute(delta)}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function V2QueryChips({ page }: { page: PrimaryDriversV2Page }) {
  if (!page.queries?.length) return null
  return (
    <div className="mt-1.5 flex min-w-0 max-w-full flex-wrap gap-1.5">
      {page.queries.map((query, index) => (
        <Tooltip key={`${query.full_query_text}-${index}`}>
          <TooltipTrigger asChild>
            <span className={cn(SINGLE_LINE_PILL_CLASS, "cursor-default sm:max-w-[220px]", NEUTRAL_QUERY_PILL_CLASS)}>
              <span className={PILL_TEXT_CLASS}>{query.full_query_text || query.query_text}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
            {query.full_query_text}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function V2SourceRow({ source, organic }: { source: PrimaryDriversV2Source; organic: boolean }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden border-t border-border/40 px-3 py-2.5 sm:px-4">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <SourceFavicon sourceName={source.source_name} fallback={organic ? "search" : "auto"} className="mt-0.5 sm:mt-0" />
          <span className="min-w-0 break-words text-[13px] font-medium [overflow-wrap:anywhere] sm:truncate">{source.source_name}</span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-right sm:justify-end sm:text-[12px]">
          <span className={cn("text-[12px] font-medium tabular-nums", deltaColor(source.goals_delta))}>{fmtAbsolute(source.goals_delta)}</span>
          <span className={cn("text-[12px] font-medium tabular-nums", deltaColor(source.sessions_delta))}>{fmtAbsolute(source.sessions_delta)}</span>
        </div>
      </div>
      <div className="mt-2 min-w-0 max-w-full space-y-2 pl-0 sm:pl-5">
        {source.pages.map((page, index) => (
          <div key={`${page.page_path}-${index}`} className="min-w-0 max-w-full overflow-hidden rounded-md bg-secondary/30 px-3 py-2">
            <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
              <span className="min-w-0 break-all font-mono text-[11px] text-muted-foreground sm:truncate">{page.page_path}</span>
              <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] tabular-nums sm:justify-end">
                <span className={deltaColor(page.goals_delta)}>goals {fmtAbsolute(page.goals_delta)}</span>
                <span className={deltaColor(page.sessions_delta)}>sessions {fmtAbsolute(page.sessions_delta)}</span>
                {organic ? <span className={deltaColor(page.clicks_delta)}>clicks {fmtAbsolute(page.clicks_delta)}</span> : null}
              </div>
            </div>
            {organic ? <V2QueryChips page={page} /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function V2ChannelBlock({ channel }: { channel: PrimaryDriversV2Channel }) {
  const organic = channel.channel_name.toLowerCase().includes("organic")
  const net = channel.goals_delta ?? 0
  const bar = net > 0 ? POSITIVE_ACCENT_CLASS : net < 0 ? "bg-[#E24B4A]" : "bg-muted-foreground/40"

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border/50 bg-white">
      <div className="grid w-full min-w-0 gap-3 px-3 py-3 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className={cn("h-6 w-[3px] rounded-full", bar)} />
          <span className="min-w-0 break-words text-[13px] font-medium [overflow-wrap:anywhere]">{channel.channel_name}</span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          <ChStat def={{ key: "goals", value: channel.goals_delta }} />
          <ChStat def={{ key: "sessions", value: channel.sessions_delta }} />
          {organic ? <ChStat def={{ key: "clicks", value: channel.clicks_delta }} /> : null}
        </div>
      </div>
      <div>
        {channel.sources.map((source, index) => (
          <V2SourceRow key={`${source.source_name}-${index}`} source={source} organic={organic} />
        ))}
        <div className="border-t border-border/40 px-4 py-2 text-[11px] italic text-muted-foreground">
          showing {Math.round((channel.coverage_pct || channel.contribution_share || 0) * 100)}% of {channel.channel_name.toLowerCase()} change
        </div>
      </div>
    </div>
  )
}

function CtaCard({
  cta,
  open,
  onToggle,
}: {
  cta: PrimaryDriversV2Cta
  open: boolean
  onToggle: () => void
}) {
  const positive = cta.absolute_delta > 0
  const neutral = cta.absolute_delta === 0
  const badgeCls = neutral
    ? "bg-secondary text-muted-foreground"
    : positive
      ? POSITIVE_PILL_CLASS
      : "bg-[#FEF2F2] text-[#A32D2D] border-[#F7C1C1]"
  const warning = cta.edge_case_flags.find((flag) => !["low_volume"].includes(flag))

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-white transition-shadow duration-200 ease-out">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-w-0 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-secondary/20"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
              <span className="min-w-0 break-words font-mono text-[14px] font-medium [overflow-wrap:anywhere]">{cta.display_name}</span>
              <span className={cn(SINGLE_LINE_PILL_CLASS, "w-fit shrink-0 text-[12px] font-semibold tabular-nums", badgeCls)}>
                <span className={PILL_TEXT_CLASS}>{fmtAbsolute(cta.absolute_delta)} ({pctDisplay(cta.pct_change)})</span>
              </span>
            </div>
            {cta.why_sentence ? (
              <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">{cta.why_sentence}</p>
            ) : null}
            <div className="mt-2">
              <CtaPills channels={cta.channels} />
            </div>
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
            "min-w-0 max-w-full space-y-2 overflow-hidden border-t border-border/50 bg-secondary/20 px-3 py-3 transition-opacity duration-150 ease-out sm:px-4",
            open ? "opacity-100" : "opacity-0",
          )}>
            {warning ? <NoticeBar text={flagCopy(warning)} /> : null}
            {cta.channels.map((channel) => (
              <V2ChannelBlock key={channel.channel_name} channel={channel} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function V2PrimaryDriversSnapshotView({
  data,
  businessName,
}: {
  data: PrimaryDriversV2Response
  businessName: string
}) {
  const days = getRangeLength({
    from: new Date(`${data.date_range.start}T00:00:00`),
    to: new Date(`${data.date_range.end}T00:00:00`),
  })
  const [expandedCta, setExpandedCta] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (expandedCta && !data.ctas.some((cta) => cta.event_name === expandedCta)) {
      setExpandedCta(null)
    }
  }, [data.ctas, expandedCta])

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
      <div className="min-w-0">
        <p className="break-words text-[15px] font-medium text-foreground [overflow-wrap:anywhere]">{businessName}</p>
        <p className="mt-1 break-words text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
          {fmtDateRange(data.date_range.start, data.date_range.end)}
          <span className="mx-1.5">·</span>
          vs {fmtDateRange(data.date_range.comparison_start, data.date_range.comparison_end)}
          <span className="mx-1.5">·</span>
          {days} days
        </p>
      </div>

      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        Top movers
      </div>

      <div className="min-w-0 max-w-full space-y-2.5 overflow-hidden">
        {data.ctas.map((cta) => (
          <CtaCard
            key={cta.event_name}
            cta={cta}
            open={expandedCta === cta.event_name}
            onToggle={() => setExpandedCta((current) => current === cta.event_name ? null : cta.event_name)}
          />
        ))}
      </div>

    </div>
  )
}

function PrimaryDriversSnapshotView({
  data,
  businessName,
}: {
  data: PrimaryDriversResponse
  businessName: string
}) {
  if (isPrimaryDriversV2Response(data)) {
    return <V2PrimaryDriversSnapshotView data={data} businessName={businessName} />
  }
  return <LegacyPrimaryDriversSnapshotView data={data} businessName={businessName} />
}

function CallPrepHistoryList({
  items,
  page,
  pageCount,
  onOpen,
  onPreviousPage,
  onNextPage,
  isLoading,
}: {
  items: CallPrepRunDetail[] | Array<{
    id: string
    period_start: string | null
    period_end: string | null
    comparison_start: string | null
    comparison_end: string | null
    window_bucket: string | null
    date_generated: string | null
    time_generated: string | null
  }>
  page: number
  pageCount: number
  onOpen: (id: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading saved meeting prep notes…</p>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-general-border bg-secondary/20 px-5 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No saved meeting prep notes yet</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          Generate meeting prep notes and they will appear here as read-only snapshots.
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Meeting Prep Notes History</p>
          <p className="break-words text-xs text-muted-foreground">
            Open any saved run to review the generated notes and the matching Primary Drivers snapshot.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {items.length} saved
        </span>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-general-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-general-border/70 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <span>Period</span>
          <span>Generated</span>
        </div>

        <div className="divide-y divide-general-border/70">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] gap-4 px-5 py-4 text-left transition-all hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="min-w-0 break-words text-[15px] font-medium text-foreground transition-colors group-hover:text-foreground/90">
                    {item.period_start && item.period_end
                      ? fmtDateRange(item.period_start, item.period_end)
                      : "Period unavailable"}
                  </p>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {getHistoryWindowBucketLabel(item.window_bucket)}
                  </span>
                </div>
                <p className="min-w-0 break-words text-[12px] text-muted-foreground">
                  {item.comparison_start && item.comparison_end
                    ? `Compared with ${fmtDateRange(item.comparison_start, item.comparison_end)}`
                    : "Comparison period unavailable"}
                </p>
              </div>

              <div className="shrink-0 self-start text-right">
                <p className="text-[12px] font-medium text-foreground">
                  {item.date_generated || "Unknown date"}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {item.time_generated || "Unknown time"}
                </p>
              </div>

              <div className="flex h-full items-center justify-end self-center">
                <div className="rounded-full border border-transparent p-1.5 text-muted-foreground transition-all group-hover:border-border/70 group-hover:bg-background group-hover:text-foreground/80">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <p className="text-xs text-muted-foreground">
          Page {pageCount === 0 ? 0 : page} of {pageCount || 0}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={page <= 1}
            className="h-8 px-3 text-xs"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={pageCount === 0 || page >= pageCount}
            className="h-8 px-3 text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PrimaryDriversSheet({ open, onOpenChange, businessId, businessName }: PrimaryDriversSheetProps) {
  const defaultRange = React.useMemo(() => createDefaultRange(), [])
  const [draftRange, setDraftRange]         = React.useState<DateRange | undefined>(defaultRange)
  const [committedRange, setCommittedRange] = React.useState<DateRange | undefined>(defaultRange)
  const [rangeMsg, setRangeMsg]             = React.useState<string | null>(null)
  const [mode, setMode]                     = React.useState<PrimaryDriversSheetMode>("current")
  const [view, setView]                     = React.useState<PrimaryDriversSheetView>("whats-happening")
  const [callBrief, setCallBrief]           = React.useState<CallPrepBriefResponse | null>(null)
  const [callBriefRangeKey, setCallBriefRangeKey] = React.useState<string | null>(null)
  const [isGeneratingMeetingPrepNotes, setIsGeneratingMeetingPrepNotes] = React.useState(false)
  const [historyPage, setHistoryPage]       = React.useState(1)
  const [selectedHistoryRunId, setSelectedHistoryRunId] = React.useState<string | null>(null)
  const [historyDetailTab, setHistoryDetailTab] = React.useState<HistoryDetailTab>("call-brief")

  React.useEffect(() => {
    if (!open) {
      const d = createDefaultRange()
      setDraftRange(d)
      setCommittedRange(d)
      setRangeMsg(null)
      setMode("current")
      setView("whats-happening")
      setCallBrief(null)
      setCallBriefRangeKey(null)
      setIsGeneratingMeetingPrepNotes(false)
      setHistoryPage(1)
      setSelectedHistoryRunId(null)
      setHistoryDetailTab("call-brief")
    }
  }, [open])

  const startDate = committedRange?.from ? toIsoDate(committedRange.from) : null
  const endDate   = committedRange?.to   ? toIsoDate(committedRange.to)   : null
  const committedRangeKey = startDate && endDate ? `${startDate}:${endDate}` : null

  const { data, isLoading, isFetching, isError, error } = usePrimaryDrivers({
    businessId, startDate, endDate, includeAllCtas: true, enabled: open,
  })
  const callPrepBriefMutation = useCallPrepBrief()
  const { fetchCallPrepRuns } = useCallPrepRuns()
  const currentCallBrief = callBriefRangeKey === committedRangeKey ? callBrief : null

  const historyQuery = useQuery({
    queryKey: ["call-prep-runs", businessId, historyPage],
    enabled: open && mode === "history" && !!businessId,
    queryFn: async () => {
      if (!businessId) {
        return {
          data: [],
          pageCount: 0,
          pagination: { page: historyPage, page_size: 10, total: 0 },
        }
      }

      return fetchCallPrepRuns({
        business_id: businessId,
        page: historyPage,
        perPage: 10,
        sort: [{ field: "created_at", desc: true }],
      })
    },
    staleTime: 30 * 1000,
  })

  const historyDetailQuery = useCallPrepRunDetail({
    callPrepRunId: selectedHistoryRunId,
    enabled: open && mode === "history" && !!selectedHistoryRunId,
  })

  const handleRangeChange = React.useCallback((next: DateRange | undefined) => {
    setDraftRange(next)
    if (!next?.from || !next?.to) { setRangeMsg(null); return }
    const len = getRangeLength(next)
    if (len < 7) { setRangeMsg("Select at least 7 days for reliable analysis."); return }
    setRangeMsg(null)
    setCommittedRange({ from: startOfDay(next.from), to: startOfDay(next.to) })
  }, [])

  const previousRangeKeyRef = React.useRef<string | null>(committedRangeKey)

  React.useEffect(() => {
    if (previousRangeKeyRef.current !== committedRangeKey) {
      setView("whats-happening")
      setCallBrief(null)
      setCallBriefRangeKey(null)
      previousRangeKeyRef.current = committedRangeKey
    }
  }, [committedRangeKey])

  React.useEffect(() => {
    setHistoryPage(1)
    setSelectedHistoryRunId(null)
    setHistoryDetailTab("call-brief")
  }, [businessId])

  const handleGenerateCallBrief = React.useCallback(async () => {
    if (!businessId || !data || !committedRangeKey) return
    setIsGeneratingMeetingPrepNotes(true)
    try {
      const generatedBrief = await callPrepBriefMutation.mutateAsync({
        businessId,
        businessName,
        primaryDrivers: data,
      })

      setCallBrief(generatedBrief)
      setCallBriefRangeKey(committedRangeKey)
      setView("call-brief")
    } catch {
      setView("whats-happening")
    } finally {
      setIsGeneratingMeetingPrepNotes(false)
      callPrepBriefMutation.reset()
    }
  }, [
    businessId,
    businessName,
    callPrepBriefMutation,
    committedRangeKey,
    data,
  ])

  const hasCurrentCallBrief = Boolean(currentCallBrief)
  const isCallBriefLoading = isGeneratingMeetingPrepNotes
  const showFooterActions = Boolean(
    data &&
    mode === "current" &&
    view === "whats-happening" &&
    !isLoading &&
    !isError,
  )

  const historyItems = historyQuery.data?.data ?? []
  const historyPageCount = historyQuery.data?.pageCount ?? 0
  const historyDetail = historyDetailQuery.data ?? null
  const historyPrimaryDriversSnapshot = isPrimaryDriversSnapshot(historyDetail?.primary_drivers_snapshot)
    ? historyDetail.primary_drivers_snapshot
    : null
  const historyCallBriefSnapshot = historyDetail?.call_brief_snapshot ?? null

  const headerActionMode = (
    mode === "current" && view === "whats-happening"
      ? "history"
      : "back"
  ) as "history" | "back"
  const sheetTitle = mode === "current"
    ? (view === "call-brief" ? "Meeting Prep Notes" : "What's Happening?")
    : (selectedHistoryRunId ? "Saved Meeting Prep Notes" : "Meeting Prep Notes History")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full overflow-hidden border-l border-general-border p-0 pt-8 sm:max-w-2xl">

        {/* Sheet header — sticky */}
        <SheetHeader className="border-b border-general-border bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold tracking-tight">
                {sheetTitle}
              </SheetTitle>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {mode === "current" ? (
                <PrimaryDriversRangePicker value={draftRange} onChange={handleRangeChange} validationMessage={rangeMsg} />
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (headerActionMode === "history") {
                        setMode("history")
                        setSelectedHistoryRunId(null)
                        setHistoryDetailTab("call-brief")
                        return
                      }

                      if (mode === "current") {
                        setView("whats-happening")
                        return
                      }

                      if (selectedHistoryRunId) {
                        setSelectedHistoryRunId(null)
                        setHistoryDetailTab("call-brief")
                        return
                      }

                      setMode("current")
                    }}
                    className="h-9 w-9 shrink-0"
                    aria-label={headerActionMode === "history" ? "View meeting prep notes history" : "Back"}
                  >
                    {headerActionMode === "history" ? (
                      <History className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {headerActionMode === "history" ? "View meeting prep notes history" : "Back"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {mode === "current" ? (
            <>
              {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading insights…</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-red-600" />
                <h3 className="mt-3 text-sm font-semibold text-red-900">Unable to load What's Happening?</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                  {error || "Something went wrong. Try changing the date range."}
                </p>
              </div>
            </div>
          ) : data ? (
            <div className="relative flex h-full flex-col">
              <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
                <div className="w-full min-w-0 max-w-full overflow-hidden px-4 py-5 sm:px-6">
                  {view === "call-brief" && currentCallBrief ? (
                    <CallPrepBriefView callBrief={currentCallBrief} wins={getPrimaryDriversWins(data)} />
                  ) : (
                    <PrimaryDriversSnapshotView
                      data={data}
                      businessName={businessName}
                    />
                  )}
                </div>
              </ScrollArea>

              {showFooterActions ? (
                <div className="border-t border-general-border bg-background px-6 py-4">
                  <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                    <div />
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {hasCurrentCallBrief ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateCallBrief}
                          disabled={isCallBriefLoading || !businessId}
                          className="min-w-[132px]"
                        >
                          {isCallBriefLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Meeting Prep Notes...
                            </>
                          ) : (
                            "Regenerate"
                          )}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        onClick={hasCurrentCallBrief ? () => setView("call-brief") : handleGenerateCallBrief}
                        disabled={isCallBriefLoading || !businessId}
                        className="min-w-[156px]"
                      >
                        {isCallBriefLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Meeting Prep Notes...
                          </>
                        ) : hasCurrentCallBrief ? (
                          "View Meeting Prep Notes"
                        ) : (
                          "Generate Meeting Prep Notes"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex items-center gap-3 rounded-xl border border-general-border bg-white px-5 py-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Recomputing…</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
            </>
          ) : (
              <div className="flex h-full flex-col">
                <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
                  <div className="w-full min-w-0 max-w-full overflow-hidden px-4 py-5 sm:px-6">
                    {selectedHistoryRunId ? (
                      historyDetailQuery.isLoading ? (
                        <div className="flex h-full min-h-[320px] items-center justify-center">
                          <div className="text-center space-y-2">
                            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading saved brief…</p>
                          </div>
                        </div>
                      ) : historyDetailQuery.isError ? (
                        <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                          <AlertTriangle className="mx-auto h-5 w-5 text-red-600" />
                          <h3 className="mt-3 text-sm font-semibold text-red-900">Unable to load saved call brief</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                            {historyDetailQuery.error instanceof Error
                              ? historyDetailQuery.error.message
                              : "Something went wrong while loading this snapshot."}
                          </p>
                        </div>
                      ) : historyDetail ? (
                        <div className="min-w-0 max-w-full space-y-4 overflow-hidden">
                          <div>
                            <p className="break-words text-[15px] font-medium text-foreground">{historyCallBriefSnapshot?.business_name || businessName}</p>
                            <p className="mt-1 break-words text-[11px] text-muted-foreground">
                              Saved {historyDetail.date_generated || "Unknown date"} at {historyDetail.time_generated || "Unknown time"}
                            </p>
                          </div>

                          <Tabs
                            value={historyDetailTab}
                            onValueChange={(nextValue) => setHistoryDetailTab(nextValue as HistoryDetailTab)}
                            className="min-w-0 max-w-full space-y-4 overflow-hidden"
                          >
                            <TabsList className="grid w-full min-w-0 grid-cols-2">
                              <TabsTrigger value="call-brief" className="min-w-0 w-full px-2 text-xs sm:text-sm">
                                Meeting Prep Notes
                              </TabsTrigger>
                              <TabsTrigger value="primary-drivers" className="min-w-0 w-full px-2 text-xs sm:text-sm">
                                Primary Drivers Snapshot
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="call-brief" className="mt-0 min-w-0 max-w-full overflow-hidden">
                              {historyCallBriefSnapshot ? (
                                <CallPrepBriefView
                                  callBrief={historyCallBriefSnapshot}
                                  wins={getPrimaryDriversWins(historyPrimaryDriversSnapshot)}
                                />
                              ) : (
                                <div className="rounded-xl border border-dashed border-general-border px-5 py-10 text-center">
                                  <p className="text-sm font-medium text-foreground">Saved meeting prep notes unavailable</p>
                                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    This history record does not include renderable meeting prep notes.
                                  </p>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="primary-drivers" className="mt-0 min-w-0 max-w-full overflow-hidden">
                              {historyPrimaryDriversSnapshot ? (
                                <PrimaryDriversSnapshotView
                                  data={historyPrimaryDriversSnapshot}
                                  businessName={historyCallBriefSnapshot?.business_name || businessName}
                                />
                              ) : (
                                <div className="rounded-xl border border-dashed border-general-border px-5 py-10 text-center">
                                  <p className="text-sm font-medium text-foreground">Primary Drivers snapshot unavailable</p>
                                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    This saved record was generated without a full Primary Drivers snapshot.
                                  </p>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : null
                    ) : (
                      historyQuery.isError ? (
                        <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                          <AlertTriangle className="mx-auto h-5 w-5 text-red-600" />
                          <h3 className="mt-3 text-sm font-semibold text-red-900">Unable to load history</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                            {historyQuery.error instanceof Error
                              ? historyQuery.error.message
                              : "Something went wrong while loading saved call briefs."}
                          </p>
                        </div>
                      ) : (
                        <CallPrepHistoryList
                          items={historyItems}
                          page={historyQuery.data?.pagination.page ?? historyPage}
                          pageCount={historyPageCount}
                          onOpen={(id) => {
                            setSelectedHistoryRunId(id)
                            setHistoryDetailTab("call-brief")
                          }}
                          onPreviousPage={() => setHistoryPage((current) => Math.max(1, current - 1))}
                          onNextPage={() => setHistoryPage((current) => (
                            historyPageCount > 0 ? Math.min(historyPageCount, current + 1) : current
                          ))}
                          isLoading={historyQuery.isLoading}
                        />
                      )
                    )}
                  </div>
                </ScrollArea>
              </div>
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}
