"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, STATUS_ORDER, formatInteger, statusColor } from "@/lib/smart-sitemap"
import type { SmartSitemapStatus } from "@/hooks/use-smart-sitemap"
import { StatusDot } from "./SmartSitemapStatusBadge"

interface SmartSitemapOverviewProps {
  statusCounts: Record<SmartSitemapStatus, number> | null
  selectedStatuses: SmartSitemapStatus[]
  onToggleStatus: (status: SmartSitemapStatus) => void
  /** True while a status change is loading; prevents stacking requests. */
  pending?: boolean
}

function Stat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-general-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[26px] leading-8 font-medium tabular-nums text-general-foreground">{value}</p>
      <p className="text-xs text-general-muted-foreground">{caption}</p>
    </div>
  )
}

/**
 * Site-wide indexing picture for the current search. Counts ignore the status
 * selection, so the bar doubles as the status filter without losing context.
 */
export function SmartSitemapOverview({
  statusCounts,
  selectedStatuses,
  onToggleStatus,
  pending = false,
}: SmartSitemapOverviewProps) {
  if (!statusCounts) {
    return (
      <div className="rounded-lg border border-general-border bg-white p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-2.5 w-full" />
      </div>
    )
  }

  const total = STATUS_ORDER.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0)
  const notIndexed =
    statusCounts.crawled_not_indexed + statusCounts.discovered_not_indexed + statusCounts.error
  const waiting = statusCounts.pending + statusCounts.unknown
  const indexedShare = total ? Math.round((statusCounts.indexed / total) * 100) : null
  const visible = STATUS_ORDER.filter((status) => statusCounts[status] > 0)

  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Known pages" value={formatInteger(total)} caption="From sitemap, crawl, GSC and GA4" />
        <Stat
          label="Indexed"
          value={indexedShare == null ? "–" : `${indexedShare}%`}
          caption={`${formatInteger(statusCounts.indexed)} pages in Google`}
        />
        <Stat label="Not indexed" value={formatInteger(notIndexed)} caption="Crawled, discovered or error" />
        <Stat label="Waiting for a check" value={formatInteger(waiting)} caption="No inspection result yet" />
      </div>

      {total > 0 ? (
        <>
          <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-[4px]" role="group" aria-label="Filter by indexing status">
            {visible.map((status) => {
              const selected = selectedStatuses.includes(status)
              const dimmed = selectedStatuses.length > 0 && !selected
              return (
                <Tooltip key={status}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={pending}
                      aria-pressed={selected}
                      aria-label={`${STATUS_LABELS[status]}: ${formatInteger(statusCounts[status])}`}
                      onClick={() => onToggleStatus(status)}
                      className="min-w-1 cursor-pointer transition-opacity disabled:cursor-wait"
                      style={{
                        flexGrow: statusCounts[status],
                        backgroundColor: statusColor(status),
                        opacity: dimmed ? 0.25 : 1,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {STATUS_LABELS[status]}: {formatInteger(statusCounts[status])}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {visible.map((status) => {
              const selected = selectedStatuses.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  aria-pressed={selected}
                  onClick={() => onToggleStatus(status)}
                  className={cn(
                    "inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-[4px] border px-2 text-xs text-general-secondary-foreground transition-colors disabled:cursor-wait",
                    selected
                      ? "border-general-border-three bg-general-secondary"
                      : "border-transparent hover:bg-general-secondary"
                  )}
                >
                  <StatusDot status={status} className="size-1.5" />
                  {STATUS_LABELS[status]}
                  <span className="tabular-nums text-general-muted-foreground">{formatInteger(statusCounts[status])}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
