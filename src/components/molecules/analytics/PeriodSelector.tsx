"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { AnalyticsGroupBy } from "@/utils/analytics-chart-grouping"
import {
  PERIOD_SELECTOR_GROUPS,
  TimePeriodValue,
  clampAnalyticsDate,
  formatTimePeriodSummary,
  getDefaultCustomTimePeriod,
  getTimePeriodLabel,
  getAnalyticsPeriodBounds,
  isCustomTimePeriodValue,
  parseCustomTimePeriod,
  resolveTimePeriodRange,
  serializeCustomTimePeriod,
} from "@/utils/analytics-period"

interface PeriodSelectorProps {
  value: TimePeriodValue
  onValueChange: (value: TimePeriodValue) => void
  className?: string
  groupBy?: AnalyticsGroupBy
  onGroupByChange?: (value: AnalyticsGroupBy) => void
  disabledGroupByOptions?: AnalyticsGroupBy[]
}

interface DraftRange {
  from?: Date
  to?: Date
}

function normalizeRangeSelection(range: DraftRange | undefined, referenceDate = new Date()): DraftRange | undefined {
  if (!range?.from && !range?.to) return undefined

  const from = range.from ? clampAnalyticsDate(range.from, referenceDate) : undefined
  const to = range.to ? clampAnalyticsDate(range.to, referenceDate) : undefined

  if (from && to && from > to) {
    return { from: to, to: from }
  }

  return { from, to }
}

function formatInputDate(date?: Date) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string) {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const GROUP_BY_OPTIONS: Array<{ label: string; value: AnalyticsGroupBy }> = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
]

export function PeriodSelector({
  value,
  onValueChange,
  className,
  groupBy,
  onGroupByChange,
  disabledGroupByOptions = [],
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)
  const [customExpanded, setCustomExpanded] = useState(false)
  const [draftRange, setDraftRange] = useState<DraftRange | undefined>()
  const showGroupBySelector = Boolean(groupBy && onGroupByChange)

  const isCustomValue = isCustomTimePeriodValue(value)
  const { minSelectableDate, maxSelectableDate } = useMemo(
    () => getAnalyticsPeriodBounds(),
    []
  )

  useEffect(() => {
    if (!open) return

    const resolvedRange =
      resolveTimePeriodRange(value) ??
      parseCustomTimePeriod(getDefaultCustomTimePeriod())

    setDraftRange(
      resolvedRange
        ? {
            from: resolvedRange.from,
            to: resolvedRange.to,
          }
        : undefined
    )
    setCustomExpanded(isCustomValue)
  }, [isCustomValue, open, value])

  const triggerLabel = isCustomValue ? "Custom" : getTimePeriodLabel(value)
  const draftSummary =
    draftRange?.from && draftRange?.to
      ? formatTimePeriodSummary(serializeCustomTimePeriod(draftRange.from, draftRange.to))
      : ""

  const handlePresetSelect = (nextValue: TimePeriodValue) => {
    onValueChange(nextValue)
    setCustomExpanded(false)
    setOpen(false)
  }

  const handleCustomSelect = () => {
    setCustomExpanded(true)
  }

  const handleDateInputChange = (field: "from" | "to", nextValue: string) => {
    const parsed = parseInputDate(nextValue)
    const clamped = parsed ? clampAnalyticsDate(parsed) : undefined

    setDraftRange((current) => {
      const nextRange = {
        from: field === "from" ? clamped : current?.from,
        to: field === "to" ? clamped : current?.to,
      }
      return normalizeRangeSelection(nextRange)
    })
  }

  const handleApplyCustom = () => {
    if (!draftRange?.from || !draftRange?.to) return
    onValueChange(serializeCustomTimePeriod(draftRange.from, draftRange.to))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-auto justify-between rounded-[8px] border-general-border bg-white px-3 text-left font-normal",
            className
          )}
        >
          <span className="truncate text-sm text-foreground">
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn("p-0", showGroupBySelector ? "w-[280px]" : "w-[260px]")}
      >
        <div>
          {showGroupBySelector ? (
            <>
              <div className="p-1">
                <div className="flex w-full items-center rounded-[12px] bg-general-border p-[3px]">
                  {GROUP_BY_OPTIONS.map((option) => {
                    const isSelected = option.value === groupBy
                    const isDisabled = disabledGroupByOptions.includes(option.value)

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onGroupByChange?.(option.value)}
                        disabled={isDisabled}
                        className={cn(
                          "flex-1 rounded-[10px] px-3 py-2 text-sm font-medium tracking-[0.07px] transition-colors",
                          isSelected
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                          isDisabled && "cursor-not-allowed opacity-40"
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Separator />
            </>
          ) : null}

          {PERIOD_SELECTOR_GROUPS.map((group, index) => (
            <div key={group.id}>
              {index > 0 ? <Separator /> : null}
              <div className="p-1">
                {group.options.map((period) => {
                  const isActive = !isCustomValue && value === period.value

                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => handlePresetSelect(period.value)}
                      className={cn(
                        "flex w-full items-start justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-muted"
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
                      {isActive ? <Check className="mt-0.5 h-4 w-4 text-primary" /> : null}
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
              onClick={handleCustomSelect}
              className={cn(
                "flex w-full items-start justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60",
                (isCustomValue || customExpanded) && "bg-muted"
              )}
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Custom</span>
                {(isCustomValue || customExpanded) ? (
                  <span className="text-xs text-muted-foreground">
                    {draftSummary || formatTimePeriodSummary(value)}
                  </span>
                ) : null}
              </span>
              {isCustomValue ? <Check className="mt-0.5 h-4 w-4 text-primary" /> : null}
            </button>
          </div>

          {customExpanded ? (
            <>
              <Separator />
              <div className="space-y-3 p-3">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">From</label>
                    <Input
                      type="date"
                      min={formatInputDate(minSelectableDate)}
                      max={formatInputDate(maxSelectableDate)}
                      value={formatInputDate(draftRange?.from)}
                      onChange={(event) => handleDateInputChange("from", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">To</label>
                    <Input
                      type="date"
                      min={formatInputDate(minSelectableDate)}
                      max={formatInputDate(maxSelectableDate)}
                      value={formatInputDate(draftRange?.to)}
                      onChange={(event) => handleDateInputChange("to", event.target.value)}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Select any range from the last 16 months up to today.
                </p>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleApplyCustom}
                    disabled={!draftRange?.from || !draftRange?.to}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
