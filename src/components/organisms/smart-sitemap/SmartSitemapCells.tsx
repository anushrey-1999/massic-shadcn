import type { ReactElement } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  EMPTY_VALUE,
  STATUS_LABELS,
  STATUS_ORDER,
  decodePath,
  discoverySources,
  formatInteger,
  statusColor,
  statusLabel,
} from "@/lib/smart-sitemap"
import type { FolderIndexing, IndexingSummary } from "@/hooks/use-smart-sitemap"
import { StatusDot, StatusReasonTooltip } from "./SmartSitemapStatusBadge"

/**
 * Hover card for a Page column entry: the full decoded path plus a few facts.
 * The delay keeps tooltips from flashing while the pointer moves down the rows.
 */
export function SmartSitemapPathTooltip({
  path,
  details,
  action,
  children,
}: {
  path: string
  details?: Array<string | null>
  action?: string
  children: ReactElement
}) {
  const lines = (details ?? []).filter((line): line is string => Boolean(line))
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[420px] space-y-1 text-left text-xs">
        <p className="break-all font-medium">{decodePath(path)}</p>
        {lines.length ? <p className="opacity-70">{lines.join(" · ")}</p> : null}
        {action ? <p className="opacity-70">{action}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
}

/** Path with the folder part muted and the last segment emphasized. */
export function SmartSitemapPathCell({ path, className }: { path: string; className?: string }) {
  const text = decodePath(path)
  const slash = text.lastIndexOf("/")
  const folder = slash > 0 ? text.slice(0, slash + 1) : ""
  const leaf = slash > 0 ? text.slice(slash + 1) : text
  return (
    <span className={cn("flex min-w-0 items-baseline text-sm", className)}>
      {folder ? <span className="min-w-0 shrink truncate text-general-muted-foreground">{folder}</span> : null}
      <span className="max-w-full shrink-0 truncate font-medium text-general-foreground">{leaf}</span>
    </span>
  )
}

export function SmartSitemapMetricCell({ value, muted = false }: { value: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "block text-right text-sm tabular-nums",
        value === EMPTY_VALUE
          ? "text-general-border-three"
          : muted
            ? "text-general-unofficial-foreground-alt"
            : "text-general-foreground"
      )}
    >
      {value}
    </span>
  )
}

export function SmartSitemapStatusCell({ indexing }: { indexing: IndexingSummary }) {
  return (
    <StatusReasonTooltip status={indexing.status} reason={indexing.coverageState}>
      <span className="inline-flex min-w-0 max-w-full items-center gap-2 text-sm text-general-secondary-foreground">
        <StatusDot status={indexing.status} />
        <span className="truncate">{statusLabel(indexing.status)}</span>
      </span>
    </StatusReasonTooltip>
  )
}

/** Discovery sources as neutral tags; `compact` uses short names for table cells. */
export function SmartSitemapSourceTags({
  sources,
  compact = false,
  className,
}: {
  sources: readonly string[]
  compact?: boolean
  className?: string
}) {
  const items = discoverySources(sources)
  if (!items.length) return <span className="text-sm text-general-border-three">{EMPTY_VALUE}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex min-w-0 max-w-full cursor-default items-center gap-1",
            compact ? "flex-nowrap overflow-hidden" : "flex-wrap",
            className
          )}
          aria-label={`Found in ${items.map((item) => item.label).join(", ")}`}
        >
          {items.map((item) => (
            <span
              key={item.id}
              className={cn(
                "inline-flex shrink-0 items-center rounded-[4px] border border-general-border bg-white px-1.5 text-xs font-medium text-general-unofficial-foreground-alt",
                compact ? "h-[19px]" : "h-6 px-2"
              )}
            >
              {compact ? item.short : item.label}
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="mb-0.5 font-medium">Where we found this page</p>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              {item.label}: {item.hint}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

/** Folder indexing at a glance: a stacked bar by status and the indexed share. */
export function SmartSitemapStatusMix({ indexing, pageCount }: { indexing: FolderIndexing; pageCount: number }) {
  const present = STATUS_ORDER.filter((status) => (indexing.statusCounts[status] ?? 0) > 0)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex min-w-0 max-w-full cursor-default items-center gap-2">
          <span className="flex h-1.5 w-14 shrink-0 gap-px overflow-hidden rounded-[4px] bg-secondary" aria-hidden="true">
            {present.map((status) => (
              <span
                key={status}
                className="min-w-0.5"
                style={{ flexGrow: indexing.statusCounts[status], backgroundColor: statusColor(status) }}
              />
            ))}
          </span>
          <span className="truncate text-xs tabular-nums text-general-unofficial-foreground-alt">
            {formatInteger(indexing.indexedCount)}/{formatInteger(pageCount)} indexed
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <ul className="space-y-0.5">
          {present.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <StatusDot status={status} className="size-1.5" />
              <span className="flex-1">{STATUS_LABELS[status]}</span>
              <span className="tabular-nums">{formatInteger(indexing.statusCounts[status])}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
