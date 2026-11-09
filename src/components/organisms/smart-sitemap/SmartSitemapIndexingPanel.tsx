"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { TruncatedText } from "@/components/molecules/TruncatedText"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EMPTY_VALUE, formatDay, statusColor, statusLabel } from "@/lib/smart-sitemap"
import type {
  IndexingHistoryEvent,
  IndexingSummary,
  IndexingVariant,
  InspectionFreshness,
  SmartSitemapPageIndexingResult,
} from "@/hooks/use-smart-sitemap"
import { SmartSitemapPanel } from "./SmartSitemapPanel"
import { SmartSitemapStatusBadge } from "./SmartSitemapStatusBadge"

const FRESHNESS: Record<InspectionFreshness, { label: string; tone: string }> = {
  fresh: { label: "Fresh", tone: "text-green-600" },
  due: { label: "Due for a check", tone: "text-amber-600" },
  overdue: { label: "Overdue", tone: "text-red-600" },
  pending: { label: "Not checked yet", tone: "text-general-muted-foreground" },
  not_monitored: { label: "Not monitored", tone: "text-general-muted-foreground" },
  unknown: { label: "Unknown", tone: "text-general-muted-foreground" },
}

const CANONICAL_STATES = {
  match: {
    label: "Google agrees",
    tone: "text-green-600",
    description: "Google uses the same canonical URL your page declares, so this is the version it indexes and shows in search.",
  },
  mismatch: {
    label: "Google chose a different URL",
    tone: "text-amber-600",
    description:
      "Google ignored the declared canonical and treats another URL as the main version, so this URL is usually not indexed. Check for duplicate content, redirects, or internal links pointing elsewhere.",
  },
  undeclared: {
    label: "Not declared",
    tone: "text-general-muted-foreground",
    description: "The page has no canonical tag, so Google picked the main version on its own. Add a canonical tag to make your choice explicit.",
  },
} as const

function formatDateTime(value: string | null | undefined): string {
  return value ? formatDay(value, "MMM d, yyyy, h:mm a") : EMPTY_VALUE
}

function urlPath(value: string): string {
  try {
    const url = new URL(value)
    return `${url.pathname}${url.search}`
  } catch {
    return value
  }
}

function humanize(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE
  const spaced = value.replace(/_/g, " ").toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function primaryVariant(current: IndexingSummary, variants: IndexingVariant[]): IndexingVariant | null {
  return variants.find((variant) => variant.pageUrl === current.primaryPageUrl) ?? variants[0] ?? null
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
          <dt className="whitespace-nowrap text-general-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-right text-general-foreground">
            <TruncatedText text={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function LatestInspection({ variant, showUrl }: { variant: IndexingVariant | null; showUrl: boolean }) {
  const inspection = variant?.latestInspection ?? null
  const freshness = FRESHNESS[variant?.inspectionFreshness ?? "unknown"]
  const canonicalState = !inspection?.googleCanonical
    ? null
    : !inspection.userCanonical
      ? CANONICAL_STATES.undeclared
      : inspection.userCanonical === inspection.googleCanonical
        ? CANONICAL_STATES.match
        : CANONICAL_STATES.mismatch

  return (
    <SmartSitemapPanel
      title="Latest inspection"
      trailing={<SmartSitemapStatusBadge status={variant?.status ?? "unknown"} reason={variant?.coverageState} />}
    >
      <div className="space-y-4">
        {showUrl && variant ? (
          <TruncatedText text={variant.pageUrl} className="text-[13px] text-general-muted-foreground" />
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-[8px] bg-general-primary-foreground p-3">
            <p className="text-xs text-general-muted-foreground">Last checked</p>
            <p className="mt-0.5 text-sm font-medium text-general-foreground">
              {variant?.lastInspectedAt
                ? formatDateTime(variant.lastInspectedAt)
                : variant?.inspectionDate
                  ? `${formatDay(variant.inspectionDate)} (daily snapshot)`
                  : "Not checked yet"}
            </p>
            <p className={cn("mt-0.5 text-xs", freshness.tone)}>{freshness.label}</p>
          </div>
          <div className="rounded-[8px] bg-general-primary-foreground p-3">
            <p className="text-xs text-general-muted-foreground">Next check</p>
            <p className="mt-0.5 text-sm font-medium text-general-foreground">
              {!variant?.monitoringEnabled
                ? "Not scheduled"
                : variant.nextInspectionAt
                  ? `From ${formatDateTime(variant.nextInspectionAt)}`
                  : "Not scheduled yet"}
            </p>
          </div>
        </div>

        {inspection ? (
          <>
            <DetailRows
              rows={[
                ["Coverage", inspection.coverageState || EMPTY_VALUE],
                ["Verdict", humanize(inspection.verdict)],
                ["Page fetch", humanize(inspection.pageFetchState)],
                ["robots.txt", humanize(inspection.robotsTxtState)],
                ["Indexing", humanize(inspection.indexingState)],
                ["Crawled as", humanize(inspection.crawledAs)],
                ["Last Google crawl", formatDateTime(inspection.lastCrawlAt)],
                ["Sitemap", inspection.sitemaps.length ? inspection.sitemaps.map(urlPath).join(", ") : "Not reported"],
              ]}
            />
            {inspection.userCanonical || inspection.googleCanonical ? (
              <div className="rounded-[8px] border border-general-border p-3">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-general-foreground">Canonical</span>
                  {canonicalState ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("cursor-default text-xs", canonicalState.tone)}>{canonicalState.label}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        {canonicalState.description}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                <p className="break-all text-xs leading-[18px] text-general-muted-foreground">
                  Declared: {inspection.userCanonical || "None"}
                  <br />
                  Google: {inspection.googleCanonical || "Not reported"}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-general-muted-foreground">
            Google has not inspected this URL yet. Details appear after the first check.
          </p>
        )}
      </div>
    </SmartSitemapPanel>
  )
}

function Variants({ variants, primaryPageUrl }: { variants: IndexingVariant[]; primaryPageUrl: string | null }) {
  return (
    <SmartSitemapPanel title="URL variants">
      {variants.length ? (
        <ul className="space-y-2">
          {variants.map((variant) => {
            const aliases = variant.storedPageUrls.filter((url) => url !== variant.pageUrl)
            return (
              <li key={variant.pageUrl} className="rounded-[8px] border border-general-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <TruncatedText text={variant.pageUrl} className="flex-1 text-[13px] text-general-foreground" />
                  <SmartSitemapStatusBadge status={variant.status} reason={variant.coverageState} />
                </div>
                <p className="mt-1.5 text-xs text-general-muted-foreground">
                  {variants.length > 1 && variant.pageUrl === primaryPageUrl ? "Main URL · " : null}
                  {variant.lastInspectedAt ? `Checked ${formatDateTime(variant.lastInspectedAt)}` : "No registry check yet"}
                  {" · "}
                  {FRESHNESS[variant.inspectionFreshness].label}
                </p>
                {aliases.length ? (
                  <p className="mt-1 break-all text-xs text-general-muted-foreground">
                    Also seen as {aliases.map(urlPath).join(", ")}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-general-muted-foreground">
          This page is not tracked for indexing yet. It is added once it appears in the sitemap or Search Console.
        </p>
      )}
    </SmartSitemapPanel>
  )
}

function eventTitle(event: IndexingHistoryEvent): string {
  if (event.eventType === "indexing_change") {
    return event.beforeStatus
      ? `${statusLabel(event.beforeStatus)} to ${statusLabel(event.afterStatus)}`
      : `First seen as ${statusLabel(event.afterStatus)}`
  }
  return statusLabel(event.status)
}

function eventDetail(event: IndexingHistoryEvent, showUrl: boolean): string {
  const parts =
    event.eventType === "indexing_change"
      ? [humanize(event.changeType), event.afterState || null]
      : ["Daily snapshot", event.coverageState]
  if (showUrl) parts.push(urlPath(event.pageUrl))
  return parts.filter(Boolean).join(" · ")
}

interface HistoryProps {
  events: IndexingHistoryEvent[]
  showUrl: boolean
  hasNextPage: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

function History({ events, showUrl, hasNextPage, loadingMore, onLoadMore }: HistoryProps) {
  return (
    <SmartSitemapPanel title="History">
      {events.length ? (
        <ol>
          {events.map((event, index) => {
            const last = index === events.length - 1
            const tone = statusColor(event.eventType === "indexing_change" ? event.afterStatus : event.status)
            return (
              <li key={`${event.eventType}-${event.eventKey}`} className="grid grid-cols-[56px_16px_minmax(0,1fr)] gap-2.5">
                <span className="pt-px text-xs tabular-nums text-general-muted-foreground">
                  {formatDay(event.recordedAt, "MMM d")}
                </span>
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className="mt-[3px] size-2.5 shrink-0 rounded-full border-2"
                    style={{
                      borderColor: tone,
                      backgroundColor: event.eventType === "indexing_change" ? tone : "white",
                    }}
                  />
                  {!last ? <span className="min-h-5 w-px flex-1 bg-general-border" /> : null}
                </div>
                <div className={cn("min-w-0", !last && "pb-3.5")}>
                  <p className="text-[13px] font-medium text-general-foreground">{eventTitle(event)}</p>
                  <TruncatedText text={eventDetail(event, showUrl)} className="text-xs text-general-muted-foreground" />
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-sm text-general-muted-foreground">
          No indexing events in this period.
        </p>
      )}
      {hasNextPage ? (
        <Button variant="ghost" size="sm" className="mt-3 h-7 gap-1.5 px-2 text-xs" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {loadingMore ? "Loading" : "Load older history"}
        </Button>
      ) : null}
    </SmartSitemapPanel>
  )
}

interface SmartSitemapIndexingPanelProps {
  pages: SmartSitemapPageIndexingResult[] | undefined
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  hasNextPage: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRetry: () => void
}

export function SmartSitemapIndexingPanel({
  pages,
  isLoading,
  isError,
  isRefetching,
  hasNextPage,
  loadingMore,
  onLoadMore,
  onRetry,
}: SmartSitemapIndexingPanelProps) {
  if (isError && !pages?.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-general-border bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-general-foreground">Indexing details could not be loaded</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} disabled={isRefetching}>
          {isRefetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Try again
        </Button>
      </div>
    )
  }
  if (isLoading || !pages?.length) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="h-[320px] w-full rounded-lg" />
          <Skeleton className="h-[120px] w-full rounded-lg" />
        </div>
        <Skeleton className="h-[360px] w-full rounded-lg lg:col-span-2" />
      </div>
    )
  }

  const first = pages[0]
  const events = pages.flatMap((page) => page.history)
  const primary = primaryVariant(first.current, first.variants)
  const variants = primary ? [primary, ...first.variants.filter((variant) => variant !== primary)] : first.variants

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
      <div className="min-w-0 space-y-4 lg:col-span-3">
        <LatestInspection variant={primary} showUrl={first.variants.length > 1} />
        <Variants variants={variants} primaryPageUrl={primary?.pageUrl ?? null} />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <History
          events={events}
          showUrl={first.variants.length > 1}
          hasNextPage={hasNextPage}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  )
}
