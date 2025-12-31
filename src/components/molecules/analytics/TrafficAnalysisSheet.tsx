"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  Activity,
  Loader2,
  Sparkles,
  Zap,
  Clock,
  Eye,
  BarChart3,
  ArrowRight,
  MousePointerClick,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDateSelector } from "./AlertDateSelector"
import type { TrafficData } from "@/hooks/use-traffic-analysis"

import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis"

interface TrafficAnalysisSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTrafficData: TrafficData | null
  defaultIsLoading: boolean
  businessId: string | null
  businessName: string
}

export const getTrafficAlertIconColor = (trafficData: TrafficData | null) => {
  return trafficData ? "#F59E0B" : "#16A34A";
};

const getSeverityConfig = (severity: string) => {
  const normalized = severity.toLowerCase()

  if (normalized === "critical") {
    return {
      icon: AlertCircle,
      label: "Critical",
      borderColor: "border-l-red-500",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      iconColor: "text-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      bgGradient: "bg-gradient-to-br from-red-50 to-red-100/30",
    }
  }

  if (normalized === "warning") {
    return {
      icon: AlertTriangle,
      label: "Warning",
      borderColor: "border-l-amber-500",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      bgGradient: "bg-gradient-to-br from-amber-50 to-amber-100/30",
    }
  }

  return {
    icon: Activity,
    label: "Notice",
    borderColor: "border-l-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    bgGradient: "bg-gradient-to-br from-blue-50 to-blue-100/30",
  }
}

interface TrafficCardProps {
  traffic: TrafficData
  onClick: () => void
}

function TrafficCard({ traffic, onClick }: TrafficCardProps) {
  const config = getSeverityConfig(traffic.severity || "notice")
  const Icon = config.icon
  const isNegative = traffic.direction === "down"
  const TrendIcon = isNegative ? TrendingDown : TrendingUp

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-lg border-l-4 bg-card p-3 transition-all hover:shadow-md",
        config.borderColor,
        "border border-border/50 hover:border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0", config.badgeClass)}>
              {config.label}
            </Badge>
            <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold", config.bgColor)}>
              <TrendIcon className={cn("h-3 w-3", config.iconColor)} />
              <span className={config.iconColor}>
                {isNegative ? "-" : "+"}{Math.abs(traffic.delta_pct)}%
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {isNegative ? "-" : "+"}{Math.abs(traffic.delta_clicks).toLocaleString()} clicks
            </Badge>
          </div>

          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {traffic.narrative?.headline || "Traffic Anomaly"}
          </h3>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

interface TrafficDetailViewProps {
  traffic: TrafficData
  onBack: () => void
}

function TrafficDetailView({ traffic, onBack }: TrafficDetailViewProps) {
  const config = getSeverityConfig(traffic.severity || "notice")
  const Icon = config.icon
  const isNegative = traffic.direction === "down"
  const TrendIcon = isNegative ? TrendingDown : TrendingUp

  const actionCategories = {
    urgent: traffic.narrative?.actions?.urgent || [],
    important: traffic.narrative?.actions?.important || [],
    monitor: traffic.narrative?.actions?.monitoring || [],
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Compact Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-3 -ml-2 h-7 text-xs"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>

          <div className={cn("rounded-lg p-4 border-l-4", config.borderColor, "bg-card border")}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0.5", config.badgeClass)}>
                {config.label}
              </Badge>
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold", config.bgColor)}>
                <TrendIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                <span className={config.iconColor}>
                  {isNegative ? "-" : "+"}{Math.abs(traffic.delta_pct)}%
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {isNegative ? "-" : "+"}{Math.abs(traffic.delta_clicks).toLocaleString()}
              </Badge>
            </div>

            <h2 className="text-sm font-bold text-foreground leading-tight">
              {traffic.narrative?.headline || "Traffic Anomaly"}
            </h2>
          </div>
        </div>

        {/* Summary Bullets */}
        {traffic.narrative?.summary_bullets && traffic.narrative.summary_bullets.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              Insights
            </h3>
            <ul className="space-y-1.5">
              {traffic.narrative.summary_bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Brand Split */}
        {traffic.narrative?.brand_split && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              Traffic Split
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Brand</p>
                <p className="text-lg font-bold text-foreground">
                  {traffic.narrative.brand_split.brand_pct}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {traffic.narrative.brand_split.brand_delta > 0 ? "+" : ""}{traffic.narrative.brand_split.brand_delta.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Non-Brand</p>
                <p className="text-lg font-bold text-foreground">
                  {100 - traffic.narrative.brand_split.brand_pct}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {traffic.narrative.brand_split.nonbrand_delta > 0 ? "+" : ""}{traffic.narrative.brand_split.nonbrand_delta.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Contributors */}
        {traffic.narrative?.top_contributors && traffic.narrative.top_contributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">Top Contributors</h3>
            <div className="space-y-1.5">
              {traffic.narrative.top_contributors.map((contributor, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-2.5"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-foreground flex-1 leading-tight line-clamp-1">
                      {contributor.key}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <TrendIcon className={cn("h-3 w-3",
                        contributor.delta_clicks > 0 ? "text-emerald-500" : "text-red-500"
                      )} />
                      <span className={cn("text-xs font-semibold",
                        contributor.delta_clicks > 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {contributor.delta_clicks > 0 ? "+" : ""}{contributor.delta_clicks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {contributor.classification && (
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {contributor.classification}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {traffic.narrative?.actions && 
          (traffic.narrative.actions.urgent?.length > 0 || 
           traffic.narrative.actions.important?.length > 0 || 
           traffic.narrative.actions.monitoring?.length > 0) && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">Actions</h3>
            <div className="space-y-2">
              {actionCategories.urgent.length > 0 && (
                <div className="rounded-lg border bg-red-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="h-3 w-3 text-red-500" />
                    <h4 className="text-xs font-semibold text-red-700">Urgent</h4>
                  </div>
                  <ul className="space-y-1">
                    {actionCategories.urgent.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-red-600">
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {actionCategories.important.length > 0 && (
                <div className="rounded-lg border bg-amber-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <h4 className="text-xs font-semibold text-amber-700">Important</h4>
                  </div>
                  <ul className="space-y-1">
                    {actionCategories.important.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {actionCategories.monitor.length > 0 && (
                <div className="rounded-lg border bg-blue-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Eye className="h-3 w-3 text-blue-500" />
                    <h4 className="text-xs font-semibold text-blue-700">Monitor</h4>
                  </div>
                  <ul className="space-y-1">
                    {actionCategories.monitor.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-blue-600">
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export function TrafficAnalysisSheet({
  open,
  onOpenChange,
  defaultTrafficData,
  defaultIsLoading,
  businessId,
  businessName,
}: TrafficAnalysisSheetProps) {
  const [localDate, setLocalDate] = React.useState<Date | null>(null)
  const [showDetail, setShowDetail] = React.useState(false)
  const [localSelectedDate, setLocalSelectedDate] = React.useState<string | null>(null)

  const {
    trafficData: localTrafficData,
    isLoading: localIsLoading,
  } = useTrafficAnalysis(businessId, businessName, localSelectedDate)

  const displayTrafficData = localSelectedDate !== null ? localTrafficData : defaultTrafficData
  const displayIsLoading = localSelectedDate !== null ? localIsLoading : defaultIsLoading

  const handleAnalyze = async () => {
    if (localDate) {
      setLocalSelectedDate(format(localDate, "yyyy-MM-dd"))
      setShowDetail(false)
    }
  }

  const handleClose = () => {
    setLocalDate(null)
    setLocalSelectedDate(null)
    setShowDetail(false)
    onOpenChange(false)
  }

  React.useEffect(() => {
    if (!open) {
      setShowDetail(false)
      setLocalDate(null)
      setLocalSelectedDate(null)
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b bg-muted/30 space-y-3">
          <div>
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <MousePointerClick
                className="h-4 w-4"
                color={getTrafficAlertIconColor(defaultTrafficData)}
              />
              Traffic Analysis
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track and analyze your traffic anomalies
            </p>
          </div>
          <div className="space-y-2">
            <AlertDateSelector selectedDate={localDate} onDateChange={setLocalDate} />
            <Button
              onClick={handleAnalyze}
              disabled={!localDate || displayIsLoading}
              className="w-full h-8 text-xs"
              size="sm"
            >
              {displayIsLoading && localSelectedDate !== null ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Analyze Period
                </>
              )}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {displayIsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : showDetail && displayTrafficData ? (
            <TrafficDetailView traffic={displayTrafficData} onBack={() => setShowDetail(false)} />
          ) : displayTrafficData ? (
            <ScrollArea className="h-full">
              <div className="p-4">
                <TrafficCard traffic={displayTrafficData} onClick={() => setShowDetail(true)} />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center space-y-2 max-w-xs">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-foreground">No traffic anomalies</p>
                <p className="text-[11px] text-muted-foreground">
                  Select a different date range to analyze
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
