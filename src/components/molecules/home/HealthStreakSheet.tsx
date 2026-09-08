"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCurrentHealthStreak,
  type HealthStatusRow,
} from "@/hooks/use-health-status"
import {
  formatHealthDate,
  HEALTH_LABEL,
  HealthDailyMetrics,
  HealthSignalPill,
  HealthTrendIndicator,
  healthTrendLabel,
} from "./health-signal-ui"

export function HealthStreakSheet({
  businessId,
  businessName,
  status,
  open,
  onOpenChange,
}: {
  businessId: string
  businessName: string
  status: HealthStatusRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = useCurrentHealthStreak(businessId, open)
  const streak = query.data?.current_streak ?? status.current_streak ?? null
  const days = query.data?.days ?? []
  const color = streak?.color ?? status.health_color
  const label = color ? HEALTH_LABEL[color] : "Signal"
  const isStale = days.some(day => day.is_stale) || status.is_stale

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="truncate text-base">{businessName}</SheetTitle>
          <SheetDescription>Current signal streak and daily details</SheetDescription>
        </SheetHeader>

        {streak && color && (
          <section className="space-y-3 border-b px-5 py-4">
            <HealthSignalPill color={color} streakDays={streak.days} />
            <div>
              <p className="text-sm font-medium text-foreground">
                {label} for {streak.days} {streak.days === 1 ? "day" : "days"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatHealthDate(streak.start_date, true)} – {formatHealthDate(streak.end_date, true)}
                {" · "}data through {formatHealthDate(streak.end_date, true)}
              </p>
            </div>
            {isStale && (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Data is older than the latest analytics date
              </div>
            )}
          </section>
        )}

        <ScrollArea className="min-h-0 flex-1">
          {query.isLoading ? (
            <div className="space-y-0" aria-label="Loading streak details">
              {[1, 2, 3].map(item => (
                <div key={item} className="space-y-3 border-b px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-medium text-foreground">Couldn’t load streak details</p>
              <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          ) : days.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-1 px-6 text-center">
              <p className="text-sm font-medium text-foreground">No daily history yet</p>
              <p className="text-xs text-muted-foreground">The first stored signal will appear here.</p>
            </div>
          ) : (
            <div aria-live="polite">
              {days.map(day => (
                <DailyStreakRow key={day.computed_date} day={day} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function DailyStreakRow({ day }: { day: HealthStatusRow }) {
  return (
    <article className="space-y-3 border-b px-5 py-4 last:border-b-0">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <time className="text-sm font-medium text-foreground" dateTime={day.computed_date}>
          {formatHealthDate(day.computed_date)}
        </time>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <HealthTrendIndicator trend={day.trend_arrow} />
          <span>{healthTrendLabel(day.trend_arrow)}</span>
          <span aria-hidden="true">·</span>
          <span>{day.confidence ? `${day.confidence} confidence` : "Confidence unavailable"}</span>
        </div>
      </div>
      <HealthDailyMetrics status={day} />
      {day.reason_text && (
        <p className="text-xs leading-relaxed text-muted-foreground">{day.reason_text}</p>
      )}
    </article>
  )
}
