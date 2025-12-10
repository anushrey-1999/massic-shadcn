"use client"

import { cn } from "@/lib/utils"
import { Target, TrendingUp, TrendingDown, ChevronRight, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AlertBadge {
  count: number
  type: "critical" | "warning" | "positive"
}

interface AlertBarProps {
  title: string
  icon?: React.ReactNode
  badges?: AlertBadge[]
  isLoading?: boolean
  error?: string | null
  noAlertsMessage?: string
  onClick?: () => void
  className?: string
}

const badgeStyles = {
  critical: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
}

const badgeLabels = {
  critical: "Critical",
  warning: "Warning",
  positive: "Positive",
}

export function AlertBar({
  title,
  icon,
  badges = [],
  isLoading = false,
  error = null,
  noAlertsMessage = "No recent anomalies detected",
  onClick,
  className,
}: AlertBarProps) {
  const hasAlerts = badges.some((b) => b.count > 0)

  return (
    <button
      onClick={!isLoading ? onClick : undefined}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 transition-all",
        !isLoading && "hover:bg-accent/50 cursor-pointer",
        isLoading && "opacity-70 cursor-default",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <span className="text-sm font-semibold text-foreground">{title}</span>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs italic">Error loading data</span>
          </div>
        ) : hasAlerts ? (
          <div className="flex items-center gap-2">
            {badges.map(
              (badge) =>
                badge.count > 0 && (
                  <Badge
                    key={badge.type}
                    variant="outline"
                    className={cn("text-xs font-semibold uppercase", badgeStyles[badge.type])}
                  >
                    {badge.count} {badgeLabels[badge.type]}
                  </Badge>
                )
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">{noAlertsMessage}</span>
        )}
      </div>

      {!isLoading && (
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  )
}

interface GoalAlertBarProps {
  criticalCount: number
  warningCount: number
  positiveCount: number
  isLoading?: boolean
  error?: string | null
  onClick?: () => void
  className?: string
}

export function GoalAlertBar({
  criticalCount,
  warningCount,
  positiveCount,
  isLoading,
  error,
  onClick,
  className,
}: GoalAlertBarProps) {
  const badges: AlertBadge[] = [
    { count: criticalCount, type: "critical" },
    { count: warningCount, type: "warning" },
    { count: positiveCount, type: "positive" },
  ]

  return (
    <AlertBar
      title="Goal Alerts"
      icon={<Target className="h-5 w-5" />}
      badges={badges}
      isLoading={isLoading}
      error={error}
      noAlertsMessage={`No recent anomalies detected as of ${new Date().toLocaleDateString()}`}
      onClick={onClick}
      className={className}
    />
  )
}

interface TrafficAlertBarProps {
  trafficData: {
    direction: "up" | "down"
    severity: "high" | "medium" | "low"
    delta_pct: number
  } | null
  isLoading?: boolean
  error?: string | null
  onClick?: () => void
  className?: string
}

export function TrafficAlertBar({ trafficData, isLoading, error, onClick, className }: TrafficAlertBarProps) {
  const getTrafficBadge = (): AlertBadge | null => {
    if (!trafficData) return null

    const percentage = Math.abs(trafficData.delta_pct * 100).toFixed(0)

    if (trafficData.direction === "up") {
      return { count: 1, type: "positive" }
    }

    return {
      count: 1,
      type: trafficData.severity === "high" ? "critical" : "warning",
    }
  }

  const badge = getTrafficBadge()

  const getCustomBadgeContent = () => {
    if (!trafficData) return null
    const percentage = Math.abs(trafficData.delta_pct * 100).toFixed(0)
    return trafficData.direction === "down" ? `${percentage}% Drop` : `${percentage}% Increase`
  }

  return (
    <button
      onClick={!isLoading ? onClick : undefined}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 transition-all",
        !isLoading && "hover:bg-accent/50 cursor-pointer",
        isLoading && "opacity-70 cursor-default",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">
          {trafficData?.direction === "up" ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
        </div>
        <span className="text-sm font-semibold text-foreground">Traffic Alerts</span>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs italic">Error loading data</span>
          </div>
        ) : trafficData && badge ? (
          <Badge
            variant="outline"
            className={cn("text-xs font-semibold uppercase", badgeStyles[badge.type])}
          >
            {getCustomBadgeContent()}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            No recent anomalies detected as of {new Date().toLocaleDateString()}
          </span>
        )}
      </div>

      {!isLoading && (
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  )
}
