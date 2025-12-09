"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  change: number
  sparklineData?: number[]
  className?: string
}

export function MetricCard({
  icon,
  label,
  value,
  change,
  sparklineData,
  className,
}: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-card p-3 flex-1",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{value}</span>
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded",
              // isPositive
              //   ? "text-emerald-600 bg-emerald-50"
              //   : "text-red-600 bg-red-50"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
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
