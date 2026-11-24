"use client"

import { ListFilter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  PAGE_CHECK_FILTER_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  formatInteger,
} from "@/lib/smart-sitemap"
import {
  PAGE_CHECK_FILTERS,
  type PageCheckFilter,
  type SmartSitemapStatus,
} from "@/hooks/use-smart-sitemap"
import { StatusDot } from "./SmartSitemapStatusBadge"

interface SmartSitemapFiltersProps {
  indexingStatuses: SmartSitemapStatus[]
  pageStatuses: PageCheckFilter[]
  /** Indexing counts for the current results; omitted while loading. */
  statusCounts: Record<SmartSitemapStatus, number> | null
  onToggleIndexing: (status: SmartSitemapStatus) => void
  onTogglePageStatus: (status: PageCheckFilter) => void
  onReset: () => void
}

function FilterOption({
  checked,
  onToggle,
  label,
  hint,
  dot,
  count,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  hint?: string
  dot?: SmartSitemapStatus
  count?: number
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[6px] px-2 py-1.5 hover:bg-general-secondary">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-sm text-general-foreground">
          {dot ? <StatusDot status={dot} className="size-1.5" /> : null}
          {label}
        </span>
        {hint ? <span className="text-xs text-general-muted-foreground">{hint}</span> : null}
      </span>
      {count != null ? (
        <span className="text-xs tabular-nums text-general-muted-foreground">{formatInteger(count)}</span>
      ) : null}
    </label>
  )
}

export function SmartSitemapFilters({
  indexingStatuses,
  pageStatuses,
  statusCounts,
  onToggleIndexing,
  onTogglePageStatus,
  onReset,
}: SmartSitemapFiltersProps) {
  const activeCount = indexingStatuses.length + pageStatuses.length
  const selectedIndexing = new Set(indexingStatuses)
  const selectedPage = new Set(pageStatuses)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={activeCount ? `Filters, ${activeCount} applied` : "Filters"}
          className={cn("h-9 bg-white font-normal", activeCount ? "gap-1.5 px-2.5" : "w-9 p-0")}
        >
          <ListFilter className="size-4 text-general-muted-foreground" strokeWidth={1.5} />
          {activeCount ? (
            <Badge variant="secondary" className="h-[18px] rounded-[4px] px-1.5 font-normal text-[11px] tabular-nums">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[min(560px,var(--radix-popover-content-available-height))] w-[320px] flex-col gap-3 overflow-y-auto p-3"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <h4 className="text-sm font-medium text-general-foreground">
            {activeCount ? "Filters" : "No filters applied"}
          </h4>
          {activeCount ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReset}>
              Clear all
            </Button>
          ) : null}
        </div>

        <section className="space-y-1">
          <p className="px-1 text-xs font-medium text-general-muted-foreground">Page status</p>
          {PAGE_CHECK_FILTERS.map((status) => (
            <FilterOption
              key={status}
              checked={selectedPage.has(status)}
              onToggle={() => onTogglePageStatus(status)}
              label={PAGE_CHECK_FILTER_LABELS[status].label}
              hint={PAGE_CHECK_FILTER_LABELS[status].hint}
            />
          ))}
        </section>

        <section className="space-y-1 border-t border-general-border pt-3">
          <p className="px-1 text-xs font-medium text-general-muted-foreground">Indexing</p>
          {STATUS_ORDER.map((status) => (
            <FilterOption
              key={status}
              checked={selectedIndexing.has(status)}
              onToggle={() => onToggleIndexing(status)}
              label={STATUS_LABELS[status]}
              dot={status}
              count={statusCounts?.[status]}
            />
          ))}
        </section>
      </PopoverContent>
    </Popover>
  )
}
