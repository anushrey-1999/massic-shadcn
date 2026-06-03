"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Loader2, ArrowRight } from "lucide-react"
import { StatsBadge } from "./StatsBadge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useState } from "react"

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
  disableTooltip?: boolean
  showArrowButton?: boolean
  onArrowClick?: () => void
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
  disableTooltip = false,
  showArrowButton = false,
  onArrowClick,
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false)
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

  // Show tooltip for empty state if value is '--' (as used in OrganicPerformanceSection)
  if (value === "--") {
    const emptyStateContent = (
      <>
        {label && <span className="text-base text-muted-foreground font-medium ">{label}</span>}
        <span className="text-3xl font-semibold text-general-unofficial-foreground-alt">--</span>
      </>
    )

    if (disableTooltip) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg p-3 text-muted-foreground text-sm cursor-default h-[88px]",
            className
          )}
        >
          {emptyStateContent}
        </div>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg p-3 text-muted-foreground text-sm cursor-default h-[88px]",
              className
            )}
          >
            {emptyStateContent}
          </div>
        </TooltipTrigger>
        <TooltipContent>{emptyMessage}</TooltipContent>
      </Tooltip>
    )
  }

  const isPositive = change !== undefined ? change >= 0 : true

  return (
    <div
      className={cn(
        "flex items-center gap-10 bg-card p-3 flex-1 relative group transition-colors",
        showArrowButton && "hover:bg-muted rounded-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 leading-[150%]">
          {/* {icon && <span className="text-muted-foreground">{icon}</span>} */}
          {label && <span className="text-base text-muted-foreground font-medium ">{label}</span>}
        </div>
        <div className="flex items-baseline gap-1">
          {value && <span className="text-3xl font-semibold leading-none text-general-unofficial-foreground-alt">{value}</span>}
          {change !== undefined && (
            <StatsBadge value={change} className="leading-none" valueClassName="text-base" />
          )}
        </div>
      </div>
      {showArrowButton && (
        <button
          onClick={onArrowClick}
          className={cn(
            "absolute right-3  -translate-y-1/2 p-2 rounded-md bg-background border border-border opacity-0 transition-opacity cursor-pointer",
            isHovered && "opacity-100"
          )}
        >
          <ArrowRight className="h-3.5 w-3.5 text-foreground" />
        </button>
      )}
      {/* {sparklineData && (
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
      )} */}
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
