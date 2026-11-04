"use client"

import type { MouseEvent, ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { defaultSortOrder } from "@/lib/smart-sitemap"
import type { SmartSitemapSort, SortOrder } from "@/hooks/use-smart-sitemap"
import {
  SITEMAP_ACTION_COLUMN_WIDTH,
  SITEMAP_COLUMNS,
  SITEMAP_GROUP_LABELS,
  SITEMAP_TABLE_MIN_WIDTH,
  type SitemapColumn,
  type SitemapColumnGroup,
} from "./sitemapColumns"

export interface SitemapSortState {
  sortBy: SmartSitemapSort
  sortOrder: SortOrder
}

/** The Page column stays visible while the metrics scroll sideways, so it needs an opaque background. */
const STICKY = "sticky left-0 z-[1]"
const STICKY_CELL = `${STICKY} bg-white group-hover/row:bg-secondary`
const HEADER_BG = "bg-[#FAFAFA]"
const CELL = "h-11 px-3 align-middle"

function SortButton({
  label,
  sortKey,
  align,
  hint,
  sort,
  onSort,
}: {
  label: string
  sortKey?: SmartSitemapSort
  align: "left" | "right"
  hint?: string
  sort: SitemapSortState
  onSort: (next: SitemapSortState) => void
}) {
  const active = sortKey != null && sort.sortBy === sortKey
  const content = sortKey ? (
    <button
      type="button"
      onClick={() =>
        onSort({
          sortBy: sortKey,
          sortOrder: active ? (sort.sortOrder === "asc" ? "desc" : "asc") : defaultSortOrder(sortKey),
        })
      }
      className={cn(
        "group/sort inline-flex h-9 max-w-full items-center gap-1 rounded-[6px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "right" && "flex-row-reverse",
        active ? "text-general-foreground" : "text-general-muted-foreground hover:text-general-foreground"
      )}
    >
      <span className="truncate">{label}</span>
      {active ? (
        sort.sortOrder === "asc" ? (
          <ArrowUp className="size-3.5 shrink-0" strokeWidth={1.5} />
        ) : (
          <ArrowDown className="size-3.5 shrink-0" strokeWidth={1.5} />
        )
      ) : (
        <ChevronsUpDown
          className="size-3.5 shrink-0 text-general-border-three group-hover/sort:text-general-muted-foreground"
          strokeWidth={1.5}
        />
      )}
    </button>
  ) : (
    <span className="inline-flex h-9 items-center text-sm font-medium text-general-muted-foreground">{label}</span>
  )
  if (!hint) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

function ariaSort(column: { sortKey?: SmartSitemapSort }, sort: SitemapSortState) {
  if (!column.sortKey || column.sortKey !== sort.sortBy) return undefined
  return sort.sortOrder === "asc" ? "ascending" : "descending"
}

/** Consecutive columns of the same source share one group label above them. */
function groupSpans(columns: SitemapColumn[]) {
  const spans: Array<{ group?: SitemapColumnGroup; span: number }> = []
  for (const column of columns) {
    const last = spans[spans.length - 1]
    if (last && last.group === column.group) last.span += 1
    else spans.push({ group: column.group, span: 1 })
  }
  return spans
}

interface SitemapTableShellProps {
  pathLabel: string
  sort: SitemapSortState
  onSort: (next: SitemapSortState) => void
  /** Dims the body while a newer response loads; the current rows stay readable. */
  updating?: boolean
  label: string
  children: ReactNode
}

export function SmartSitemapTableShell({ pathLabel, sort, onSort, updating = false, label, children }: SitemapTableShellProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-general-border bg-white">
      <div className="overflow-x-auto">
        <table
          aria-label={label}
          aria-busy={updating}
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: SITEMAP_TABLE_MIN_WIDTH }}
        >
          <colgroup>
            <col />
            {SITEMAP_COLUMNS.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
            <col style={{ width: SITEMAP_ACTION_COLUMN_WIDTH }} />
          </colgroup>
          <thead className={HEADER_BG}>
            <tr className="border-b border-general-border">
              <th className={cn("h-7", STICKY, HEADER_BG)} />
              {groupSpans(SITEMAP_COLUMNS).map(({ group, span }, index) => (
                <th
                  key={`${group ?? "none"}-${index}`}
                  colSpan={span}
                  scope="colgroup"
                  className="h-7 px-3 text-center text-[10px] font-medium uppercase tracking-[0.15px] text-general-muted-foreground"
                >
                  {group ? SITEMAP_GROUP_LABELS[group] : null}
                </th>
              ))}
              <th />
            </tr>
            <tr className="border-b border-general-border">
              <th
                scope="col"
                aria-sort={ariaSort({ sortKey: "path" }, sort)}
                className={cn("px-3 text-left", STICKY, HEADER_BG)}
              >
                <SortButton label={pathLabel} sortKey="path" align="left" sort={sort} onSort={onSort} />
              </th>
              {SITEMAP_COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort(column, sort)}
                  className={cn("px-3", column.align === "right" ? "text-right" : "text-left")}
                >
                  <SortButton
                    label={column.label}
                    sortKey={column.sortKey}
                    align={column.align}
                    hint={column.hint}
                    sort={sort}
                    onSort={onSort}
                  />
                </th>
              ))}
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody className={cn("transition-opacity", updating && "opacity-60")}>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

interface SitemapRowProps {
  /** Page column content: link, indent, toggle. */
  lead: ReactNode
  cells: ReactNode[]
  trailing?: ReactNode
  /**
   * Pointer shortcut for the whole row. Keyboard users reach the same action through the link or
   * button in `lead`, and clicks on inner links, buttons or tooltips keep their own behavior.
   */
  onActivate?: () => void
  className?: string
  "aria-level"?: number
}

export function SmartSitemapRow({ lead, cells, trailing, onActivate, className, ...aria }: SitemapRowProps) {
  const fromControl = (target: EventTarget) => target instanceof Element && Boolean(target.closest("a, button"))
  return (
    <tr
      {...aria}
      onClick={(event: MouseEvent<HTMLTableRowElement>) => {
        if (onActivate && !fromControl(event.target) && !window.getSelection()?.toString()) onActivate()
      }}
      className={cn(
        "group/row border-b border-general-border last:border-b-0 transition-colors hover:bg-secondary",
        onActivate && "cursor-pointer",
        className
      )}
    >
      <td className={cn(CELL, STICKY_CELL)}>{lead}</td>
      {SITEMAP_COLUMNS.map((column, index) => (
        <td key={column.id} className={cn(CELL, "overflow-hidden", column.align === "right" ? "text-right" : "text-left")}>
          {cells[index]}
        </td>
      ))}
      <td className={cn(CELL, "px-2 text-general-border-three")}>{trailing}</td>
    </tr>
  )
}

/** A full-width row inside the table for inline states (loading more, errors, empty folders). */
export function SmartSitemapMessageRow({ children, indent = 0 }: { children: ReactNode; indent?: number }) {
  return (
    <tr className="border-b border-general-border last:border-b-0">
      <td colSpan={SITEMAP_COLUMNS.length + 2} className="h-11 px-3">
        <div className="sticky left-3 flex w-fit items-center gap-2 text-sm" style={{ paddingLeft: indent }}>
          {children}
        </div>
      </td>
    </tr>
  )
}

export function SmartSitemapSkeletonRows({ count, indent = 0 }: { count: number; indent?: number }) {
  return Array.from({ length: count }, (_, index) => (
    <tr key={index} className="border-b border-general-border last:border-b-0" aria-hidden="true">
      <td className={cn(CELL, STICKY, "bg-white")}>
        <div style={{ paddingLeft: indent }}>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </td>
      {SITEMAP_COLUMNS.map((column) => (
        <td key={column.id} className={CELL}>
          <Skeleton className={cn("h-4", column.align === "right" ? "ml-auto w-10" : "w-24")} />
        </td>
      ))}
      <td className={CELL} />
    </tr>
  ))
}
