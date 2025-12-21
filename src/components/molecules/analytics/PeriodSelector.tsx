"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TIME_PERIODS, type TimePeriodValue } from "@/hooks/use-gsc-analytics"

interface PeriodSelectorProps {
  value: TimePeriodValue
  onValueChange: (value: TimePeriodValue) => void
  className?: string
}

export function PeriodSelector({ value, onValueChange, className }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {TIME_PERIODS.map((period) => (
          <SelectItem key={period.id} value={period.value}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
