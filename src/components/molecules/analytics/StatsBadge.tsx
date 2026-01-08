"use client"

import { cn } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"

interface StatsBadgeProps {
  value: number
  className?: string
  showIcon?: boolean
  variant?: "pill" | "plain" | "small"
}

export function StatsBadge({ value, className, showIcon = true, variant = "pill" }: StatsBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  if (variant === "plain" || variant === "small") {
    const iconColor = isPositive
      ? "text-emerald-600"
      : isNegative
        ? "text-red-600"
        : "text-general-muted-foreground"

    const wrapperClassName =
      variant === "small"
        ? "inline-flex items-center text-[8px] font-medium text-muted-foreground"
        : "inline-flex items-center text-[10px] font-medium  text-muted-foreground"

    const iconSizeClassName = variant === "small" ? "h-2.5 w-2.5" : "h-3 w-3"

    return (
      <span
        className={cn(
          wrapperClassName,
          className
        )}
      >
        {showIcon && !isNeutral &&
          (isPositive ? (
            <Plus className={cn(iconSizeClassName, iconColor)} />
          ) : (
            <Minus className={cn(iconSizeClassName, iconColor)} />
          ))}
        <span className={`font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-general-muted-foreground'}`}>{Math.abs(value)}%</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center text-general-muted-foreground text-xs",
        className
      )}
    >
      {showIcon && !isNeutral &&
        (isPositive ? (
          <Plus className="h-2 w-2 text-green-600" />
        ) : (
          <Minus className="h-2 w-2 text-red-600" />
        ))}
      <span className={`font-medium text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-general-muted-foreground'}`}>{Math.abs(value)}%</span>
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
        variant === "positive" && "bg-green-100 text-green-600",
        variant === "default" && "bg-gray-100 text-gray-600",
        className
      )}
    >
      {label}
    </span>
  )
}
