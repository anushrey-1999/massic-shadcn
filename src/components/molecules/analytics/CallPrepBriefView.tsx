"use client"

import * as React from "react"
import { format } from "date-fns"
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  CallPrepBriefHighlight,
  CallPrepBriefResponse,
  CallPrepHighlightTone,
  PrimaryDriversWin,
} from "@/hooks/use-primary-drivers"

function fmtDateRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const currentYear = new Date().getFullYear()
  const startFmt = format(
    startDate,
    startDate.getFullYear() !== currentYear ? "MMM d, yyyy" : "MMM d",
  )
  const endFmt = format(
    endDate,
    endDate.getFullYear() !== currentYear || startDate.getFullYear() !== endDate.getFullYear()
      ? "MMM d, yyyy"
      : "MMM d",
  )
  return `${startFmt} – ${endFmt}`
}

function getWindowBucketLabel(bucket: CallPrepBriefResponse["window_bucket"]): string {
  if (bucket === "7d") return "7 days"
  if (bucket === "28d") return "28 days"
  if (bucket === "90d") return "90 days"
  return "12 months"
}

function getHighlightText(highlight: CallPrepBriefHighlight) {
  return typeof highlight === "string" ? highlight : highlight.text
}

function toneFromText(text: string): CallPrepHighlightTone {
  const normalized = text.toLowerCase()

  if (
    /(declin|down|drop|loss|lost|drag|collapsed|soften|problem|worsen|below|penalty|issue|risk|fewer)/.test(normalized)
  ) {
    return "negative"
  }

  if (
    /(grow|grew|up\b|improv|healthy|steady|held steady|stabil|momentum|strong|better|gain|positive)/.test(normalized)
  ) {
    return "positive"
  }

  return "neutral"
}

function getHighlightTone(
  highlight: CallPrepBriefHighlight,
  index: number,
  allPositive: boolean,
): CallPrepHighlightTone {
  if (typeof highlight !== "string" && highlight.tone) {
    return highlight.tone
  }

  if (allPositive) return "positive"

  const tone = toneFromText(getHighlightText(highlight))
  if (tone !== "neutral") return tone

  if (index === 1) return "positive"
  if (index === 0 || index === 2) return "negative"
  return "neutral"
}

const HIGHLIGHT_STYLES: Record<CallPrepHighlightTone, { item: string; dot: string }> = {
  negative: {
    item: "border-[#F7C1C1] bg-[#FEF2F2] text-[#7F1D1D]",
    dot: "bg-[#E24B4A]",
  },
  positive: {
    item: "border-[#9FE1CB] bg-[#F0FDFA] text-[#085041]",
    dot: "bg-[#1D9E75]",
  },
  neutral: {
    item: "border-border/60 bg-secondary/60 text-foreground",
    dot: "bg-muted-foreground",
  },
}

interface CallPrepBriefViewProps {
  callBrief: CallPrepBriefResponse
  wins?: PrimaryDriversWin[]
}

export function CallPrepBriefView({ callBrief, wins = [] }: CallPrepBriefViewProps) {
  const comparisonLabel = [
    fmtDateRange(callBrief.date_range.start, callBrief.date_range.end),
    `vs ${fmtDateRange(callBrief.date_range.comparison_start, callBrief.date_range.comparison_end)}`,
    getWindowBucketLabel(callBrief.window_bucket),
  ].join(" · ")

  const showCurveballs = !callBrief.all_positive && callBrief.brief.curveballs.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[15px] font-medium text-foreground">
            {callBrief.business_name} — Meeting Prep Notes
          </p>
          <p className="text-[11px] text-muted-foreground">{comparisonLabel}</p>
        </div>
        {callBrief.all_positive ? (
          <Badge className="rounded-md border-[#9FE1CB] bg-[#F0FDFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#085041] hover:bg-[#F0FDFA]">
            All Positive
          </Badge>
        ) : null}
      </div>

      {callBrief.brief.confidence_note ? (
        <Alert variant="warning" className="border-[#FAC775] bg-[#FFFBEB] text-[#633806]">
          <AlertDescription className="flex items-start gap-2 text-[12px] leading-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
            <span>{callBrief.brief.confidence_note}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 rounded-xl border-border/60 bg-secondary/40 py-0 shadow-none">
        <CardContent className="px-4 py-3.5 text-[13px] leading-7 text-foreground">
          {callBrief.brief.open_with}
        </CardContent>
      </Card>

      {wins.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#9FE1CB] bg-[#F0FDFA] px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6E56]" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0F6E56]">
              Wins
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {wins.map((win, index) => (
                <span key={`${win.label}-${index}`} className="text-[12px] text-[#085041]">
                  · {win.label} {win.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {callBrief.brief.highlights.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            Top 3 points
          </p>
          <div className="space-y-2">
            {callBrief.brief.highlights.slice(0, 3).map((highlight, index) => {
              const tone = getHighlightTone(highlight, index, callBrief.all_positive)
              const styles = HIGHLIGHT_STYLES[tone]
              return (
                <div
                  key={`${getHighlightText(highlight)}-${index}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-[12px] leading-6",
                    styles.item,
                  )}
                >
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
                  <p>{getHighlightText(highlight)}</p>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Where this is happening
        </p>
        <Card className="gap-0 overflow-hidden rounded-xl border-border/60 py-0 shadow-none">
          <CardContent className="px-0">
            <div className="border-b border-border/60 px-4 py-3 text-[12px] leading-6 text-muted-foreground">
              {callBrief.brief.where_this_is_happening.summary}
            </div>
            <div className="divide-y divide-border/60">
              {callBrief.brief.where_this_is_happening.locations.slice(0, 3).map((location, index) => (
                <div
                  key={`${location.label}-${index}`}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <p className="min-w-0 text-[12px] font-medium text-foreground">{location.label}</p>
                  <p className="max-w-[220px] text-right text-[11px] leading-5 text-muted-foreground">
                    {location.detail}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {showCurveballs ? (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            Be ready for these questions
          </p>
          <div className="space-y-3">
            {callBrief.brief.curveballs.map((curveball, index) => (
              <Card key={`${curveball.question}-${index}`} className="gap-0 overflow-hidden rounded-xl border-border/60 py-0 shadow-none">
                <div className="flex items-start gap-3 border-b border-[#FAC775] bg-[#FFFBEB] px-4 py-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#854F0B]" />
                  <p className="text-[13px] font-medium leading-6 text-[#633806]">
                    {curveball.question}
                  </p>
                </div>
                <CardContent className="space-y-3 px-4 py-3.5">
                  <p className="text-[12px] leading-6 text-foreground">{curveball.short_answer}</p>
                  <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-[12px] leading-6 text-muted-foreground">
                    {curveball.deeper_explanation}
                  </div>
                  {curveball.evaluation_areas.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        What we are evaluating
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {curveball.evaluation_areas.slice(0, 3).map((area) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="rounded-full border-border/70 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
