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
  type PrimaryDriversChannelBreakdownRow,
  type PrimaryDriversDeviceBreakdownRow,
  type PrimaryDriversMetricValue,
  type PrimaryDriversResponse,
  type PrimaryDriversTopPageRow,
  type PrimaryDriversTopDriver,
} from "@/hooks/use-primary-drivers"

interface PrimaryDriversSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string | null
  businessName: string
}

const DRIVER_TAG_STYLES: Record<PrimaryDriversTopDriver["tag"], string> = {
  internal: "bg-red-100 text-red-700 border-red-200",
  external: "bg-blue-100 text-blue-700 border-blue-200",
  opportunity: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const STATUS_STYLES: Record<PrimaryDriversResponse["status"], { dot: string; label: string; text: string }> = {
  needs_attention: {
    dot: "bg-red-500",
    label: "Needs attention",
    text: "text-red-700",
  },
  watch_closely: {
    dot: "bg-amber-500",
    label: "Watch closely",
    text: "text-amber-700",
  },
  stable: {
    dot: "bg-emerald-500",
    label: "Stable",
    text: "text-emerald-700",
  },
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function createDefaultRange() {
  const { presetAnchorDate } = getAnalyticsPeriodBounds()
  const from = subDays(presetAnchorDate, 6)
  return { from, to: presetAnchorDate }
}

function formatDisplayRange(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return "Select date range"
  return `${format(range.from, "MMM d, yyyy")} → ${format(range.to, "MMM d, yyyy")}`
}

function getRangeLength(range: DateRange | undefined) {
  if (!range?.from || !range?.to) return 0
  return differenceInCalendarDays(startOfDay(range.to), startOfDay(range.from)) + 1
}

function formatWholeNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return Math.round(value).toLocaleString("en-US")
}

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  const abs = Math.abs(value)
  if (abs < 1000) return Math.round(value).toLocaleString("en-US")
  if (abs < 1000000) return `${(value / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`
  return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`
}

function formatPercentValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `${(value * 100).toFixed(1)}%`
}

function formatDeltaPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  const numeric = Math.abs(value * 100)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${numeric.toFixed(numeric >= 10 ? 0 : 1)}%`
}

function formatPositionValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return value.toFixed(1)
}

function formatPositionChange(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${Math.abs(value).toFixed(1)} pos`
}

function formatTooltipNumber(value: number | null | undefined, options?: { percent?: boolean; position?: boolean }) {
  if (value === null || value === undefined) return "No comparison data"
  if (options?.position) return formatPositionValue(value)
  if (options?.percent) return formatPercentValue(value)

  if (!Number.isFinite(value)) return "0"
  if (Number.isInteger(value)) return value.toLocaleString("en-US")
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function getChangeColor(value: number | null | undefined, options?: { invert?: boolean }) {
  if (value === null || value === undefined || value === 0) return "text-muted-foreground"
  const positive = options?.invert ? value < 0 : value > 0
  return positive ? "text-emerald-600" : "text-red-600"
}

function getTooltipDeltaColor(value: number | null | undefined, options?: { invert?: boolean }) {
  if (value === null || value === undefined || value === 0) return "text-background"
  const positive = options?.invert ? value < 0 : value > 0
  return positive ? "text-green-400" : "text-red-400"
}

function MetricTile({
  label,
  metric,
  formatValue,
  formatChange = formatDeltaPercent,
  invertChangeColor = false,
  tooltipOptions,
}: {
  label: string
  metric: PrimaryDriversMetricValue
  formatValue: (value: number | null | undefined) => string
  formatChange?: (value: number | null | undefined) => string
  invertChangeColor?: boolean
  tooltipOptions?: { percent?: boolean; position?: boolean }
}) {
  const changeValue = metric.pct_change === null && metric.abs_change !== null && formatChange === formatDeltaPercent
    ? metric.abs_change
    : metric.pct_change ?? metric.abs_change

  return (
    <div className="rounded-xl border border-general-border bg-white p-3 shadow-xs">
      <p className="text-[11px] font-medium uppercase tracking-[0.18px] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-xl font-semibold text-foreground">
              {formatValue(metric.current)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-2.5 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-background/80">
                {formatTooltipNumber(metric.previous, tooltipOptions)} previous period
              </span>
              {metric.current !== null && metric.previous !== null ? (
                <span className="text-[11px] font-medium text-background">
                  Current: {formatTooltipNumber(metric.current, tooltipOptions)}
                </span>
              ) : null}
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("cursor-default text-sm font-semibold", getChangeColor(metric.pct_change, { invert: invertChangeColor }))}>
              {formatChange(changeValue)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-2.5 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-background/80">
                {formatTooltipNumber(metric.previous, tooltipOptions)} previous period
              </span>
              {metric.abs_change !== null ? (
                <span className={cn("text-[11px] font-medium", getTooltipDeltaColor(metric.abs_change, { invert: invertChangeColor }))}>
                  {metric.abs_change > 0 ? "+" : metric.abs_change < 0 ? "−" : ""}
                  {formatTooltipNumber(Math.abs(metric.abs_change), tooltipOptions)} change
                </span>
              ) : null}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function WarningBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="text-xs leading-relaxed text-amber-800">{description}</p>
        </div>
      </div>
    </div>
  )
}

function DriverCard({ driver }: { driver: PrimaryDriversTopDriver }) {
  return (
    <div className="rounded-xl border border-general-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-semibold text-foreground">{driver.name}</h4>
            <Badge variant="outline" className={cn("rounded-full text-[11px] font-medium capitalize", DRIVER_TAG_STYLES[driver.tag])}>
              {driver.tag}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{driver.explanation}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-foreground">{driver.value}</p>
        </div>
      </div>
    </div>
  )
}

function SectionTable({
  title,
  columns,
  rows,
}: {
  title: string
  columns: string[]
  rows: Array<Array<React.ReactNode>>
}) {
  return (
    <div className="rounded-xl border border-general-border bg-card">
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <Separator />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-general-border bg-muted/20">
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.14px] text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-general-border last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-4 py-3 text-sm text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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

  const handleSelect = (nextRange: DateRange | undefined) => {
    onChange(nextRange)

    if (nextRange?.from && nextRange?.to && getRangeLength(nextRange) >= 7) {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 justify-start rounded-[10px] border-general-border bg-white px-4 text-left font-medium">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b bg-muted/20 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Select date range</p>
          <p className="text-xs text-muted-foreground">
            Choose at least 7 days. The previous period will be compared automatically.
          </p>
          {validationMessage ? (
            <p className="mt-2 text-xs font-medium text-red-600">{validationMessage}</p>
          ) : null}
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => date < minSelectableDate || date > presetAnchorDate}
          defaultMonth={value?.from}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function renderChannelRows(rows: PrimaryDriversChannelBreakdownRow[]) {
  return rows.map((row) => [
    row.channel,
    formatWholeNumber(row.sessions),
    <span key={`${row.channel}-sessions`} className={getChangeColor(row.sessions_change_pct)}>
      {formatDeltaPercent(row.sessions_change_pct)}
    </span>,
    formatWholeNumber(row.conversions),
    <span key={`${row.channel}-conversions`} className={getChangeColor(row.conversions_change_pct)}>
      {formatDeltaPercent(row.conversions_change_pct)}
    </span>,
  ])
}

function renderDeviceRows(rows: PrimaryDriversDeviceBreakdownRow[]) {
  return rows.map((row) => [
    row.device,
    formatWholeNumber(row.sessions),
    <span key={`${row.device}-sessions`} className={getChangeColor(row.sessions_change_pct)}>
      {formatDeltaPercent(row.sessions_change_pct)}
    </span>,
    formatPercentValue(row.conversion_rate),
    <span key={`${row.device}-cvr`} className={getChangeColor(row.conversion_rate_change_pct)}>
      {formatDeltaPercent(row.conversion_rate_change_pct)}
    </span>,
  ])
}

function renderTopPageRows(rows: PrimaryDriversTopPageRow[]) {
  return rows.map((row) => [
    <span key={`${row.url}-url`} className="block max-w-[280px] truncate font-medium text-foreground">
      {row.url}
    </span>,
    <span key={`${row.url}-clicks`} className={getChangeColor(row.clicks_change)}>
      {formatWholeNumber(row.clicks_change)}
    </span>,
    <span key={`${row.url}-cvr`} className={getChangeColor(row.conversion_rate_change)}>
      {formatDeltaPercent(row.conversion_rate_change)}
    </span>,
  ])
}

export function PrimaryDriversSheet({
  open,
  onOpenChange,
  businessId,
  businessName,
}: PrimaryDriversSheetProps) {
  const defaultRange = React.useMemo(() => createDefaultRange(), [])
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(defaultRange)
  const [committedRange, setCommittedRange] = React.useState<DateRange | undefined>(defaultRange)
  const [rangeValidationMessage, setRangeValidationMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      const nextDefault = createDefaultRange()
      setDraftRange(nextDefault)
      setCommittedRange(nextDefault)
      setRangeValidationMessage(null)
    }
  }, [open])

  const committedStartDate = committedRange?.from ? toIsoDate(committedRange.from) : null
  const committedEndDate = committedRange?.to ? toIsoDate(committedRange.to) : null

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = usePrimaryDrivers({
    businessId,
    startDate: committedStartDate,
    endDate: committedEndDate,
    enabled: open,
  })

  const handleRangeChange = React.useCallback((nextRange: DateRange | undefined) => {
    setDraftRange(nextRange)

    if (!nextRange?.from || !nextRange?.to) {
      setRangeValidationMessage(null)
      return
    }

    const length = getRangeLength(nextRange)
    if (length < 7) {
      setRangeValidationMessage("Short date ranges may not reflect meaningful trends. Select at least 7 days.")
      return
    }

    setRangeValidationMessage(null)
    setCommittedRange({
      from: startOfDay(nextRange.from),
      to: startOfDay(nextRange.to),
    })
  }, [])

  const statusConfig = data ? STATUS_STYLES[data.status] : null
  const warningCards = React.useMemo(() => {
    if (!data) return []
    const cards = []

    if (data.edge_case_flags.includes("possible_tracking_issue")) {
      cards.push({
        title: "Possible tracking issue detected",
        description:
          "GA4 sessions dropped sharply while search impressions remained stable. This may indicate a tracking or data collection problem rather than a real traffic change.",
      })
    }

    if (data.edge_case_flags.includes("limited_data")) {
      cards.push({
        title: "Limited data available",
        description:
          "Results may not be reliable for this period. Metrics with enough data are still shown, but confidence is low.",
      })
    }

    if (data.edge_case_flags.includes("short_range_advisory")) {
      cards.push({
        title: "Short date range selected",
        description:
          "Short ranges may not reflect meaningful trends. Consider selecting at least 7 days for more reliable analysis.",
      })
    }

    return cards
  }, [data])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l border-general-border p-0 pt-8 sm:max-w-4xl">
        <SheetHeader className="gap-4 border-b bg-background px-6 py-5 pr-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 pr-10">
              <SheetTitle className="text-2xl font-semibold tracking-tight">
                Primary Drivers
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{businessName}</p>
            </div>
            <PrimaryDriversRangePicker
              value={draftRange}
              onChange={handleRangeChange}
              validationMessage={rangeValidationMessage}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <div className="space-y-2 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Computing primary drivers...</p>
          </div>
        </div>
      ) : isError ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-6 w-6 text-red-600" />
                <h3 className="mt-3 text-base font-semibold text-red-900">Unable to load Primary Drivers</h3>
                <p className="mt-2 text-sm leading-relaxed text-red-800">
                  {error || "Something went wrong while loading this report."}
                </p>
              </div>
            </div>
          ) : data ? (
            <div className="relative h-full">
              <ScrollArea className="h-full">
                <div className="space-y-5 px-6 py-5">
                {warningCards.map((warning) => (
                  <WarningBanner
                    key={warning.title}
                    title={warning.title}
                    description={warning.description}
                  />
                ))}

                <div className="rounded-2xl border border-general-border bg-white p-5 shadow-xs">
                  <div className="space-y-4">
                    <p className="max-w-3xl text-xl font-semibold leading-tight text-foreground">
                      {data.headline}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {statusConfig ? (
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", statusConfig.dot)} />
                          <span className={cn("font-semibold", statusConfig.text)}>{statusConfig.label}</span>
                        </div>
                      ) : null}
                      <span className="text-muted-foreground">
                        Confidence: <span className="font-semibold capitalize text-foreground">{data.confidence}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Conversions" metric={data.metric_strip.conversions} formatValue={formatCompactNumber} />
                    <MetricTile label="Organic traffic" metric={data.metric_strip.sessions} formatValue={formatCompactNumber} />
                    <MetricTile label="Clicks" metric={data.metric_strip.clicks} formatValue={formatCompactNumber} />
                    <MetricTile label="Impressions" metric={data.metric_strip.impressions} formatValue={formatCompactNumber} />
                    <MetricTile label="CTR" metric={data.metric_strip.ctr} formatValue={formatPercentValue} tooltipOptions={{ percent: true }} />
                    <MetricTile label="Avg position" metric={data.metric_strip.avg_position} formatValue={formatPositionValue} formatChange={formatPositionChange} invertChangeColor tooltipOptions={{ position: true }} />
                    <MetricTile label="Conversion rate" metric={data.metric_strip.conversion_rate} formatValue={formatPercentValue} tooltipOptions={{ percent: true }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Top Drivers</h3>
                  </div>
                  {data.top_drivers.length > 0 ? (
                    <div className="space-y-3">
                      {data.top_drivers.map((driver) => (
                        <DriverCard key={`${driver.name}-${driver.value}`} driver={driver} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-general-border bg-card p-4 text-sm text-muted-foreground">
                      No significant drivers identified for this period.
                    </div>
                  )}
                </div>

                <SectionTable
                  title="Channel Breakdown"
                  columns={["Channel", "Sessions", "Sessions Δ", "Conversions", "Conversions Δ"]}
                  rows={renderChannelRows(data.segment_breakdowns.channels)}
                />

                <SectionTable
                  title="Device Breakdown"
                  columns={["Device", "Sessions", "Sessions Δ", "Conversion Rate", "Conversion Rate Δ"]}
                  rows={renderDeviceRows(data.segment_breakdowns.devices)}
                />

                <SectionTable
                  title="Top Pages"
                  columns={["URL", "Clicks Δ", "Conversion Rate Δ"]}
                  rows={renderTopPageRows(data.segment_breakdowns.top_pages)}
                />
              </div>
              </ScrollArea>
              {isFetching ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
                  <div className="rounded-2xl border border-general-border bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">Computing insights...</p>
                        <p className="text-xs text-muted-foreground">Comparing against the previous period.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
