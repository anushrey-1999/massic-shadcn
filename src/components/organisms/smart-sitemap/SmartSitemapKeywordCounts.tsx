"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSmartSitemapKeywordCounts } from "@/hooks/use-smart-sitemap"
import { EMPTY_VALUE, formatCompact } from "@/lib/smart-sitemap"
import type { TimePeriodValue } from "@/utils/analytics-period"
import { SmartSitemapMetricCell } from "./SmartSitemapCells"

interface KeywordCountsValue {
  counts: Record<string, number> | undefined
  /** Stays true while a retry runs, until a request succeeds. */
  failed: boolean
  retrying: boolean
  retry: () => void
}

const KeywordCountsContext = createContext<KeywordCountsValue | null>(null)

interface SmartSitemapKeywordCountsProps {
  businessId: string
  period: TimePeriodValue
  pageIds: readonly string[]
  /** False while the rows themselves are placeholders, so counts load for the settled rows only. */
  enabled: boolean
  children: ReactNode
}

/** Loads keyword counts for one batch of rendered rows after the rows themselves load. */
export function SmartSitemapKeywordCounts({ businessId, period, pageIds, enabled, children }: SmartSitemapKeywordCountsProps) {
  const query = useSmartSitemapKeywordCounts(businessId, period, pageIds, { enabled })
  const { data, isError, isFetching, refetch } = query
  const value = useMemo<KeywordCountsValue>(
    () => ({
      counts: data?.counts,
      failed: isError,
      retrying: isFetching,
      retry: () => {
        if (!isFetching) refetch()
      },
    }),
    [data, isError, isFetching, refetch]
  )
  return <KeywordCountsContext.Provider value={value}>{children}</KeywordCountsContext.Provider>
}

export function SmartSitemapKeywordCountCell({ pageId }: { pageId: string }) {
  const value = useContext(KeywordCountsContext)
  if (!value) return <SmartSitemapMetricCell value={EMPTY_VALUE} />
  if (value.counts) return <SmartSitemapMetricCell value={formatCompact(value.counts[pageId] ?? null)} muted />
  if (value.failed && !value.retrying) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block cursor-default">
            <SmartSitemapMetricCell value={EMPTY_VALUE} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Keyword count could not be loaded</TooltipContent>
      </Tooltip>
    )
  }
  return <Skeleton className="ml-auto h-4 w-8" aria-label="Loading keyword count" />
}

/** Retry notice for a failed batch; renders nothing otherwise. Place inside the provider. */
export function SmartSitemapKeywordCountsNotice() {
  const value = useContext(KeywordCountsContext)
  if (!value?.failed || value.counts) return null
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white px-4 py-2.5 text-sm">
      <span className="text-general-muted-foreground">Keyword counts could not be loaded.</span>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={value.retry} disabled={value.retrying}>
        {value.retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Try again
      </Button>
    </div>
  )
}
