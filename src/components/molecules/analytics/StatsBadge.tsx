"use client"

import { cn } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"

interface StatsBadgeProps {
  value: number
  className?: string
  valueClassName?: string
  showIcon?: boolean
  variant?: "pill" | "plain" | "small"
}

export function StatsBadge({ value, className, valueClassName, showIcon = true, variant = "pill" }: StatsBadgeProps) {
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
        ? "inline-flex items-baseline text-[8px] font-medium text-muted-foreground leading-none"
        : "inline-flex items-baseline text-[11px] font-medium text-muted-foreground leading-none"

    const iconSizeClassName = variant === "small" ? "h-2.5 w-2.5" : "h-2.5 w-2.5"

    return (
      <span
        className={cn(
          wrapperClassName,
          className
        )}
      >
        {showIcon && !isNeutral &&
          (isPositive ? (
            <Plus className={cn(iconSizeClassName, "mr-0.5 self-baseline", iconColor)} />
          ) : (
            <Minus className={cn(iconSizeClassName, "mr-0.5 self-baseline", iconColor)} />
          ))}
        <span
          className={cn(
            "font-medium leading-none",
            isPositive
              ? "text-green-600"
              : isNegative
                ? "text-red-600"
                : "text-general-muted-foreground",
            valueClassName
          )}
        >
          {Math.abs(value)}%
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline text-general-muted-foreground text-xs leading-none",
        className
      )}
    >
      {showIcon && !isNeutral &&
        (isPositive ? (
          <Plus className="mr-0.5 h-2.5 w-2.5 self-baseline text-green-600" />
        ) : (
          <Minus className="mr-0.5 h-2.5 w-2.5 self-baseline text-red-600" />
        ))}
      <span
        className={cn(
          "font-medium leading-none",
          isPositive
            ? "text-green-600"
            : isNegative
              ? "text-red-600"
              : "text-general-muted-foreground",
          valueClassName
        )}
      >
        {Math.abs(value)}%
      </span>
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
