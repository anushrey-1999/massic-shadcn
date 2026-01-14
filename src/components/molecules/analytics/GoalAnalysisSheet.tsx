"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Target,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  Lightbulb,
  ArrowRight,
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
import type { GoalData, Diagnosis } from "@/hooks/use-goal-analysis"

import { useGoalAnalysis } from "@/hooks/use-goal-analysis"

interface GoalAnalysisSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultGoalData: GoalData[]
  defaultCriticalCount: number
  defaultWarningCount: number
  defaultPositiveCount: number
  defaultIsLoading: boolean
  businessId: string | null
  businessName: string
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    label: "Critical",
    borderColor: "border-l-red-500",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconColor: "text-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    bgGradient: "bg-gradient-to-br from-red-50 to-red-100/30",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    borderColor: "border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    bgGradient: "bg-gradient-to-br from-amber-50 to-amber-100/30",
  },
  positive: {
    icon: CheckCircle,
    label: "Positive",
    borderColor: "border-l-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-600",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    bgGradient: "bg-gradient-to-br from-emerald-50 to-emerald-100/30",
  },
}

interface GoalCardProps {
  goal: GoalData
  onClick: () => void
}

function GoalCard({ goal, onClick }: GoalCardProps) {
  const config = severityConfig[goal.severity]
  const Icon = config.icon
  const isNegative = goal.percentage.startsWith("-")
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
              <span className={config.iconColor}>{goal.percentage}</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-foreground line-clamp-1">{goal.title}</h3>

          <p className={cn("text-xs leading-snug line-clamp-2", config.textColor)}>
            {goal.primaryCause}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

interface GoalDetailViewProps {
  goal: GoalData
  onBack: () => void
}

function GoalDetailView({ goal, onBack }: GoalDetailViewProps) {
  const config = severityConfig[goal.severity]
  const Icon = config.icon
  const isNegative = goal.percentage.startsWith("-")
  const TrendIcon = isNegative ? TrendingDown : TrendingUp

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
                <span className={config.iconColor}>{goal.percentage}</span>
              </div>
            </div>

            <h2 className="text-sm font-bold text-foreground leading-tight mb-2">{goal.title}</h2>

            <p className={cn("text-xs leading-relaxed", config.textColor)}>
              {goal.primaryCause}
            </p>
          </div>
        </div>

        {/* Summary Bullets */}
        {goal.summaryBullets && goal.summaryBullets.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              Key Insights
            </h3>
            <ul className="space-y-1.5">
              {goal.summaryBullets.map((bullet, idx) => (
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

        {/* Diagnoses */}
        {goal.diagnoses && goal.diagnoses.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Diagnosis & Actions
            </h3>
            <div className="space-y-2">
              {goal.diagnoses.map((diagnosis, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-foreground flex-1 leading-tight">{diagnosis.cause_code}</h4>
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                      {Math.round(diagnosis.confidence * 100)}%
                    </Badge>
                  </div>

                  {diagnosis.rationale && (
                    <p className="text-xs text-muted-foreground mb-2 leading-snug">
                      {diagnosis.rationale}
                    </p>
                  )}

                  {diagnosis.suggested_actions && diagnosis.suggested_actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-[10px] font-semibold text-foreground mb-1.5">Actions:</p>
                      <ul className="space-y-1">
                        {diagnosis.suggested_actions.map((action: string, actionIdx: number) => (
                          <li
                            key={actionIdx}
                            className="flex items-start gap-1.5 text-xs text-muted-foreground"
                          >
                            <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export function GoalAnalysisSheet({
  open,
  onOpenChange,
  defaultGoalData,
  defaultCriticalCount,
  defaultWarningCount,
  defaultPositiveCount,
  defaultIsLoading,
  businessId,
  businessName,
}: GoalAnalysisSheetProps) {
  const [localDate, setLocalDate] = React.useState<Date | null>(null)
  const [selectedGoal, setSelectedGoal] = React.useState<GoalData | null>(null)
  const [localSelectedDate, setLocalSelectedDate] = React.useState<string | null>(null)

  const {
    goalData: localGoalData,
    criticalCount: localCriticalCount,
    warningCount: localWarningCount,
    positiveCount: localPositiveCount,
    isLoading: localIsLoading,
  } = useGoalAnalysis(businessId, businessName, localSelectedDate)

  const displayGoalData = localSelectedDate !== null ? localGoalData : defaultGoalData
  const displayCriticalCount = localSelectedDate !== null ? localCriticalCount : defaultCriticalCount
  const displayWarningCount = localSelectedDate !== null ? localWarningCount : defaultWarningCount
  const displayPositiveCount = localSelectedDate !== null ? localPositiveCount : defaultPositiveCount
  const displayIsLoading = localSelectedDate !== null ? localIsLoading : defaultIsLoading

  const handleAnalyze = async () => {
    if (localDate) {
      setLocalSelectedDate(format(localDate, "yyyy-MM-dd"))
      setSelectedGoal(null)
    }
  }

  const handleClose = () => {
    setLocalDate(null)
    setLocalSelectedDate(null)
    setSelectedGoal(null)
    onOpenChange(false)
  }

  React.useEffect(() => {
    if (!open) {
      setSelectedGoal(null)
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
              <Target
                className="h-4 w-4"
                color={
                  (displayCriticalCount > 0 || displayWarningCount > 0 || displayPositiveCount > 0)
                    ? "#F59E0B"
                    : "#16A34A"
                }
              />
              Goal Analysis
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track and analyze your goal anomalies
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
              {displayCriticalCount} Critical
            </Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
              {displayWarningCount} Warning
            </Badge>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
              {displayPositiveCount} Positive
            </Badge>
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
          ) : selectedGoal ? (
            <GoalDetailView goal={selectedGoal} onBack={() => setSelectedGoal(null)} />
          ) : displayGoalData.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {displayGoalData.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onClick={() => setSelectedGoal(goal)} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center space-y-2 max-w-xs">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Target
                    className="h-5 w-5"
                    color={
                      (displayCriticalCount > 0 || displayWarningCount > 0 || displayPositiveCount > 0)
                        ? "#F59E0B"
                        : "#16A34A"
                    }
                  />
                </div>
                <p className="text-xs font-medium text-foreground">No goal anomalies</p>
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
