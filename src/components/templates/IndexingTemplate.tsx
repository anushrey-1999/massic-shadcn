"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { IndexingPagesTable } from "@/components/organisms/IndexingPagesTable"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useBusinessStore } from "@/store/business-store"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import {
  INDEX_BUCKET_META,
  getBucketColor,
  getBucketLabel,
} from "@/lib/gsc-index-bucket"
import {
  useIndexingMovements,
  useIndexingStatus,
  useIndexingSummary,
  useTriggerIndexing,
  useExportIndexing,
  type IndexingPagesParams,
  type IndexingSeriesPoint,
} from "@/hooks/use-gsc-indexing"
import {
  formatDateTime,
  formatNumber,
  formatShortDate,
  shortUrl,
} from "@/lib/indexing-table-utils"

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "28", label: "Last 28 days" },
  { value: "90", label: "Last 90 days" },
]

export function StatCard({
  label,
  value,
  hint,
  accent,
  partial,
}: {
  label: string
  value: string
  hint?: string
  accent?: string
  partial?: boolean
}) {
  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-general-muted-foreground">{label}</p>
        {partial ? <span className="rounded border border-general-border px-1.5 py-0.5 text-[10px] text-general-muted-foreground">Partial</span> : null}
      </div>
      <p
        className="mt-1.5 text-2xl font-semibold text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-general-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function getIndexingActionState({
  ingestionActive,
  mutationPending,
  quotaRemaining,
  quotaState,
  blockedUntil,
  dueCount,
  hasRunBefore,
}: {
  ingestionActive: boolean
  mutationPending: boolean
  quotaRemaining?: number
  quotaState?: "available" | "paused" | "daily_exhausted" | "rate_limited" | "live_disabled"
  blockedUntil?: string | null
  dueCount?: number
  hasRunBefore: boolean
}) {
  if (ingestionActive || mutationPending) {
    return { disabled: true, label: "Indexing...", title: "An indexing run is already in progress" }
  }
  if (quotaState === "live_disabled") {
    return {
      disabled: true,
      label: "Live checks off in QA",
      title: "QA live checks are limited to dedicated test properties",
    }
  }
  if (quotaState === "paused" || quotaState === "rate_limited") {
    return {
      disabled: true,
      label: "Google checks paused",
      title: blockedUntil
        ? `Checks can resume after ${formatDateTime(blockedUntil)}`
        : "Google temporarily limited inspections for this property",
    }
  }
  if (quotaState === "daily_exhausted") {
    return {
      disabled: true,
      label: "Daily quota unavailable",
      title: blockedUntil
        ? `Google property checks can resume after ${formatDateTime(blockedUntil)}`
        : "Google's daily property quota is unavailable",
    }
  }
  if (quotaRemaining !== undefined && quotaRemaining <= 0) {
    return { disabled: true, label: "Daily quota used", title: "Today’s 2,000-request property quota is used; monitoring resumes tomorrow" }
  }
  if (hasRunBefore && dueCount !== undefined && dueCount <= 0) {
    return { disabled: true, label: "Everything is on schedule", title: "No URL is due; scheduled surveillance continues automatically" }
  }
  return { disabled: false, label: hasRunBefore ? "Check due URLs" : "Start monitoring", title: undefined }
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-general-border bg-white">
      <div className="border-b border-general-border-four p-3">
        <h2 className="text-base font-medium text-general-secondary-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-general-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function PlainHead({ label }: { label: string }) {
  return (
    <TableHead className="h-[34px] bg-white px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-normal text-general-muted-foreground">
        {label}
      </span>
    </TableHead>
  )
}

function StatusBadge({ bucket }: { bucket?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: getBucketColor(bucket) }}
      />
      <span className="whitespace-nowrap text-xs text-foreground">
        {getBucketLabel(bucket)}
      </span>
    </span>
  )
}

export function IndexingTemplate() {
  const pathname = usePathname()
  const profiles = useBusinessStore((state) => state.profiles)

  const { businessId, businessProfile, businessName } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/)
    if (!match) {
      return {
        businessId: null as string | null,
        businessProfile: null,
        businessName: "Business",
      }
    }

    const id = match[1]
    const profile = profiles.find((p) => p.UniqueId === id)
    return {
      businessId: id,
      businessProfile: profile || null,
      businessName: profile?.Name || profile?.DisplayName || "Business",
    }
  }, [pathname, profiles])

  const { profileData } = useBusinessProfileById(businessId)
  const website = businessProfile?.Website || (profileData as any)?.Website || null
  const [rangeDays, setRangeDays] = useState<string>("28")

  const range = useMemo(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - Number(rangeDays))
    const fmt = (date: Date) => date.toISOString().slice(0, 10)
    return { from: fmt(from), to: fmt(to) }
  }, [rangeDays])

  const statusQuery = useIndexingStatus(businessId, website)
  const summaryQuery = useIndexingSummary(businessId, website, range)
  const movementsQuery = useIndexingMovements(businessId, website, {
    limit: 20,
    offset: 0,
  })

  const queryClient = useQueryClient()
  const triggerIndexing = useTriggerIndexing(businessId, website)
  const exportIndexing = useExportIndexing(businessId, website)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [chartMode, setChartMode] = useState<"status" | "activity">("status")
  const [issueFilter, setIssueFilter] = useState<string | null>(null)
  const pagesSectionRef = useRef<HTMLDivElement>(null)
  const [activePageFilters, setActivePageFilters] = useState<IndexingPagesParams>({})
  const handlePageFiltersChange = useCallback((filters: IndexingPagesParams) => {
    setActivePageFilters(filters)
  }, [])
  const handleInsightClick = (key: string) => {
    setIssueFilter(key)
    requestAnimationFrame(() => pagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const status = statusQuery.data
  const summary = summaryQuery.data
  const movements = movementsQuery.data
  const movementDenominator = movements
    ? movements.context.movementDenominator ?? movements.context.rechecked ?? movements.context.inspected
    : 0
  const movementSuccesses = movements
    ? movements.context.succeeded ?? movements.context.inspected
    : 0
  const ingestionActive =
    status?.status === "queued" || status?.status === "in_progress"

  // When a run finishes (active -> not active), the freshly ingested data won't
  // be reflected by the cached summary/pages/movements queries. Refetch them so
  // the page fills in without a manual refresh.
  const wasIngestionActive = useRef(ingestionActive)
  useEffect(() => {
    if (wasIngestionActive.current && !ingestionActive) {
      queryClient.invalidateQueries({ queryKey: ["indexing-summary"] })
      queryClient.invalidateQueries({ queryKey: ["indexing-pages"] })
      queryClient.invalidateQueries({ queryKey: ["indexing-movements"] })
      if (status?.status === "completed") {
        toast.success("Indexing complete. Updated index data is ready.")
      }
    }
    wasIngestionActive.current = ingestionActive
  }, [ingestionActive, status?.status, queryClient])
  const hasRunBefore = Boolean(status?.lastRunAt)
  const actionState = getIndexingActionState({
    ingestionActive,
    mutationPending: triggerIndexing.isPending,
    quotaRemaining: status?.quotaRemaining,
    quotaState: status?.quota?.state,
    blockedUntil: status?.quota?.blockedUntil,
    dueCount: status?.dueCount,
    hasRunBefore,
  })

  const handleExport = () => {
    exportIndexing.mutate(
      { ...activePageFilters, from: range.from, to: range.to },
      {
        onSuccess: () => toast.success("Indexing CSV exported."),
        onError: () => toast.error("Could not export indexing data."),
      }
    )
  }

  const handleStartIndexing = () => {
    triggerIndexing.mutate(undefined, {
      onSuccess: (res) => {
        setConfirmOpen(false)
        if (res?.alreadyRunning) {
          toast.info("An indexing run is already in progress.")
        } else {
          toast.success(
            res?.message || "Indexing started. Progress will update below."
          )
        }
        statusQuery.refetch()
      },
      onError: (error) => {
        setConfirmOpen(false)
        const message =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Failed to start indexing. Please try again."
        toast.error(message)
      },
    })
  }

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    for (const meta of INDEX_BUCKET_META) {
      config[meta.key] = { label: meta.label, color: meta.color }
    }
    return config
  }, [])

  const activeBuckets = useMemo(() => {
    if (!summary?.series?.length) return []
    const seen = new Set<string>()
    for (const point of summary.series) {
      for (const meta of INDEX_BUCKET_META) {
        const bucketValue = point[meta.key]
        if (typeof bucketValue === "number" && bucketValue > 0) {
          seen.add(meta.key)
        }
      }
    }
    return INDEX_BUCKET_META.filter((meta) => seen.has(meta.key))
  }, [summary])

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      {
        label: "Analytics",
        href: businessId ? `/business/${businessId}/analytics` : undefined,
      },
      { label: "Indexing" },
    ],
    [businessName, businessId]
  )

  return (
    <div className="flex min-h-screen flex-col bg-foreground-light">
      <div className="sticky top-0 z-11 border-b border-general-border bg-foreground-light">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex w-full max-w-[1224px] flex-col gap-3 px-4 py-4 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Indexing</h1>
            <p className="text-xs text-general-muted-foreground">
              Latest known Google index status, monitored incrementally each day.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-9 w-[145px] bg-white sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-9"
              onClick={handleExport}
              disabled={exportIndexing.isPending || !summary?.coverage?.tracked}
            >
              {exportIndexing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportIndexing.isPending ? "Exporting" : "Export CSV"}
            </Button>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  className="h-9"
                  disabled={actionState.disabled}
                  title={actionState.title}
                >
                  {ingestionActive || triggerIndexing.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {actionState.label}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {hasRunBefore
                      ? "Check due URLs now?"
                      : "Start monitoring this site?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    We&apos;ll inspect the highest-priority URLs that are due and
                    update their latest known Google status. Large sites rotate
                    through URLs over multiple days within the property quota.
                    {status
                      ? ` ${formatNumber(status.quotaRemaining)} of ${formatNumber(status.quotaLimit)} property requests remain today.`
                      : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={triggerIndexing.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault()
                      handleStartIndexing()
                    }}
                    disabled={triggerIndexing.isPending}
                  >
                    {triggerIndexing.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Check due URLs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full max-w-[1224px] flex-col gap-3 px-4 py-5 sm:px-7 sm:py-6">
          {ingestionActive ? (
            <div className="rounded-lg border border-general-border bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-general-muted-foreground" />
                {status?.status === "queued"
                  ? "Indexing run queued..."
                  : "Inspecting URLs with Google..."}
              </div>
              <p className="mt-1.5 text-xs text-general-muted-foreground">
                {status?.status === "queued"
                  ? "Your run is queued and will start shortly."
                  : `${formatNumber(status?.runProcessed)} of ${formatNumber(
                      status?.runTotal
                    )} URLs inspected this run (${status?.runProgress ?? 0}%).`}{" "}
                Large sites are refreshed incrementally within Google&apos;s daily
                property quota.
              </p>
              {status?.lastRun ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-7">
                  <div><p className="text-general-muted-foreground">Discovered</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.discovery?.total)}</p></div>
                  <div><p className="text-general-muted-foreground">Selected</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.lastRun.selected)}</p></div>
                  <div><p className="text-general-muted-foreground">Successful</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.lastRun.succeeded)}</p></div>
                  <div><p className="text-general-muted-foreground">Page failures</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.lastRun.failed)}</p></div>
                  <div><p className="text-general-muted-foreground">Rate-limited</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.lastRun.rateLimitedAttempts)}</p></div>
                  <div><p className="text-general-muted-foreground">Attempts</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.lastRun.attempted)}</p></div>
                  <div><p className="text-general-muted-foreground">Quota used</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.quota.attempted)} / {formatNumber(status.quota.limit)}</p></div>
                </div>
              ) : null}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-general-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, status?.runProgress ?? 0)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {status?.quota?.state && (
            status.quota.state !== "available" ||
            Number(status.lastRun?.rateLimitedAttempts) > 0
          ) ? (
            <div className="flex items-start gap-3 rounded-lg border border-general-border bg-white p-4" role="status">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-general-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {status.quota.state === "available"
                    ? status.lastRun?.stopReason
                      ? "The previous run was rate-limited"
                      : "Google briefly limited the previous run"
                    : status.quota.state === "daily_exhausted"
                    ? "Google daily property quota unavailable"
                    : status.quota.state === "live_disabled"
                      ? "Live Google checks are off in QA"
                      : status.quota.blockReason === "upstream_unavailable"
                        ? "Google inspections are temporarily unavailable"
                        : "Google temporarily limited inspections"}
                </p>
                <p className="mt-1 text-xs leading-5 text-general-muted-foreground">
                  {status.quota.state === "available"
                    ? status.lastRun?.stopReason
                      ? "Massic stopped the previous run early to protect this property’s Google quota. Checks are available again, and affected URLs are still due."
                      : "Massic paused, confirmed Google was available, and completed at a safer rate. No URLs were counted as page failures because of the throttle."
                    : status.quota.state === "live_disabled"
                    ? "Different OAuth credentials do not create a separate URL Inspection quota for the same Google project and site property. Existing reports remain available; QA live checks are limited to dedicated test properties."
                    : "Massic stopped the run early to protect this property’s Google quota. Rate-limited URLs remain due and are not counted as page failures."}
                  {status.quota.state !== "available" && status.quota.blockedUntil
                    ? ` Checks can resume after ${formatDateTime(status.quota.blockedUntil)}.`
                    : ""}
                </p>
                {status.lastRun ? (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    <span><span className="text-general-muted-foreground">Attempts</span> <span className="ml-1 font-medium text-foreground">{formatNumber(status.lastRun.attempted)}</span></span>
                    <span><span className="text-general-muted-foreground">Successful</span> <span className="ml-1 font-medium text-foreground">{formatNumber(status.lastRun.succeeded)}</span></span>
                    <span><span className="text-general-muted-foreground">Rate-limited</span> <span className="ml-1 font-medium text-foreground">{formatNumber(status.lastRun.rateLimitedAttempts)}</span></span>
                    <span><span className="text-general-muted-foreground">Page failures</span> <span className="ml-1 font-medium text-foreground">{formatNumber(status.lastRun.failed)}</span></span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {status?.status === "failed" ? (
            <div className="flex items-start gap-3 rounded-lg border border-general-border bg-white p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-general-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">The latest check did not finish</p>
                <p className="mt-1 text-xs text-general-muted-foreground">Your last known index data is still available. Retry when the connection is ready.</p>
              </div>
            </div>
          ) : null}

          {status?.coverage?.tracked ? (
            <div className="rounded-lg border border-general-border bg-white p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {status.coverage.baselineComplete ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}
                    {status.coverage.baselineComplete
                      ? "Full baseline coverage"
                      : `Building baseline · ${status.coverage.percent}% covered`}
                  </div>
                  <p className="mt-1 text-xs text-general-muted-foreground">
                    {formatNumber(status.coverage.known)} of {formatNumber(status.coverage.tracked)} URLs have a known Google status
                    {status.coverage.pending
                      ? ` · ${formatNumber(status.coverage.pending)} waiting for a first check · about ${status.backlog.estimatedRuns} remaining run${status.backlog.estimatedRuns === 1 ? "" : "s"}`
                      : ` · ${formatNumber(status.freshness.overdue)} overdue`}.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-3 xl:min-w-[700px] xl:grid-cols-5">
                  <div><p className="text-general-muted-foreground">On schedule</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.freshness.withinSla)}</p></div>
                  <div><p className="text-general-muted-foreground">Due backlog</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.backlog.total)} · {status.backlog.estimatedRuns} run{status.backlog.estimatedRuns === 1 ? "" : "s"}</p></div>
                  <div>
                    <p className="text-general-muted-foreground">Today&apos;s coverage target</p>
                    <p className="mt-1 font-medium text-foreground">
                      {status.surveillance
                        ? `${formatNumber(status.surveillance.uniqueCheckedToday)} of ${formatNumber(status.surveillance.dailyUniqueTarget)}`
                        : "Not available"}
                    </p>
                    {status.surveillance ? <p className="mt-0.5 text-[11px] text-general-muted-foreground">unique pages · ~{status.surveillance.estimatedFullCycleDays}-day full cycle</p> : null}
                  </div>
                  <div><p className="text-general-muted-foreground">Quota today</p><p className="mt-1 font-medium text-foreground">{formatNumber(status.quota.attempted)} / {formatNumber(status.quota.limit)}</p>{status.quota.remaining <= 0 ? <p className="mt-0.5 text-[11px] text-general-muted-foreground">Resets {formatDateTime(status.quota.resetAt)}</p> : null}</div>
                  <div><p className="text-general-muted-foreground">Next scheduled run</p><p className="mt-1 font-medium text-foreground">{formatDateTime(status.nextScheduledRun)}</p></div>
                </div>
              </div>
              {!status.coverage.baselineComplete ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-general-border">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, status.coverage.percent)}%` }} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[92px] w-full rounded-lg" />
              ))
            ) : (
              <>
                <StatCard
                  label="Indexed"
                  value={`${summary?.percentIndexed ?? 0}%`}
                  hint={`${formatNumber(summary?.indexedCount)} of ${formatNumber(
                    summary?.totalInspected
                  )} URLs with known status`}
                  accent={getBucketColor("indexed")}
                  partial={!summary?.coverage?.complete}
                />
                <StatCard
                  label="Needs attention"
                  value={formatNumber(summary?.needsAttentionCount)}
                  hint={`${formatNumber(summary?.highImpactAttentionCount)} with search demand`}
                  partial={!summary?.coverage?.complete}
                />
                <StatCard
                  label="Coverage"
                  value={`${summary?.coverage?.percent ?? 0}%`}
                  hint={`${formatNumber(summary?.coverage?.known)} of ${formatNumber(summary?.coverage?.tracked)} tracked`}
                  partial={!summary?.coverage?.complete}
                />
                <StatCard
                  label="Monitoring"
                  value={`${summary?.freshness?.percent ?? 0}%`}
                  hint={`${formatNumber(summary?.freshness?.fresh)} URLs on schedule`}
                  partial={!summary?.coverage?.complete}
                />
              </>
            )}
          </div>

          <SectionCard
            title={chartMode === "status" ? "Index status over time" : "Inspection activity"}
            description={chartMode === "status" ? "Latest known index status of tracked URLs." : "First inspections, due rechecks, adaptive surveillance, changes, and failures."}
          >
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Tabs value={chartMode} onValueChange={(value) => setChartMode(value as "status" | "activity")}>
                  <TabsList className="h-9 rounded-lg p-[3px]">
                    <TabsTrigger value="status" className="h-[29px] text-xs">Index status</TabsTrigger>
                    <TabsTrigger value="activity" className="h-[29px] text-xs">Inspection activity</TabsTrigger>
                  </TabsList>
                </Tabs>
                {!summary?.coverage?.complete ? (
                  <span className="rounded border border-general-border px-2 py-1 text-[11px] text-general-muted-foreground">Partial coverage</span>
                ) : null}
              </div>
              {!summaryQuery.isLoading && status?.totalTracked ? (
                <div className="mb-3 rounded-md border border-general-border bg-foreground-light px-3 py-2 text-xs text-general-muted-foreground">
                  {status.initialCoverageComplete
                    ? `Based on latest known status. ${status.coverageProgress}% of tracked URLs have been inspected; ${formatNumber(status.dueCount)} are due for refresh.`
                    : `Building initial coverage: ${formatNumber(status.inspectedCount)} of ${formatNumber(status.totalTracked)} URLs inspected. Partial dates are not full-site snapshots.`}
                  {` ${formatNumber(status.quotaRemaining)} safe requests remain today.`}
                </div>
              ) : null}
              {summaryQuery.isLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartMode === "activity" ? (
                summary?.activity?.length ? (
                  <>
                    <ChartContainer config={{ firstTime: { label: "First-time", color: "var(--chart-1)" }, dueRechecked: { label: "Due rechecks", color: "var(--chart-2)" }, surveillanceRechecked: { label: "Adaptive surveillance", color: "var(--chart-4)" }, changed: { label: "Changed", color: "var(--chart-3)" }, failed: { label: "Failed", color: "var(--chart-5)" } }} className="h-[280px] w-full">
                      <ComposedChart data={summary.activity} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value) => formatShortDate(value)} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => <div><div>{formatShortDate(value as string)}</div>{!summary.coverage.complete ? <div className="mt-1 font-normal text-general-muted-foreground">Partial coverage</div> : null}</div>} />} />
                        <Bar dataKey="firstTime" stackId="activity" fill="var(--color-firstTime)" />
                        <Bar dataKey="dueRechecked" stackId="activity" fill="var(--color-dueRechecked)" />
                        <Bar dataKey="surveillanceRechecked" stackId="activity" fill="var(--color-surveillanceRechecked)" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="changed" stroke="var(--color-changed)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="failed" stroke="var(--color-failed)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                      </ComposedChart>
                    </ChartContainer>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-general-muted-foreground">
                      <span>Bars: first-time, due rechecks, and adaptive surveillance</span><span>Solid line: changed</span><span>Dashed line: failed</span>
                    </div>
                  </>
                ) : <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No inspection activity in this range.</div>
              ) : activeBuckets.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  No indexing history yet. Data appears after first daily run.
                </div>
              ) : (
                <>
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart data={summary?.series ?? []} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                        tickFormatter={(value) => formatShortDate(value)}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value, payload) => {
                              const point = payload?.[0]?.payload as
                                | IndexingSeriesPoint
                                | undefined
                              return (
                                <div>
                                  <div>{formatShortDate(value as string)}</div>
                                  {point ? (
                                    <div className="mt-1 font-normal text-general-muted-foreground">
                                      {point.isPartial
                                        ? `Partial coverage: ${formatNumber(point.knownCount)} of ${formatNumber(point.trackedCount)} URLs`
                                        : `${formatNumber(point.inspectedToday)} inspected that day · Full known-status coverage`}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            }}
                          />
                        }
                      />
                      {activeBuckets.map((meta, index) => (
                        <Bar
                          key={meta.key}
                          dataKey={meta.key}
                          stackId="index"
                          fill={meta.color}
                          radius={
                            index === activeBuckets.length - 1
                              ? [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                    {activeBuckets.map((meta) => (
                      <span
                        key={meta.key}
                        className="inline-flex items-center gap-1.5 text-xs"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="text-general-muted-foreground">
                          {meta.label}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Priority insights"
            description="Actionable groups ranked by indexing risk and search impact."
          >
            {summaryQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : summary?.insights?.length ? (
              <div className="divide-y divide-general-border">
                {summary.insights.slice(0, 8).map((insight) => (
                  <button
                    key={insight.key}
                    type="button"
                    aria-pressed={issueFilter === insight.key}
                    className={`flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${issueFilter === insight.key ? "bg-muted/50" : ""}`}
                    onClick={() => handleInsightClick(insight.key)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{insight.label}</span>
                        <span className="rounded border border-general-border px-1.5 py-0.5 text-[10px] uppercase text-general-muted-foreground">{insight.severity}</span>
                      </div>
                      <p className="mt-1 text-xs text-general-muted-foreground">{insight.explanation}</p>
                      <p className="mt-1 text-xs font-medium text-foreground">Next: {insight.recommendation}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-right">
                      <div><p className="text-sm font-medium text-foreground">{formatNumber(insight.count)}</p><p className="text-[11px] text-general-muted-foreground">URLs</p></div>
                      <div className="hidden sm:block"><p className="text-sm font-medium text-foreground">{formatNumber(insight.impressions)}</p><p className="text-[11px] text-general-muted-foreground">Impressions</p></div>
                      {issueFilter === insight.key ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground"><CheckCircle2 className="h-4 w-4" /> Viewing</span>
                      ) : <ArrowRight className="h-4 w-4 text-general-muted-foreground" />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-5 w-5 text-general-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">No priority issues detected</p>
                <p className="mt-1 text-xs text-general-muted-foreground">Insights appear as URL coverage and performance data are collected.</p>
              </div>
            )}
          </SectionCard>

          <div ref={pagesSectionRef} className="scroll-mt-36">
            <IndexingPagesTable
              businessId={businessId}
              website={website}
              range={range}
              issueFilter={issueFilter}
              onFiltersChange={handlePageFiltersChange}
              onClearInsight={() => setIssueFilter(null)}
            />
          </div>

          <SectionCard
            title="Recent movements"
            description="Index and technical fields that changed between consecutive inspections."
          >
            {movementsQuery.isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movements?.rows.length ? (
              <div>
                {movementDenominator > 0 ? (
                  <div className="border-b border-general-border bg-foreground-light px-3 py-2 text-xs text-general-muted-foreground">
                    {formatNumber(movements.context.changed)} changes detected among {formatNumber(movementDenominator)} rechecked URLs in the latest run. {formatNumber(movementSuccesses)} total inspections succeeded.
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                <TableElement className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="border-b border-general-border bg-white hover:bg-transparent">
                      <PlainHead label="URL" />
                      <PlainHead label="Change" />
                      <PlainHead label="Detected" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.rows.map((row, index) => (
                      <TableRow
                        key={`${row.page_url}-${row.detected_at}-${index}`}
                        className="h-[36px] border-b border-border/40 transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="max-w-[460px] px-3 py-1.5">
                          <a
                            href={row.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.page_url}
                            className="block truncate text-xs text-blue-500 hover:underline"
                          >
                            {shortUrl(row.page_url)}
                          </a>
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          {row.before_bucket !== row.after_bucket ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge bucket={row.before_bucket} />
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-general-muted-foreground" />
                              <StatusBadge bucket={row.after_bucket} />
                            </div>
                          ) : (
                            <div className="text-xs font-medium capitalize text-foreground">{row.change_type.replaceAll("_", " ")}</div>
                          )}
                          {row.changed_fields ? (
                            <div className="mt-0.5 text-[11px] text-general-muted-foreground">
                              {Object.keys(row.changed_fields).map((field) => field.replaceAll("_", " ")).join(", ")}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-1.5 text-xs text-general-muted-foreground">
                          {formatDateTime(row.detected_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableElement>
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  No movements yet
                </p>
                <p className="text-xs text-general-muted-foreground">
                  Changes are detected once URLs are re-inspected over
                  multiple days.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default IndexingTemplate
