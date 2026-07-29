"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, isSameMonth, isSameDay } from "date-fns"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  startDate?: string | null
  endDate?: string | null
  onChange?: (startDate: string | null, endDate: string | null) => void
  placeholder?: string
  className?: string
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th"
  switch (day % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

function formatDateDisplay(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate) return ""

  const parseDateParts = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const startParsed = parseDateParts(startDate)
  const startDay = startParsed.getDate()
  const startMonth = format(startParsed, "MMM")

  if (!endDate || endDate === startDate) {
    return `${startDay}${getOrdinalSuffix(startDay)} ${startMonth}`
  }

  const endParsed = parseDateParts(endDate)
  const endDay = endParsed.getDate()
  const endMonth = format(endParsed, "MMM")

  if (isSameMonth(startParsed, endParsed)) {
    return `${startDay}${getOrdinalSuffix(startDay)} - ${endDay}${getOrdinalSuffix(endDay)} ${endMonth}`
  }

  return `${startDay}${getOrdinalSuffix(startDay)} ${startMonth} - ${endDay}${getOrdinalSuffix(endDay)} ${endMonth}`
}

function parseDateString(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatToDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Pick a date",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempStart, setTempStart] = React.useState<Date | undefined>(undefined)
  const [isSelectingEnd, setIsSelectingEnd] = React.useState(false)

  const displayText = formatDateDisplay(startDate, endDate)

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSelectingEnd && tempStart) {
      onChange?.(formatToDateString(tempStart), null)
    }
    if (!newOpen) {
      setTempStart(undefined)
      setIsSelectingEnd(false)
    }
    setOpen(newOpen)
  }

  const handleSelect = (date: Date | undefined) => {
    if (!date) return

    if (!isSelectingEnd) {
      setTempStart(date)
      setIsSelectingEnd(true)
    } else {
      const start = tempStart!

      if (isSameDay(date, start)) {
        onChange?.(formatToDateString(start), null)
      } else if (date < start) {
        onChange?.(formatToDateString(date), formatToDateString(start))
      } else {
        onChange?.(formatToDateString(start), formatToDateString(date))
      }

      setOpen(false)
      setTempStart(undefined)
      setIsSelectingEnd(false)
    }
  }

  const selectedDate = tempStart || parseDateString(startDate)

  const getModifiers = () => {
    const from = parseDateString(startDate)
    const to = parseDateString(endDate)

    const modifiers: Record<string, Date[]> = {
      rangeStart: [],
      rangeEnd: [],
      rangeMiddle: [],
    }

    if (tempStart) {
      modifiers.rangeStart = [tempStart]
    } else if (from) {
      modifiers.rangeStart = [from]
      if (to && !isSameDay(from, to)) {
        modifiers.rangeEnd = [to]
        const middle: Date[] = []
        const current = new Date(from)
        current.setDate(current.getDate() + 1)
        while (current < to) {
          middle.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }
        modifiers.rangeMiddle = middle
      }
    }

    return modifiers
  }

  const modifiers = getModifiers()

  const modifiersClassNames = {
    rangeStart: "!bg-primary !text-primary-foreground rounded-l-md rounded-r-none",
    rangeEnd: "!bg-primary !text-primary-foreground rounded-r-md rounded-l-none",
    rangeMiddle: "!bg-accent !text-accent-foreground !rounded-none",
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "w-full cursor-pointer min-h-[32px] flex items-center",
            className
          )}
        >
          {displayText ? (
            <span className="text-sm">{displayText}</span>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onDayClick={handleSelect}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          defaultMonth={selectedDate}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  )
}
