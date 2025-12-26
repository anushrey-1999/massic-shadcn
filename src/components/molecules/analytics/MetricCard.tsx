"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react"

interface MetricCardProps {
  icon?: React.ReactNode
  label?: string
  value?: string
  change?: number
  sparklineData?: number[]
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  className?: string
}

export function MetricCard({
  icon,
  label,
  value,
  change,
  sparklineData,
  isLoading = false,
  error = null,
  emptyMessage = "No data available",
  className,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-card h-[88px] gap-2",
          className
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Analyzing...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg p-3 bg-card text-muted-foreground text-sm",
          className
        )}
      >
        {error}
      </div>
    )
  }

  if (!value && !label) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg p-3 text-muted-foreground text-sm",
          className
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  const isPositive = change !== undefined ? change >= 0 : true

  return (
    <div
      className={cn(
        "flex items-center gap-10 bg-card p-3 flex-1",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 leading-[150%]">
          {/* {icon && <span className="text-muted-foreground">{icon}</span>} */}
          {label && <span className="text-base text-muted-foreground font-medium ">{label}</span>}
        </div>
        <div className="flex items-center gap-1">
          {value && <span className="text-3xl font-semibold text-general-unofficial-foreground-alt">{value}</span>}
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className="font-medium text-general-muted-foreground">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
      </div>
      {sparklineData && (
        <div className="h-8 w-[100px]">
          <svg
            viewBox="0 0 100 32"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <path
              d={generateSparklinePath(sparklineData)}
              fill="none"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

function generateSparklinePath(data: number[]): string {
  if (data.length === 0) return ""
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = 100 / (data.length - 1)

  return data
    .map((value, index) => {
      const x = index * stepX
      const y = 32 - ((value - min) / range) * 28
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
}
