"use client"

import * as React from "react"
import { format, differenceInCalendarDays, startOfDay, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { AlertTriangle, Calendar as CalendarIcon, Check, Info, Loader2 } from "lucide-react"
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
import {
  getAnalyticsPeriodBounds,
  PERIOD_SELECTOR_GROUPS,
  formatTimePeriodSummary,
  resolveTimePeriodRange,
  type TimePeriodPreset,
} from "@/utils/analytics-period"
import {
  usePrimaryDrivers,
  type PrimaryDriversBaseline,
  type PrimaryDriversContributor,
  type PrimaryDriversHeadlineReel,
  type PrimaryDriversPageContributor,
  type PrimaryDriversQuery,
  type PrimaryDriversResponse,
  type PrimaryDriversWin,
} from "@/hooks/use-primary-drivers"

// ─── Formatters ─────────────────────────────────────────────────────────────────

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
  return value > 0 ? "text-[#0F6E56]" : "text-[#A32D2D]"
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
  pos:     "text-[#0F6E56] font-medium",
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
      "text-[10px] px-2 py-0.5 rounded border",
      noisy
        ? "bg-[#FFFBEB] border-[#FAC775] text-[#854F0B]"
        : "border-border/50 text-muted-foreground",
    )}>
      {label}
    </span>
  )
}

// ─── Notice bar ───────────────────────────────────────────────────────────────────

function NoticeBar({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#FFFBEB] border border-[#FAC775] text-[#633806] text-[12px]">
      {icon ?? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-[#B45309]" />}
      <span>{text}</span>
    </div>
  )
}

function InfoBar({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[12px]">
      <Info className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
      <span>{text}</span>
    </div>
  )
}

// ─── Headline panel ───────────────────────────────────────────────────────────────

function HeadlinePanel({ data }: { data: PrimaryDriversResponse }) {
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
    <div className="px-3.5 py-3 rounded-lg bg-secondary/60 mb-3.5">
      {/* Top line */}
      <p className="text-[15px] leading-[1.5] mb-1">
        {reels.map((reel, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-foreground/70 mx-[6px] text-[18px] leading-none">·</span>}
            <span className={REEL_COLOR_CLS[DIRECTION_TO_COLOR[reel.direction]]}>{reel.text}</span>
          </React.Fragment>
        ))}
      </p>

      {/* Bottom line */}
      {bottomParts.length > 0 && (
        <p className="text-[12px] leading-[1.6] text-muted-foreground">
          {bottomParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-1 text-foreground/60 text-[14px] leading-none">·</span>}
              <span className={cn(
                part.color === "neg" ? "text-[#E24B4A]"
                : part.color === "pos" ? "text-[#1D9E75]"
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
    <div className="flex items-baseline gap-2 px-3 py-2 bg-[#F0FDFA] rounded-lg border border-[#9FE1CB] mb-4">
      <span className="shrink-0 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-[#0F6E56]">
        Wins
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {wins.map((win, i) => (
          <span key={i} className="text-[12px] leading-snug text-[#085041]">
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
    : def.key === "cvr" ? (val > 0 ? "text-[#0F6E56]" : val < 0 ? "text-[#A32D2D]" : "text-muted-foreground")
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
      <div className="pl-8 pr-4 py-2 text-[11px] text-muted-foreground bg-secondary/40 border-t border-dashed border-border/50">
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
    : avgPos > 0 ? "text-[#0F6E56]" : "text-[#A32D2D]"

  return (
    <div className="pl-8 pr-4 py-2.5 bg-secondary/30 border-t border-dashed border-border/50">
      {/* Summary numbers */}
      <div className="flex gap-3 mb-1.5">
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
      <div className="flex flex-wrap gap-1.5">
        {queries.map((q, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="text-[11px] px-2 py-[3px] rounded-full bg-background border border-border/60 text-muted-foreground max-w-[240px] truncate cursor-default">
                {q.query}
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
    <div>
      {/* Page row */}
      <div className="flex items-center justify-between pl-8 pr-4 py-2 gap-3 hover:bg-secondary/40 transition-colors">
        <div className="min-w-0 flex-1 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate text-[11px] font-mono text-muted-foreground cursor-default max-w-[220px]">
                {page.value}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px] break-all text-xs">{page.value}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-3 flex-shrink-0">
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
    <div className="rounded-xl overflow-hidden border border-border/40">
      {/* Channel header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 gap-3",
        isPos
          ? "bg-[#F0FDFA] border-b border-[#9FE1CB]"
          : "bg-[#FEF2F2] border-b border-[#F7C1C1]",
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn("w-1 h-[22px] rounded-sm flex-shrink-0", isPos ? "bg-[#1D9E75]" : "bg-[#E24B4A]")} />
          <span className="text-[13px] font-medium">{ch.value}</span>
        </div>
        <div className="flex gap-4 flex-wrap justify-end">
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
      <PopoverContent align="end" className="w-auto max-w-[min(100vw-1rem,720px)] min-w-[260px] p-0">
        <div className="border-b bg-muted/20 px-4 py-3">
          <p className="text-sm font-semibold">Select date range</p>
          <p className="text-xs text-muted-foreground">Minimum 7 days. Previous period compared automatically.</p>
          {validationMessage && <p className="mt-1.5 text-xs font-medium text-red-600">{validationMessage}</p>}
        </div>

        <div className="max-h-[min(40vh,320px)] overflow-y-auto">
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
        </div>

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

export function PrimaryDriversSheet({ open, onOpenChange, businessId, businessName }: PrimaryDriversSheetProps) {
  const defaultRange = React.useMemo(() => createDefaultRange(), [])
  const [draftRange, setDraftRange]         = React.useState<DateRange | undefined>(defaultRange)
  const [committedRange, setCommittedRange] = React.useState<DateRange | undefined>(defaultRange)
  const [rangeMsg, setRangeMsg]             = React.useState<string | null>(null)

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l border-general-border p-0 pt-8 sm:max-w-2xl">

        {/* Sheet header — sticky */}
        <SheetHeader className="border-b border-general-border bg-background px-6 py-4 pr-14">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold tracking-tight">What&apos;s Happening?</SheetTitle>
            <PrimaryDriversRangePicker value={draftRange} onChange={handleRangeChange} validationMessage={rangeMsg} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
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
                <h3 className="mt-3 text-sm font-semibold text-red-900">Unable to load What&apos;s Happening?</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                  {error || "Something went wrong. Try changing the date range."}
                </p>
              </div>
            </div>
          ) : data ? (
            <div className="relative h-full">
              <ScrollArea className="h-full">
                <div className="px-6 py-5 max-w-[720px] space-y-3.5">

                  {/* Business + date meta */}
                  <div>
                    <p className="text-[15px] font-medium text-foreground mb-1">{businessName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDateRange(data.date_range.start, data.date_range.end)}
                        <span className="mx-1.5">·</span>
                        vs {fmtDateRange(data.date_range.comparison_start, data.date_range.comparison_end)}
                      </span>
                      <WindowTag bucket={data.window_bucket} baseline={data.baseline} />
                    </div>
                  </div>

                  {/* Notices */}
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

                  {/* Headline panel */}
                  {data.headline && <HeadlinePanel data={data} />}

                  {/* Wins bar */}
                  {data.wins && data.wins.length > 0 && <WinsBar wins={data.wins} />}

                  {/* Channel blocks */}
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
              </ScrollArea>

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
        </div>

      </SheetContent>
    </Sheet>
  )
}
