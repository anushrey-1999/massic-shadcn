"use client"

import { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

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

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return value.toLocaleString()
}

export function LLMComparisonChart({
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
    <div className="flex flex-col justify-center bg-white">
      <div className="flex flex-col gap-1">
        {data.map((item, index) => {
          const displayValue = item.rawValue ?? item.value
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const percentage = Math.round(item.value)

          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-general-muted-foreground">
                {item.icon}
              </div>
              <span className="w-[96px] shrink-0 truncate text-left text-sm font-medium text-[#737373]">
                {item.name}
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: barWidth > 0 ? `${barWidth}%` : "4px",
                    backgroundColor: item.value > 0 ? item.color : "#E5E5E5",
                  }}
                />
              </div>
              <div className="ml-auto flex min-w-[72px] shrink-0 items-center justify-end gap-1.5 whitespace-nowrap text-right leading-normal">
                <span className="text-[12px] font-normal tracking-[0.18px] text-[#0a0a0a]">
                  {percentage}%
                </span>
                <span className="text-[10px] font-medium tracking-[0.15px] text-[#737373]">
                  {formatCount(displayValue)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
