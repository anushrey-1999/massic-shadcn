import type { IndexingPageRow } from "@/hooks/use-gsc-indexing"
import { getBucketLabel } from "@/lib/gsc-index-bucket"

export type IndexingSortKey =
  | "page"
  | "status"
  | "clicks"
  | "impressions"
  | "last_crawl"
  | "last_inspected"
  | "rich_results"
  | "freshness"

export type IndexingSortDir = "asc" | "desc"

export type IndexingTab = "all" | "indexed" | "not_indexed" | "needs_attention"

export const NOT_INDEXED_BUCKETS = [
  "crawled_not_indexed",
  "discovered_not_indexed",
  "unknown",
  "excluded",
  "error",
  "other",
]

const RICH_RESULT_LABELS: Record<string, string> = {
  breadcrumbs: "Breadcrumbs",
  breadcrumb: "Breadcrumbs",
  product: "Product snippets",
  products: "Product snippets",
  product_snippets: "Product snippets",
  merchant_listings: "Merchant listings",
  review_snippets: "Review snippets",
  sitelinks_searchbox: "Sitelinks searchbox",
  faq: "FAQ",
  howto: "How-to",
  video: "Video",
  article: "Article",
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "0"
  return new Intl.NumberFormat("en-US").format(value)
}

export function shortUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}`
    return path === "/" ? "/" : path
  } catch {
    return url
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatAbsoluteDate(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return "-"
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function formatShortDate(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return "-"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return "-"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatRelativeDate(
  value: string | null | undefined,
  now: Date = new Date()
): string {
  const date = parseDate(value)
  if (!date) return "Not available"
  const diffMs = startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 30) return `${diffDays} days ago`
  const months = Math.floor(diffDays / 30)
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? "1 year ago" : `${years} years ago`
}

function normalizeRichResultLabel(value: unknown): string | null {
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null
  const key = raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
  return RICH_RESULT_LABELS[key] || raw.replace(/_/g, " ")
}

function parseRichResultsItems(items: unknown): unknown[] {
  if (!items) return []
  if (Array.isArray(items)) return items
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function getRichResultSummary(
  verdict: string | null | undefined,
  items: unknown
): { label: string; tone: "ok" | "fail" | "none"; items: string[] } {
  const normalizedVerdict = String(verdict || "").toUpperCase()
  const labels = parseRichResultsItems(items)
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      return normalizeRichResultLabel(
        record.richResultType ||
          record.type ||
          record.name ||
          record.itemType ||
          record.detectedType
      )
    })
    .filter((label): label is string => Boolean(label))

  const uniqueLabels = Array.from(new Set(labels)).slice(0, 3)
  if (normalizedVerdict === "PASS") {
    return { label: "OK", tone: "ok", items: uniqueLabels }
  }

  if (normalizedVerdict === "FAIL" || normalizedVerdict === "PARTIAL") {
    const errorCount = parseRichResultsItems(items).reduce<number>(
      (count, item) => {
        if (!item || typeof item !== "object") return count
        const record = item as Record<string, unknown>
        const issues = record.issues || record.errors
        return Array.isArray(issues) ? count + issues.length : count
      },
      0
    )
    return {
      label: errorCount > 0 ? `FAIL with ${errorCount} errors` : "FAIL",
      tone: "fail",
      items: uniqueLabels,
    }
  }

  return { label: "No rich results", tone: "none", items: uniqueLabels }
}

export function getStatusLabel(row: IndexingPageRow): string {
  const coverage = row.coverage_state?.trim()
  const bucket = getBucketLabel(row.index_bucket)
  return coverage && coverage.toLowerCase() !== bucket.toLowerCase()
    ? coverage
    : bucket
}

export function isNeedsAttention(row: IndexingPageRow): boolean {
  if (row.index_bucket && row.index_bucket !== "indexed") return true
  const richVerdict = String(row.rich_results_verdict || "").toUpperCase()
  if (richVerdict === "FAIL" || richVerdict === "PARTIAL") return true
  const pageFetch = String(row.page_fetch_state || "").toUpperCase()
  const robots = String(row.robots_txt_state || "").toUpperCase()
  const mobile = String(row.mobile_usability_verdict || "").toUpperCase()
  return (
    pageFetch.includes("FAIL") ||
    robots.includes("DISALLOW") ||
    mobile === "FAIL"
  )
}

export function getTabIndexBuckets(tab: IndexingTab): string[] | null {
  if (tab === "indexed") return ["indexed"]
  if (tab === "not_indexed") return NOT_INDEXED_BUCKETS
  if (tab === "needs_attention") return null
  return null
}
