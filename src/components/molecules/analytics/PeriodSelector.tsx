"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TIME_PERIODS, type TimePeriodValue } from "@/hooks/use-gsc-analytics"
import { useId } from "react"

interface PeriodSelectorProps {
  value: TimePeriodValue
  onValueChange: (value: TimePeriodValue) => void
  className?: string
}

export function PeriodSelector({ value, onValueChange, className }: PeriodSelectorProps) {
    const id = useId()
  return (
    <Select value={value} onValueChange={onValueChange} key={id}>
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
