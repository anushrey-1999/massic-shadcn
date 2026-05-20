"use client"

import * as React from "react"
import { format, startOfDay, subDays } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// "As-of" semantics: the user picks the END date of the 7-day window, not the
// start. Search Console data lags ~2 days behind today, so the latest selectable
// end date is today - GSC_LAG_DAYS. The window analysed is then
// [selectedDate - 6, selectedDate]. This guarantees a full 7 days of real data
// for every picked date and matches how an agency owner thinks about it
// ("show me anomalies as of this date").
export const GSC_LAG_DAYS = 2
export const OBS_DAYS = 7

interface AlertDateSelectorProps {
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  className?: string
}

export function AlertDateSelector({ selectedDate, onDateChange, className }: AlertDateSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const today = startOfDay(new Date())
  const maxSelectableEnd = subDays(today, GSC_LAG_DAYS)
  const endDate = selectedDate || maxSelectableEnd
  const startDate = subDays(endDate, OBS_DAYS - 1)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setOpen(false)
    }
  }

  return (
    <div className={cn("min-w-0", className || "w-full")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              className?.includes("w-auto") ? "w-auto" : "w-full",
              "min-w-0 justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {selectedDate
                ? `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
                : "Select date (as-of)"
              }
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={6} collisionPadding={16}>
          <div className="w-[252px] rounded-t-lg border-b bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground mb-0.5">Select as-of date</p>
            <p className="text-[11px] text-muted-foreground">
              {selectedDate ? (
                <>
                  7-day period: <strong>{format(startDate, "MMM d")}</strong> to <strong>{format(endDate, "MMM d, yyyy")}</strong>
                </>
              ) : (
                "Pick a date to analyse the 7 days ending on it"
              )}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
              Latest selectable: <strong>{format(maxSelectableEnd, "MMM d")}</strong>
              {" "}· Search Console lags {GSC_LAG_DAYS} days
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleSelect}
            disabled={(date) => date > maxSelectableEnd}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
