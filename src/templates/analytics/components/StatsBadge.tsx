"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsBadgeProps {
  value: number
  className?: string
  showIcon?: boolean
}

export function StatsBadge({ value, className, showIcon = true }: StatsBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded",
        isPositive && "text-emerald-600 bg-emerald-50",
        isNegative && "text-red-600 bg-red-50",
        isNeutral && "text-gray-600 bg-gray-100",
        className
      )}
    >
      {showIcon && !isNeutral &&
        (isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        ))}
      <span>{Math.abs(value)}%</span>
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
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variant === "critical" && "bg-red-100 text-red-600",
        variant === "positive" && "bg-emerald-100 text-emerald-600",
        variant === "default" && "bg-gray-100 text-gray-600",
        className
      )}
    >
      {label}
    </span>
  )
}
