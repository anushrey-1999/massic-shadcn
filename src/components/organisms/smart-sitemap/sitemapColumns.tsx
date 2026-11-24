import type { ReactNode } from "react"
import { EMPTY_VALUE, formatCompact, formatPercent, formatPosition } from "@/lib/smart-sitemap"
import type { SitemapRollup, SmartSitemapListPage, SmartSitemapSort } from "@/hooks/use-smart-sitemap"
import {
  SmartSitemapMetricCell,
  SmartSitemapPageCheckCell,
  SmartSitemapSourceTags,
  SmartSitemapStatusCell,
  SmartSitemapStatusMix,
} from "./SmartSitemapCells"
import { SmartSitemapKeywordCountCell } from "./SmartSitemapKeywordCounts"

export interface SitemapColumn {
  id: string
  label: string
  sortKey?: SmartSitemapSort
  align: "left" | "right"
  /** Pixel width in the fixed table layout. */
  width: number
  hint?: string
  page: (row: SmartSitemapListPage) => ReactNode
  /** Folder rows in the tree; folders carry rolled-up totals. */
  folder: (node: SitemapRollup) => ReactNode
}

/** Width of the leading Page column; it takes the remaining space above this minimum. */
export const SITEMAP_PATH_COLUMN_WIDTH = 280

type MetricSource = Pick<SitemapRollup, "gsc" | "ga4">

function metricColumn(
  column: Omit<SitemapColumn, "page" | "folder">,
  value: (item: MetricSource) => string,
  muted = false
): SitemapColumn {
  const cell = (item: MetricSource) => <SmartSitemapMetricCell value={value(item)} muted={muted} />
  return { ...column, page: cell, folder: cell }
}

/** Every column after Page, in display order. Both the table and the tree render from this list. */
export const SITEMAP_COLUMNS: SitemapColumn[] = [
  {
    id: "status",
    label: "Indexing",
    sortKey: "indexing.status",
    align: "left",
    width: 124,
    hint: "Latest Google state. Sorting puts problems first.",
    page: (row) => <SmartSitemapStatusCell indexing={row.indexing} />,
    folder: (node) => <SmartSitemapStatusMix indexing={node.indexing} pageCount={node.pageCount} />,
  },
  {
    id: "pageCheck",
    label: "Page status",
    align: "left",
    width: 128,
    hint: "HTTP status from Massic's latest live check of the page.",
    page: (row) => <SmartSitemapPageCheckCell check={row.pageCheck} path={row.path} />,
    folder: () => <span className="text-sm text-general-border-three">{EMPTY_VALUE}</span>,
  },
  metricColumn(
    { id: "clicks", label: "Clicks", sortKey: "gsc.clicks", align: "right", width: 88, hint: "Search Console" },
    (item) => formatCompact(item.gsc?.clicks)
  ),
  metricColumn(
    { id: "impressions", label: "Impressions", sortKey: "gsc.impressions", align: "right", width: 112, hint: "Search Console" },
    (item) => formatCompact(item.gsc?.impressions),
    true
  ),
  metricColumn(
    { id: "ctr", label: "CTR", sortKey: "gsc.ctr", align: "right", width: 76, hint: "Search Console" },
    (item) => formatPercent(item.gsc?.ctr),
    true
  ),
  metricColumn(
    {
      id: "position",
      label: "Avg. pos.",
      sortKey: "gsc.position",
      align: "right",
      width: 96,
      hint: "Search Console. Impression-weighted average position; lower is better.",
    },
    (item) => formatPosition(item.gsc?.position),
    true
  ),
  metricColumn(
    { id: "sessions", label: "Sessions", sortKey: "ga4.sessions", align: "right", width: 96, hint: "Google Analytics" },
    (item) => formatCompact(item.ga4?.sessions)
  ),
  metricColumn(
    { id: "keyEvents", label: "Key events", sortKey: "ga4.keyEvents", align: "right", width: 104, hint: "Google Analytics" },
    (item) => formatCompact(item.ga4?.keyEvents),
    true
  ),
  {
    id: "sources",
    label: "Found in",
    align: "left",
    width: 184,
    hint: "Where site discovery found the page: XML sitemap, Search Console or GA4.",
    page: (row) => <SmartSitemapSourceTags sources={row.sources} compact />,
    folder: () => <SmartSitemapSourceTags sources={[]} />,
  },
  {
    id: "keywords",
    label: "Keywords",
    align: "right",
    width: 96,
    hint: "Distinct Search Console queries for the page. Not totaled for folders.",
    page: (row) => <SmartSitemapKeywordCountCell pageId={row.id} />,
    folder: () => <SmartSitemapMetricCell value={formatCompact(null)} />,
  },
]

/** Trailing chevron column. */
export const SITEMAP_ACTION_COLUMN_WIDTH = 40

export function sitemapTableMinWidth(columns: SitemapColumn[]): number {
  return SITEMAP_PATH_COLUMN_WIDTH + SITEMAP_ACTION_COLUMN_WIDTH + columns.reduce((sum, column) => sum + column.width, 0)
}
