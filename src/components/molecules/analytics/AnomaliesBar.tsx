"use client"

import { ChartSpline, ArrowRight } from "lucide-react"
import { TrendBadge } from "./StatsBadge"

interface AnomalyBadge {
  label: string
  variant: "critical" | "positive"
}

interface AnomaliesBarProps {
  badges: AnomalyBadge[]
  onAction?: () => void
}

export function AnomaliesBar({ badges, onAction }: AnomaliesBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ChartSpline className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Anomalies</span>
        </div>
        <div className="flex items-center gap-2">
          {badges.map((badge, index) => (
            <TrendBadge key={index} label={badge.label} variant={badge.variant} />
          ))}
        </div>
      </div>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
        onClick={onAction}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
