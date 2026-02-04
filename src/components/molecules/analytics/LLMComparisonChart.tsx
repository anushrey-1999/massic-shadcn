"use client"

import { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsBadge } from "./StatsBadge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LLMData {
  name: string
  icon: ReactNode
  value: number
  change: number
  color: string
  rawValue?: number
}

interface LLMComparisonChartProps {
  title: string
  data: LLMData[]
  isLoading?: boolean
  hasData?: boolean
}

export function LLMComparisonChart({
  title,
  data,
  isLoading = false,
  hasData = true,
}: LLMComparisonChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col rounded-lg bg-white">
        <Skeleton className="h-6 w-64 mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-[28px] w-[38px] rounded" />
              <Skeleton className="h-[28px] flex-1 rounded" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <div className="flex flex-col rounded-lg border border-general-border bg-white p-3">
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-general-muted-foreground">No data available</p>
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex flex-col bg-white justify-center">
      <div className="flex flex-col gap-4">
        {data.map((item, index) => {
          const displayValue = item.rawValue ?? item.value
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0

          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-[40px] w-[40px] items-center justify-center text-general-muted-foreground shrink-0">
                {item.icon}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#737373' }}>{item.name}</span>
                  <StatsBadge value={item.change} className="min-w-[60px] justify-end" />
                </div>
                <div className="flex items-center gap-2 group relative">
                  <div className="w-full h-[12px] bg-[#E5E5E5] rounded-full relative">
                    <div
                      className="h-[12px] rounded-full absolute top-0 left-0 cursor-pointer"
                      style={{
                        width: barWidth > 0 ? `${barWidth}%` : '4px',
                        backgroundColor: item.value > 0 ? item.color : '#E5E5E5',
                      }}
                    >
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#171717] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {displayValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
