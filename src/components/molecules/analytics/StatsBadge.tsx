"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, icons } from "lucide-react"

interface StatsBadgeProps {
  value: number
  className?: string
  showIcon?: boolean
  variant?: "pill" | "plain"
}

export function StatsBadge({ value, className, showIcon = true, variant = "pill" }: StatsBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  if (variant === "plain") {
    const iconColor = isPositive
      ? "text-emerald-600"
      : isNegative
        ? "text-red-600"
        : "text-general-muted-foreground"

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium  tracking-[0.15px] text-muted-foreground",
          className
        )}
      >
        {showIcon && !isNeutral &&
          (isPositive ? (
            // <TrendingUp className={cn("h-3 w-3", iconColor)} />
          <span className={`-mr-0.5 text-xs ${iconColor}`} >+</span>

          ) : (
            // <TrendingDown className={cn("h-3 w-3", iconColor)} />
            <span className={`-mr-0.5 text-xs ${iconColor}`}>-</span>
          ))}
        <span className="font-medium">{Math.abs(value)}%</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-general-muted-foreground text-xs ",
        className
      )}
    >
      {showIcon && !isNeutral &&
        (isPositive ? (
          // <TrendingUp className="h-3 w-3 text-emerald-600" />
          <span className="-mr-0.5">+</span>
        ) : (
          // <TrendingDown className="h-3 w-3 text-red-600" />
            <span className="-mr-0.5">-</span>
        ))}
      <span className="font-medium">{Math.abs(value)}%</span>
    </span>
  )
}

interface TrendBadgeProps {
  label: string
  variant?: "critical" | "positive" | "default"
  className?: string
}

export function TrendBadge({ label, variant = "default", className }: TrendBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium leading-none",
        variant === "critical" && " text-red-600",
        variant === "positive" && "bg-emerald-100 text-emerald-600",
        variant === "default" && "bg-gray-100 text-gray-600",
        className
      )}
    >
      {label}
    </span>
  )
}
