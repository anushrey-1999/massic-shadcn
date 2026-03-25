"use client"

import * as React from "react"
import { format, differenceInCalendarDays, startOfDay, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react"
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
import { getAnalyticsPeriodBounds } from "@/utils/analytics-period"
import {
  usePrimaryDrivers,
  type PrimaryDriversContributor,
  type PrimaryDriversDriver,
  type PrimaryDriversQuery,
  type PrimaryDriversResponse,
  type PrimaryDriversSeverity,
} from "@/hooks/use-primary-drivers"

// ─── Constants ──────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  GOALS: "Goals",
  SESSIONS: "Sessions",
  CLICKS: "Clicks",
  CVR: "CVR",
  CTR: "CTR",
  IMPRESSIONS: "Impressions",
  AVG_POSITION: "Position",
}

const SEVERITY_CONFIG: Record<PrimaryDriversSeverity, { label: string; bg: string; text: string }> = {
  HIGH:   { label: "High severity",   bg: "bg-red-100",   text: "text-red-700"   },
  MEDIUM: { label: "Medium severity", bg: "bg-[#FAEEDA]", text: "text-[#854F0B]" },
  LOW:    { label: "Low severity",    bg: "bg-slate-100", text: "text-slate-600"  },
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

// ─── Formatters ─────────────────────────────────────────────────────────────────

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
  const abs = Math.abs(value * 100)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${abs.toFixed(abs >= 10 ? 1 : 2)}pp`
}

// Driver chip value display
function getDriverDisplay(driver: PrimaryDriversDriver): { main: string; sub: string | null; unit: string | null } {
  if (driver.metric === "AVG_POSITION") {
    const arrow = driver.direction === "up" ? "↑" : "↓"
    return {
      main: `${arrow} ${Math.abs(driver.value_delta).toFixed(1)}`,
      sub: null,
      unit: "spots",
    }
  }
  if (driver.metric === "CVR" || driver.metric === "CTR") {
    return { main: fmtPp(driver.value_delta), sub: null, unit: null }
  }
  // Outcome (Goals): show absolute as main, pct as sub
  if (driver.driver_type === "Outcome") {
    return {
      main: fmtAbsolute(driver.value_delta),
      sub: driver.pct_change !== null ? fmtPct(driver.pct_change) : null,
      unit: null,
    }
  }
  // Traffic / Demand: show pct as main (no sub for cleaner chips)
  if (driver.pct_change !== null) {
    return { main: fmtPct(driver.pct_change), sub: null, unit: null }
  }
  return { main: fmtAbsolute(driver.value_delta), sub: null, unit: null }
}

// Query stat value display
function fmtQueryStat(value: number): { text: string; cls: string } {
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  const abs = Math.abs(value)
  const text = `${sign}${abs < 1000 ? Math.round(abs) : (abs / 1000).toFixed(1) + "K"}`
  return {
    text,
    cls: value > 0 ? "text-[#0F6E56]" : value < 0 ? "text-[#A32D2D]" : "text-muted-foreground",
  }
}

function fmtQueryPos(positionDelta: number): { text: string; cls: string } {
  if (Math.abs(positionDelta) < 0.1) {
    return { text: `${positionDelta > 0 ? "+" : "−"}${Math.abs(positionDelta).toFixed(1)}`, cls: "text-muted-foreground" }
  }
  const arrow = positionDelta > 0 ? "↑" : "↓"
  return {
    text: `${arrow}${Math.abs(positionDelta).toFixed(1)}`,
    cls: positionDelta > 0 ? "text-[#0F6E56]" : "text-[#A32D2D]",
  }
}

// ─── Warning banner ──────────────────────────────────────────────────────────────

function WarningBanner({ title, description, color }: { title: string; description: string; color: "amber" | "red" | "blue" }) {
  const styles = {
    amber: { wrap: "border-amber-200 bg-amber-50", icon: "text-amber-600", title: "text-amber-900", body: "text-amber-800" },
    red:   { wrap: "border-red-200 bg-red-50",     icon: "text-red-600",   title: "text-red-900",   body: "text-red-800"   },
    blue:  { wrap: "border-blue-200 bg-blue-50",   icon: "text-blue-600",  title: "text-blue-900",  body: "text-blue-800"  },
  }[color]

  return (
    <div className={cn("rounded-lg border p-3", styles.wrap)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", styles.icon)} />
        <div>
          <p className={cn("text-xs font-semibold", styles.title)}>{title}</p>
          <p className={cn("mt-0.5 text-xs leading-relaxed", styles.body)}>{description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Content header ──────────────────────────────────────────────────────────────

function ContentHeader({ businessName, data }: { businessName: string; data: PrimaryDriversResponse }) {
  const sev = SEVERITY_CONFIG[data.severity]
  const windowDays = data.window_bucket === "7d" ? "7 days"
    : data.window_bucket === "28d" ? "28 days"
    : data.window_bucket === "90d" ? "90 days"
    : "12 months"

  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[15px] font-medium text-foreground">{businessName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {fmtDateRange(data.date_range.start, data.date_range.end)}
          <span className="mx-1.5">·</span>
          vs {fmtDateRange(data.date_range.comparison_start, data.date_range.comparison_end)}
          <span className="mx-1.5">·</span>
          {windowDays}
        </p>
      </div>
      <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-md flex-shrink-0", sev.bg, sev.text)}>
        {sev.label}
      </span>
    </div>
  )
}

// ─── Driver chip ─────────────────────────────────────────────────────────────────

function DriverChip({ driver }: { driver: PrimaryDriversDriver }) {
  const isPos = driver.direction === "up"
  const { main, sub, unit } = getDriverDisplay(driver)
  const label = METRIC_LABELS[driver.metric] ?? driver.metric

  const cvrTooltip = driver.metric === "CVR" && driver.cvr_share !== null
    ? `CVR explains ${(driver.cvr_share * 100).toFixed(0)}% of the conversion move. Traffic: ${fmtAbsolute(driver.delta_traffic)} · CVR component: ${fmtAbsolute(driver.delta_cvr)}`
    : null

  const chip = (
    <div className={cn(
      "flex items-center gap-2 px-3 py-[9px] rounded-lg border",
      isPos
        ? "bg-secondary border-border/60"
        : "bg-red-50 border-red-200",
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        isPos ? "bg-[#1D9E75]" : "bg-[#E24B4A]",
      )} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", isPos ? "text-[#0F6E56]" : "text-[#A32D2D]")}>
        {main}
      </span>
      {sub && (
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      )}
      {unit && (
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      )}
    </div>
  )

  if (!cvrTooltip) return chip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        {cvrTooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Drivers section ──────────────────────────────────────────────────────────────

function DriversSection({ drivers }: { drivers: PrimaryDriversDriver[] }) {
  if (!drivers || drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No significant drivers identified for this period.</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {drivers.map((driver, i) => (
        <DriverChip key={`${driver.metric}-${i}`} driver={driver} />
      ))}
    </div>
  )
}

// ─── Query row ───────────────────────────────────────────────────────────────────

function QueryRow({ query }: { query: PrimaryDriversQuery }) {
  const clicks = fmtQueryStat(query.clicks_delta)
  const impr = fmtQueryStat(query.impressions_delta)
  const pos = fmtQueryPos(query.position_delta)

  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-secondary/60 transition-colors">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <span className={cn(
          "text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
          query.brand
            ? "bg-indigo-100 text-indigo-700"
            : "bg-emerald-100 text-[#0F6E56]",
        )}>
          {query.brand ? "brand" : "non-brand"}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate text-[11px] text-muted-foreground cursor-default min-w-0 max-w-[200px]">
              {query.query}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[400px] break-all text-xs">
            {query.query}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">clicks</p>
          <p className={cn("text-[11px] font-medium", clicks.cls)}>{clicks.text}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">impr</p>
          <p className={cn("text-[11px] font-medium", impr.cls)}>{impr.text}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">pos</p>
          <p className={cn("text-[11px] font-medium", pos.cls)}>{pos.text}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page row ────────────────────────────────────────────────────────────────────

function PageRow({ page, isOrganic }: { page: PrimaryDriversContributor; isOrganic: boolean }) {
  const isPos = page.absolute_delta >= 0
  const hasQueries = isOrganic && page.queries && page.queries.length > 0

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
        <div className="min-w-0 flex-1 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate text-[12px] font-mono text-muted-foreground cursor-default max-w-[280px]">
                {page.value}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px] break-all text-xs">{page.value}</TooltipContent>
          </Tooltip>
        </div>
        <span className={cn("text-[13px] font-medium flex-shrink-0 ml-3 tabular-nums", isPos ? "text-[#0F6E56]" : "text-[#A32D2D]")}>
          {fmtAbsolute(page.absolute_delta)}
        </span>
      </div>

      {hasQueries && (
        <div className="ml-2 border-l border-dashed border-border/60 pl-3">
          {page.queries!.map((q, i) => (
            <QueryRow key={`${q.query}-${i}`} query={q} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Contributor block ───────────────────────────────────────────────────────────

function ContributorBlock({ contributor, depth = 0 }: { contributor: PrimaryDriversContributor; depth?: number }) {
  const isPos = contributor.absolute_delta >= 0
  const isOrganic = String(contributor.value || "").toLowerCase().includes("organic")
  const hasChildren = contributor.children && contributor.children.length > 0

  if (depth === 0) {
    // Top-level (DEVICE / CHANNEL / PAGE) — colored card
    return (
      <div className="mb-2">
        <div className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-lg",
          isPos ? "bg-[#F0FDFA] border border-[#9FE1CB]" : "bg-[#FEF2F2] border border-[#F7C1C1]",
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn("w-[3px] h-5 rounded-full flex-shrink-0", isPos ? "bg-[#1D9E75]" : "bg-[#E24B4A]")} />
            <p className="text-[13px] font-medium text-foreground">{contributor.value}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-[17px] font-medium cursor-default tabular-nums", isPos ? "text-[#0F6E56]" : "text-[#A32D2D]")}>
                {fmtAbsolute(contributor.absolute_delta)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {Math.round(contributor.contribution_share * 100)}% of total change
            </TooltipContent>
          </Tooltip>
        </div>

        {hasChildren && (
          <div className="ml-3 mt-0.5 border-l-[1.5px] border-border/50 pl-3 pt-0.5 pb-1">
            {contributor.children!.map((child, i) => {
              if (child.dimension !== "PAGE") {
                // Intermediate channel under DEVICE — lightweight row, no heavy card
                return (
                  <ContributorBlock
                    key={`${child.dimension}-${child.value}-${i}`}
                    contributor={child}
                    depth={1}
                  />
                )
              }
              return (
                <PageRow key={`${child.value}-${i}`} page={child} isOrganic={isOrganic} />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Depth 1 — intermediate channel under DEVICE
  // Rendered as a compact label row, not a full colored card
  const isIntermediateOrganic = String(contributor.value || "").toLowerCase().includes("organic")
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className={cn("w-[2px] h-4 rounded-full flex-shrink-0", isPos ? "bg-[#1D9E75]" : "bg-[#E24B4A]")} />
          <p className="text-[12px] font-medium text-foreground/80">{contributor.value}</p>
        </div>
        <span className={cn("text-[12px] font-medium tabular-nums", isPos ? "text-[#0F6E56]" : "text-[#A32D2D]")}>
          {fmtAbsolute(contributor.absolute_delta)}
        </span>
      </div>

      {contributor.children && contributor.children.length > 0 && (
        <div className="ml-3 border-l border-border/40 pl-3">
          {contributor.children.map((child, i) => (
            <PageRow key={`${child.value}-${i}`} page={child} isOrganic={isIntermediateOrganic} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Contributors section ─────────────────────────────────────────────────────────

function ContributorsSection({ contributors }: { contributors: PrimaryDriversContributor[] }) {
  if (!contributors || contributors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No contributor breakdown available for this period.</p>
    )
  }

  return (
    <div className="space-y-0">
      {contributors.map((c, i) => (
        <ContributorBlock
          key={`${c.dimension}-${c.value}-${i}`}
          contributor={c}
          depth={0}
        />
      ))}
    </div>
  )
}

// ─── Date range picker ───────────────────────────────────────────────────────────

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

// ─── Main Sheet ──────────────────────────────────────────────────────────────────

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

  const banners = React.useMemo(() => {
    if (!data) return []
    return (data.edge_case_flags ?? [])
      .filter((f) => f in EDGE_CASE_BANNERS)
      .map((f) => ({ key: f, ...EDGE_CASE_BANNERS[f] }))
  }, [data])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l border-general-border p-0 pt-8 sm:max-w-2xl">

        {/* Sheet header — sticky */}
        <SheetHeader className="border-b border-general-border bg-background px-6 py-4 pr-14">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold tracking-tight">Primary Drivers</SheetTitle>
            <PrimaryDriversRangePicker value={draftRange} onChange={handleRangeChange} validationMessage={rangeMsg} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Computing primary drivers…</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-5 text-center">
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
                <div className="px-6 py-5 max-w-[720px] space-y-0">

                  {/* Business name + date range + severity */}
                  <ContentHeader businessName={businessName} data={data} />

                  {/* Edge case banners */}
                  {banners.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {banners.map((b) => (
                        <WarningBanner key={b.key} title={b.title} description={b.description} color={b.color} />
                      ))}
                    </div>
                  )}

                  {/* Drivers */}
                  <div className="mt-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground mb-2.5">
                      Drivers
                    </p>
                    <DriversSection drivers={data.drivers} />
                  </div>

                  {/* Divider */}
                  <div className="my-5 h-px bg-border/60" />

                  {/* Contributors */}
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground mb-2.5">
                      Contributors
                    </p>
                    <ContributorsSection contributors={data.contributors} />
                  </div>

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
