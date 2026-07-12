"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { ArrowRight, Loader2, RefreshCw } from "lucide-react"
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

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <p className="text-xs font-medium text-general-muted-foreground">{label}</p>
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
  const [confirmOpen, setConfirmOpen] = useState(false)

  const status = statusQuery.data
  const summary = summaryQuery.data
  const movements = movementsQuery.data
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
  const quotaUnavailable = Boolean(status && status.quotaRemaining <= 0)
  const triggerDisabled = ingestionActive || triggerIndexing.isPending || quotaUnavailable

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
        <div className="flex w-full max-w-[1224px] items-center justify-between gap-4 px-7 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Indexing</h1>
            <p className="text-xs text-general-muted-foreground">
              Latest known Google index status, monitored incrementally each day.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-9 w-[160px] bg-white">
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

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  className="h-9"
                  disabled={triggerDisabled}
                  title={
                    ingestionActive
                      ? "An indexing run is already in progress"
                      : quotaUnavailable
                        ? "Today’s safe inspection quota is used; monitoring resumes tomorrow"
                        : undefined
                  }
                >
                  {triggerDisabled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {ingestionActive
                    ? "Indexing..."
                    : hasRunBefore
                      ? "Re-run indexing"
                      : "Start indexing"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {hasRunBefore
                      ? "Re-run indexing for this site?"
                      : "Start indexing this site?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    We&apos;ll inspect the highest-priority URLs that are due and
                    update their latest known Google status. Large sites rotate
                    through URLs over multiple days within the property quota.
                    {status
                      ? ` ${formatNumber(status.quotaRemaining)} of ${formatNumber(status.quotaLimit)} safe requests remain today.`
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
                    Start indexing
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full max-w-[1224px] flex-col gap-3 px-7 py-6">
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                  )} URLs`}
                  accent={getBucketColor("indexed")}
                />
                <StatCard
                  label="Not indexed"
                  value={formatNumber(summary?.notIndexedCount)}
                  hint="Crawled / discovered / excluded"
                />
                <StatCard
                  label="URLs inspected"
                  value={formatNumber(summary?.totalInspected)}
                  hint={
                    summary?.lastSnapshot
                      ? `Last snapshot ${formatShortDate(summary.lastSnapshot)}`
                      : "Awaiting first run"
                  }
                />
                <StatCard
                  label="Tracked URLs"
                  value={formatNumber(status?.totalTracked)}
                  hint={`${formatNumber(status?.pendingCount)} pending inspection`}
                />
              </>
            )}
          </div>

          <SectionCard
            title="Index status over time"
            description="Latest known index status of tracked URLs."
          >
            <div className="p-3">
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
                                        : `${formatNumber(point.inspectedToday)} inspected that day · ${formatNumber(point.freshCount)} fresh`}
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

          <IndexingPagesTable
            businessId={businessId}
            website={website}
            range={range}
          />

          <SectionCard
            title="Recent movements"
            description="URLs whose status changed between consecutive inspections."
          >
            {movementsQuery.isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movements?.rows.length ? (
              <div className="overflow-x-auto">
                <TableElement className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="border-b border-[#A3A3A3] bg-white hover:bg-transparent">
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
                          <div className="flex items-center gap-2">
                            <StatusBadge bucket={row.before_bucket} />
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-general-muted-foreground" />
                            <StatusBadge bucket={row.after_bucket} />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-1.5 text-xs text-general-muted-foreground">
                          {formatDateTime(row.detected_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableElement>
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  No movements yet
                </p>
                <p className="text-xs text-general-muted-foreground">
                  Status changes are detected once URLs re-inspected over
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
