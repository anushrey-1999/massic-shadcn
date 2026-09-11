"use client";

import { AlertTriangle, MousePointerClick, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrentHealthStreak,
  type HealthPeriodTotals,
  type HealthStatusRow,
} from "@/hooks/use-health-status";
import {
  formatHealthDate,
  HealthDailyMetrics,
  HealthMetricComparisonRow,
  HealthSignalPill,
  HealthTrendIndicator,
  healthTrendLabel,
} from "./health-signal-ui";

export function HealthStreakSheet({
  businessId,
  businessName,
  status,
  open,
  onOpenChange,
}: {
  businessId: string;
  businessName: string;
  status: HealthStatusRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useCurrentHealthStreak(businessId, open);
  const streak = query.data?.current_streak ?? status.current_streak ?? null;
  const days = [...(query.data?.days ?? [])].sort((left, right) =>
    right.computed_date.localeCompare(left.computed_date),
  );
  const periodTotals = query.data?.period_totals;
  const color = streak?.color ?? status.health_color;
  const isStale = days.some((day) => day.is_stale) || status.is_stale;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="text-base">Signal streak</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <span className="truncate">{businessName}</span>
            {streak && color && (
              <HealthSignalPill color={color} streakDays={streak.days} />
            )}
          </SheetDescription>
        </SheetHeader>

        <section className="space-y-2 border-b px-5 py-3">
          <div className="grid grid-cols-2 divide-x rounded-lg border border-general-border bg-white p-1.5">
            <PeriodTotals
              days={28}
              totals={periodTotals?.days_28}
              hasClicks={status.gsc_connected}
              hasGoals={status.ga4_connected}
              isLoading={query.isLoading}
            />
            <PeriodTotals
              days={90}
              totals={periodTotals?.days_90}
              hasClicks={status.gsc_connected}
              hasGoals={status.ga4_connected}
              isLoading={query.isLoading}
            />
          </div>
          {isStale && (
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Data is older than the latest analytics date
            </div>
          )}
        </section>

        <ScrollArea className="min-h-0 flex-1">
          {query.isLoading ? (
            <div className="space-y-0" aria-label="Loading streak details">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-3 border-b px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Couldn’t load streak details
              </p>
              <p className="text-xs text-muted-foreground">
                Please check your connection and try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : days.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-1 px-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No daily history yet
              </p>
              <p className="text-xs text-muted-foreground">
                The first stored signal will appear here.
              </p>
            </div>
          ) : (
            <div aria-live="polite">
              {days.map((day) => (
                <DailyStreakRow key={day.computed_date} day={day} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function PeriodTotals({
  days,
  totals,
  hasClicks,
  hasGoals,
  isLoading,
}: {
  days: 28 | 90;
  totals: HealthPeriodTotals | undefined;
  hasClicks: boolean;
  hasGoals: boolean;
  isLoading: boolean;
}) {
  const metrics = [
    {
      label: "Goals",
      value: hasGoals ? totals?.goals : null,
      previous: hasGoals ? totals?.previous_goals : null,
      change: hasGoals ? totals?.goals_change_pct : null,
      icon: <Target className="h-3 w-3 shrink-0 text-emerald-600" />,
    },
    {
      label: "Clicks",
      value: hasClicks ? totals?.clicks : null,
      previous: hasClicks ? totals?.previous_clicks : null,
      change: hasClicks ? totals?.clicks_change_pct : null,
      icon: (
        <MousePointerClick className="h-3 w-3 shrink-0 rotate-90 text-blue-600" />
      ),
    },
  ];

  return (
    <div className="space-y-1.5 px-2">
      <p className="text-xs font-medium text-foreground">{days} days</p>
      {metrics.map(({ label, value, previous, change, icon }) => (
        <div key={label}>
          {isLoading ? (
            <Skeleton className="h-9 w-full rounded-sm" />
          ) : (
            <div className="flex h-9 items-center rounded-sm bg-foreground-light px-2">
              <HealthMetricComparisonRow
                icon={icon}
                label={label}
                recent={value ?? null}
                baseline={previous ?? null}
                changePct={change == null ? null : change / 100}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DailyStreakRow({ day }: { day: HealthStatusRow }) {
  return (
    <article className="space-y-3 border-b px-5 py-4 last:border-b-0">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <time
          className="text-sm font-medium text-foreground"
          dateTime={day.computed_date}
        >
          {formatHealthDate(day.computed_date)}
        </time>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <HealthTrendIndicator trend={day.trend_arrow} />
          <span>{healthTrendLabel(day.trend_arrow)}</span>
        </div>
      </div>
      <HealthDailyMetrics status={day} />
    </article>
  );
}
