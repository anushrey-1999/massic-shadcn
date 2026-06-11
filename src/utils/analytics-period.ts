import {
  addDays,
  endOfMonth,
  endOfQuarter,
  format,
  isAfter,
  isBefore,
  isValid,
  max as maxDate,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
} from "date-fns"

export const MAX_ANALYTICS_MONTHS_BACK = 16
export const PRESET_END_OFFSET_DAYS = 2
export const CUSTOM_PERIOD_PREFIX = "custom:"

export const TIME_PERIODS = [
  { id: "7-days", label: "7 days", value: "7 days", group: "recent" },
  { id: "14-days", label: "14 days", value: "14 days", group: "recent" },
  { id: "28-days", label: "28 days", value: "28 days", group: "recent" },
  { id: "last-week", label: "Last Week", value: "last week", group: "calendar" },
  { id: "this-month", label: "This Month", value: "this month", group: "calendar" },
  { id: "last-month", label: "Last Month", value: "last month", group: "calendar" },
  { id: "this-quarter", label: "This Quarter", value: "this quarter", group: "calendar" },
  { id: "last-quarter", label: "Last Quarter", value: "last quarter", group: "calendar" },
  { id: "year-to-date", label: "Year to Date", value: "year to date", group: "calendar" },
  { id: "3-months", label: "3 months", value: "3 months", group: "rolling" },
  { id: "6-months", label: "6 months", value: "6 months", group: "rolling" },
  { id: "8-months", label: "8 months", value: "8 months", group: "rolling" },
  { id: "12-months", label: "12 months", value: "12 months", group: "rolling" },
  { id: "16-months", label: "16 months", value: "16 months", group: "rolling" },
] as const

export const PERIOD_SELECTOR_GROUPS = [
  {
    id: "recent",
    options: TIME_PERIODS.filter((period) => period.group === "recent"),
  },
  {
    id: "calendar",
    options: TIME_PERIODS.filter((period) => period.group === "calendar"),
  },
  {
    id: "rolling",
    options: TIME_PERIODS.filter((period) => period.group === "rolling"),
  },
] as const

export type TimePeriodPreset = (typeof TIME_PERIODS)[number]["value"]
export type TimePeriodValue = TimePeriodPreset | `custom:${string}:${string}`

export interface AnalyticsPeriodRange {
  from: Date
  to: Date
}

function formatPeriodDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function parsePeriodDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? startOfDay(parsed) : null
}

export function getAnalyticsPeriodBounds(referenceDate = new Date()) {
  const maxSelectableDate = startOfDay(referenceDate)
  const minSelectableDate = startOfDay(subMonths(maxSelectableDate, MAX_ANALYTICS_MONTHS_BACK))

  return {
    minSelectableDate,
    maxSelectableDate,
    presetAnchorDate: startOfDay(subDays(maxSelectableDate, PRESET_END_OFFSET_DAYS)),
  }
}

export function clampAnalyticsDate(date: Date, referenceDate = new Date()) {
  const normalized = startOfDay(date)
  const { minSelectableDate, maxSelectableDate } = getAnalyticsPeriodBounds(referenceDate)

  if (isBefore(normalized, minSelectableDate)) return minSelectableDate
  if (isAfter(normalized, maxSelectableDate)) return maxSelectableDate
  return normalized
}

export function serializeCustomTimePeriod(from: Date | string, to: Date | string): TimePeriodValue {
  const fromValue = typeof from === "string" ? from : formatPeriodDate(from)
  const toValue = typeof to === "string" ? to : formatPeriodDate(to)
  return `${CUSTOM_PERIOD_PREFIX}${fromValue}:${toValue}` as TimePeriodValue
}

export function parseCustomTimePeriod(value: string | null | undefined): AnalyticsPeriodRange | null {
  if (!value || !value.startsWith(CUSTOM_PERIOD_PREFIX)) return null

  const match = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/i.exec(value.trim())
  if (!match) return null

  const from = parsePeriodDate(match[1])
  const to = parsePeriodDate(match[2])
  if (!from || !to || isAfter(from, to)) return null

  return { from, to }
}

export function isCustomTimePeriodValue(value: TimePeriodValue): value is `custom:${string}:${string}` {
  return Boolean(parseCustomTimePeriod(value))
}

export function getTimePeriodLabel(value: TimePeriodPreset): string {
  return TIME_PERIODS.find((period) => period.value === value)?.label ?? value
}

export function resolveTimePeriodRange(
  period: TimePeriodValue,
  referenceDate = new Date()
): AnalyticsPeriodRange | null {
  const customRange = parseCustomTimePeriod(period)
  if (customRange) {
    return {
      from: clampAnalyticsDate(customRange.from, referenceDate),
      to: clampAnalyticsDate(customRange.to, referenceDate),
    }
  }

  const { presetAnchorDate, minSelectableDate } = getAnalyticsPeriodBounds(referenceDate)

  const anchoredRange = (() => {
    switch (period) {
      case "7 days":
        return { from: subDays(presetAnchorDate, 6), to: presetAnchorDate }
      case "14 days":
        return { from: subDays(presetAnchorDate, 13), to: presetAnchorDate }
      case "28 days":
        return { from: subDays(presetAnchorDate, 27), to: presetAnchorDate }
      case "last week": {
        const lastWeekReference = subWeeks(presetAnchorDate, 1)
        return {
          from: startOfWeek(lastWeekReference, { weekStartsOn: 1 }),
          to: addDays(startOfWeek(lastWeekReference, { weekStartsOn: 1 }), 6),
        }
      }
      case "this month":
        return { from: startOfMonth(presetAnchorDate), to: presetAnchorDate }
      case "last month": {
        const lastMonthReference = subMonths(presetAnchorDate, 1)
        return {
          from: startOfMonth(lastMonthReference),
          to: endOfMonth(lastMonthReference),
        }
      }
      case "this quarter":
        return { from: startOfQuarter(presetAnchorDate), to: presetAnchorDate }
      case "last quarter": {
        const lastQuarterReference = subQuarters(presetAnchorDate, 1)
        return {
          from: startOfQuarter(lastQuarterReference),
          to: endOfQuarter(lastQuarterReference),
        }
      }
      case "year to date":
        return { from: startOfYear(presetAnchorDate), to: presetAnchorDate }
      case "3 months":
        return { from: subMonths(presetAnchorDate, 3), to: presetAnchorDate }
      case "6 months":
        return { from: subMonths(presetAnchorDate, 6), to: presetAnchorDate }
      case "8 months":
        return { from: subMonths(presetAnchorDate, 8), to: presetAnchorDate }
      case "12 months":
        return { from: subMonths(presetAnchorDate, 12), to: presetAnchorDate }
      case "16 months":
        return { from: subMonths(presetAnchorDate, 16), to: presetAnchorDate }
      default:
        return null
    }
  })()

  if (!anchoredRange) return null

  return {
    from: maxDate([startOfDay(anchoredRange.from), minSelectableDate]),
    to: startOfDay(anchoredRange.to),
  }
}

export function getDefaultCustomTimePeriod(referenceDate = new Date()): TimePeriodValue {
  const { maxSelectableDate, minSelectableDate } = getAnalyticsPeriodBounds(referenceDate)
  const from = maxDate([minSelectableDate, subDays(maxSelectableDate, 27)])
  return serializeCustomTimePeriod(from, maxSelectableDate)
}

export function formatTimePeriodSummary(period: TimePeriodValue, referenceDate = new Date()) {
  const range = resolveTimePeriodRange(period, referenceDate)
  if (!range) return ""
  return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`
}

