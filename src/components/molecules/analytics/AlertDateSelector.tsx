"use client"

import * as React from "react"
import { format, addDays, startOfDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface AlertDateSelectorProps {
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  className?: string
}

export function AlertDateSelector({ selectedDate, onDateChange, className }: AlertDateSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const today = startOfDay(new Date())
  const startDate = selectedDate || today
  const endDate = addDays(startDate, 6)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setOpen(false)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate
              ? `${format(startDate, "MMM d, yyyy")} → ${format(endDate, "MMM d, yyyy")}`
              : "Select 7-day range"
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="rounded-t-lg border-b bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground mb-0.5">Select Start Date</p>
            <p className="text-[11px] text-muted-foreground">
              {selectedDate ? (
                <>
                  7-day period: <strong>{format(startDate, "MMM d")}</strong> to <strong>{format(endDate, "MMM d, yyyy")}</strong>
                </>
              ) : (
                "Choose a start date for 7-day analysis"
              )}
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleSelect}
            disabled={(date) => date > today}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
