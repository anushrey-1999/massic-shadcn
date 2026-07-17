"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Filter,
  Eye,
  ExternalLink,
  Loader2,
  Maximize2,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  useIndexingPageDetails,
  useIndexingPages,
  type IndexingPageRow,
  type IndexingPagesParams,
} from "@/hooks/use-gsc-indexing"
import { INDEX_BUCKET_META, getBucketColor, getBucketLabel } from "@/lib/gsc-index-bucket"
import {
  formatDateTime,
  formatNumber,
  getStatusLabel,
  getTabIndexBuckets,
  shortUrl,
  type IndexingSortDir,
  type IndexingSortKey,
  type IndexingTab,
} from "@/lib/indexing-table-utils"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const TABS: Array<{ value: IndexingTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "indexed", label: "Indexed" },
  { value: "not_indexed", label: "Not indexed" },
  { value: "needs_attention", label: "Needs attention" },
]

const RICH_RESULT_OPTIONS = [
  { value: "all", label: "Any rich result" },
  { value: "ok", label: "OK" },
  { value: "fail", label: "Failing" },
  { value: "none", label: "No rich results" },
]

const RECENCY_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "stale_30d", label: "Older than 30 days" },
]

const ISSUE_OPTIONS = [
  { value: "all", label: "Any issue" },
  { value: "recently_lost_indexing", label: "Recently lost indexing" },
  { value: "nonindexed_with_traffic", label: "Not indexed with traffic" },
  { value: "sitemap_not_indexed", label: "Sitemap URL not indexed" },
  { value: "technical_error", label: "Technical indexing error" },
  { value: "canonical_mismatch", label: "Canonical mismatch" },
  { value: "rich_results_failure", label: "Rich result failure" },
  { value: "high_value_overdue", label: "High-value URL overdue" },
  { value: "gsc_only_with_traffic", label: "Traffic URL missing from sitemap" },
]

const ISSUE_LABELS = new Map(ISSUE_OPTIONS.map((option) => [option.value, option.label]))

const SELECTION_REASON_OPTIONS = [
  { value: "all", label: "Any selection reason" },
  { value: "never_inspected", label: "First inspection" },
  { value: "sitemap_changed", label: "Sitemap changed" },
  { value: "critical_issue", label: "Critical issue" },
  { value: "traffic_or_nonindexed", label: "Traffic or non-indexed" },
  { value: "routine_refresh", label: "Routine refresh" },
  { value: "adaptive_surveillance", label: "Adaptive surveillance" },
]
const SELECTION_REASON_LABELS = new Map(
  SELECTION_REASON_OPTIONS.map((option) => [option.value, option.label])
)

interface IndexingPagesTableProps {
  businessId: string | null
  website: string | null
  range: { from: string; to: string }
  issueFilter?: string | null
  onFiltersChange?: (params: IndexingPagesParams) => void
  onClearInsight?: () => void
}

function SortableHead({
  label,
  sortKey,
  activeSort,
  activeDir,
  onSort,
  align = "left",
  className,
}: {
  label: string
  sortKey: IndexingSortKey
  activeSort: IndexingSortKey
  activeDir: IndexingSortDir
  onSort: (key: IndexingSortKey) => void
  align?: "left" | "right"
  className?: string
}) {
  const isActive = activeSort === sortKey
  return (
    <TableHead className={cn("h-10 bg-background p-0", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group flex h-10 w-full items-center gap-1.5 px-3 text-left text-[11px] font-semibold uppercase tracking-normal text-general-muted-foreground hover:bg-muted/50",
          align === "right" && "justify-end text-right",
          isActive && "text-foreground"
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {!isActive ? (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-80" />
          ) : activeDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
    </TableHead>
  )
}

function StatusCell({ row }: { row: IndexingPageRow }) {
  if (!row.known_status) {
    return (
      <div className="min-w-[150px]">
        <div className="text-xs font-medium text-foreground">Waiting for first inspection</div>
        <div className="mt-0.5 text-[11px] text-general-muted-foreground">Queued by priority</div>
      </div>
    )
  }
  return (
    <div className="flex min-w-[150px] items-start gap-2">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: getBucketColor(row.index_bucket) }}
      />
      <div className="min-w-0">
        <div className="line-clamp-2 text-xs font-medium text-foreground">
          {getStatusLabel(row)}
        </div>
        {row.indexing_state ? (
          <div className="mt-0.5 text-[11px] text-general-muted-foreground">
            {row.indexing_state}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function IssueCell({ row }: { row: IndexingPageRow }) {
  if (!row.known_status) {
    return <span className="text-xs text-general-muted-foreground">Available after first inspection</span>
  }
  if (!row.primary_issue) {
    return <span className="text-xs text-general-muted-foreground">No detected issue</span>
  }
  return (
    <div>
      <div className="text-xs font-medium text-foreground">
        {ISSUE_LABELS.get(row.primary_issue) || row.primary_issue.replaceAll("_", " ")}
      </div>
      {row.issue_types.length > 1 ? (
        <div className="mt-0.5 text-[11px] text-general-muted-foreground">
          +{row.issue_types.length - 1} more issue{row.issue_types.length > 2 ? "s" : ""}
        </div>
      ) : null}
    </div>
  )
}

function formatDetailValue(value: unknown, fallback = "Not reported") {
  if (value == null || value === "") return fallback
  return String(value).replaceAll("_", " ")
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white p-3">
      <dt className="text-[11px] text-general-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-xs font-medium capitalize text-foreground">{value}</dd>
    </div>
  )
}

function CompactFilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
      <div className="text-xs font-medium text-foreground">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  isFetching: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(page, totalPages)
  const from = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1
  const to = Math.min(clampedPage * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t border-general-border-four px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-general-muted-foreground">
        {total > 0
          ? `Showing ${formatNumber(from)} to ${formatNumber(to)} of ${formatNumber(
              total
            )} results`
          : "No results"}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <span className="text-xs text-general-muted-foreground">
          Rows per page
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[76px] bg-background text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mx-1 flex min-w-[88px] items-center justify-center whitespace-nowrap text-xs font-medium text-foreground">
          Page {clampedPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={clampedPage === 1 || isFetching}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(clampedPage - 1)}
            disabled={clampedPage === 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(clampedPage + 1)}
            disabled={clampedPage >= totalPages || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={clampedPage >= totalPages || isFetching}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PagesTableBody({
  rows,
  sort,
  dir,
  isLoading,
  isFetching,
  onSort,
  maxHeightClass,
  onOpenDetails,
}: {
  rows: IndexingPageRow[]
  sort: IndexingSortKey
  dir: IndexingSortDir
  isLoading: boolean
  isFetching: boolean
  onSort: (key: IndexingSortKey) => void
  maxHeightClass: string
  onOpenDetails: (row: IndexingPageRow) => void
}) {
  const showLoading = isLoading && rows.length === 0
  return (
    <div className="relative overflow-hidden border-t border-general-border-four">
      {isFetching && !showLoading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <Loader2 className="h-6 w-6 animate-spin text-general-muted-foreground" />
        </div>
      ) : null}
      <div className={cn("overflow-auto", maxHeightClass)}>
        <TableElement className="min-w-[960px] table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="URL"
                sortKey="page"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[30%]"
              />
              <SortableHead
                label="Index status"
                sortKey="status"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[18%]"
              />
              <SortableHead
                label="Traffic impact"
                sortKey="impressions"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                align="right"
                className="w-[14%]"
              />
              <SortableHead
                label="Freshness"
                sortKey="freshness"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[16%]"
              />
              <TableHead className="h-10 w-[16%] bg-background px-3 text-[11px] font-semibold uppercase text-general-muted-foreground">
                Primary issue
              </TableHead>
              <TableHead className="h-10 w-[6%] bg-background px-3 text-[11px] font-medium uppercase text-general-muted-foreground">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[280px] text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-general-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[280px] text-center">
                  <div className="text-sm font-medium text-foreground">
                    No URLs show
                  </div>
                  <div className="mt-1 text-xs text-general-muted-foreground">
                    No URLs match the current table filters.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.page_url}
                  className="h-[60px] hover:bg-muted/40"
                >
                  <TableCell className="px-3 py-2">
                    <a
                      href={row.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.page_url}
                      className="block truncate text-xs font-medium text-blue-500 hover:underline"
                    >
                      {shortUrl(row.page_url)}
                    </a>
                    <div className="mt-0.5 truncate text-[11px] text-general-muted-foreground">
                      {row.source || "Tracked URL"}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusCell row={row} />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <div className="text-xs font-medium tabular-nums text-foreground">
                      {formatNumber(row.clicks)} clicks
                    </div>
                    <div className="mt-0.5 text-[11px] tabular-nums text-general-muted-foreground">
                      {formatNumber(row.impressions)} impressions
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="text-xs font-medium capitalize text-foreground">
                      {row.freshness_state === "pending" ? "Waiting for first inspection" : row.freshness_state === "fresh" ? "On schedule" : row.freshness_state}
                    </div>
                    <div className="mt-0.5 text-[11px] capitalize text-general-muted-foreground">
                      {row.inspection_tier} tier
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <IssueCell row={row} />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onOpenDetails(row)}
                      aria-label={`View indexing details for ${row.page_url}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableElement>
      </div>
    </div>
  )
}

export function IndexingPagesTable({
  businessId,
  website,
  range,
  issueFilter,
  onFiltersChange,
  onClearInsight,
}: IndexingPagesTableProps) {
  const [activeTab, setActiveTab] = useState<IndexingTab>("all")
  const [search, setSearch] = useState("")
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([])
  const [richResultState, setRichResultState] = useState("all")
  const [crawlRecency, setCrawlRecency] = useState("all")
  const [inspectionRecency, setInspectionRecency] = useState("all")
  const [sort, setSort] = useState<IndexingSortKey>("impressions")
  const [dir, setDir] = useState<IndexingSortDir>("desc")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(false)
  const [selectedPage, setSelectedPage] = useState<IndexingPageRow | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [freshness, setFreshness] = useState("all")
  const [inspectionTier, setInspectionTier] = useState("all")
  const [coverageState, setCoverageState] = useState("all")
  const [source, setSource] = useState("all")
  const [issueType, setIssueType] = useState("all")
  const [selectionReason, setSelectionReason] = useState("all")
  const selectedUrl = selectedPage?.page_url || null
  const detailsQuery = useIndexingPageDetails(businessId, website, selectedUrl)

  const offset = (page - 1) * pageSize
  const indexBuckets = useMemo(
    () => selectedBuckets.length > 0 ? selectedBuckets : getTabIndexBuckets(activeTab),
    [selectedBuckets, activeTab]
  )
  const filterCount =
    selectedBuckets.length +
    (richResultState !== "all" ? 1 : 0) +
    (crawlRecency !== "all" ? 1 : 0) +
    (inspectionRecency !== "all" ? 1 : 0) +
    (freshness !== "all" ? 1 : 0) +
    (inspectionTier !== "all" ? 1 : 0) +
    (coverageState !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0) +
    (selectionReason !== "all" ? 1 : 0) +
    (issueFilter || issueType !== "all" ? 1 : 0)
  const localFilterCount = filterCount - (issueFilter ? 1 : 0)
  const advancedFilterCount =
    selectedBuckets.length +
    (selectionReason !== "all" ? 1 : 0) +
    (richResultState !== "all" ? 1 : 0) +
    (crawlRecency !== "all" ? 1 : 0) +
    (inspectionRecency !== "all" ? 1 : 0)

  const pageParams = useMemo<IndexingPagesParams>(() => ({
    from: range.from,
    to: range.to,
    indexBuckets,
    needsAttention: activeTab === "needs_attention",
    richResultState: richResultState === "all" ? null : richResultState,
    crawlRecency: crawlRecency === "all" ? null : crawlRecency,
    inspectionRecency: inspectionRecency === "all" ? null : inspectionRecency,
    search: search || null,
    sort,
    dir,
    limit: pageSize,
    offset,
    freshness: freshness === "all" ? null : freshness,
    inspectionTier: inspectionTier === "all" ? null : inspectionTier,
    coverageState: coverageState === "all" ? null : coverageState as "known" | "pending",
    source: source === "all" ? null : source,
    selectionReason: selectionReason === "all" ? null : selectionReason,
    issueTypes: issueFilter ? [issueFilter] : issueType === "all" ? null : [issueType],
  }), [
    range.from, range.to, indexBuckets, activeTab, richResultState, crawlRecency,
    inspectionRecency, search, sort, dir, pageSize, offset, freshness,
    inspectionTier, coverageState, source, selectionReason, issueFilter, issueType,
  ])

  const pagesQuery = useIndexingPages(businessId, website, pageParams)

  const rows = pagesQuery.data?.rows ?? []
  const total = pagesQuery.data?.pagination.total ?? 0

  const resetPage = () => setPage(1)
  const handleSearchChange = (value: string) => {
    setSearch(value.trim())
    resetPage()
  }

  const handleSort = (key: IndexingSortKey) => {
    if (sort === key) {
      setDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSort(key)
      setDir(key === "page" || key === "status" ? "asc" : "desc")
    }
    resetPage()
  }

  const toggleBucket = (bucket: string, checked: boolean) => {
    setSelectedBuckets((prev) =>
      checked ? [...prev, bucket] : prev.filter((item) => item !== bucket)
    )
    resetPage()
  }

  const clearFilters = () => {
    setSelectedBuckets([])
    setRichResultState("all")
    setCrawlRecency("all")
    setInspectionRecency("all")
    setFreshness("all")
    setInspectionTier("all")
    setCoverageState("all")
    setSource("all")
    setIssueType("all")
    setSelectionReason("all")
    resetPage()
  }

  const clearAllFilters = () => {
    clearFilters()
    onClearInsight?.()
  }

  useEffect(() => {
    setPage(1)
  }, [range.from, range.to, issueFilter])

  useEffect(() => {
    onFiltersChange?.({ ...pageParams, limit: undefined, offset: undefined })
  }, [onFiltersChange, pageParams])

  const tableProps = {
    rows,
    sort,
    dir,
    isLoading: pagesQuery.isLoading,
    isFetching: pagesQuery.isFetching,
    onSort: handleSort,
    onOpenDetails: setSelectedPage,
  }

  return (
    <div className="overflow-hidden rounded-lg border border-general-border bg-white">
      <div className="flex flex-col gap-3 border-b border-general-border-four p-3">
        <div>
          <h2 className="text-base font-medium text-general-secondary-foreground">
            Pages
          </h2>
          <p className="text-xs text-general-muted-foreground">
            Index status, performance and crawl details per URL.
          </p>
        </div>

        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full flex-wrap items-center justify-between gap-2 p-1"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <DataTableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Search URLs..."
              className="min-w-[200px] flex-1 sm:max-w-[280px]"
              inputClassName="bg-white text-xs"
            />
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 px-3"
                  aria-label="Open page filters"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {filterCount > 0 ? (
                    <Badge variant="secondary" className="h-5 min-w-5 rounded px-1.5 text-[10px]">
                      {filterCount}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="flex max-h-[min(560px,calc(100vh-96px))] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border-general-border p-0 shadow-lg"
              >
                <div className="shrink-0 border-b border-general-border-four px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">Page filters</div>
                      <div className="text-xs text-general-muted-foreground">Results update as you choose.</div>
                    </div>
                    {localFilterCount > 0 ? (
                      <Badge variant="secondary" className="rounded text-[10px]">{localFilterCount} active</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {issueFilter ? (
                    <div className="mb-3 rounded-lg border border-general-border bg-foreground-light p-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-general-muted-foreground">Priority insight</div>
                      <div className="mt-1 text-xs font-medium text-foreground">{ISSUE_LABELS.get(issueFilter) || issueFilter.replaceAll("_", " ")}</div>
                      <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={onClearInsight}>
                        <X className="h-3.5 w-3.5" /> Clear insight
                      </Button>
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
                    <CompactFilterRow label="Coverage">
                      <Select value={coverageState} onValueChange={(value) => { setCoverageState(value); resetPage() }}>
                        <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Known and pending</SelectItem>
                          <SelectItem value="known">Known status</SelectItem>
                          <SelectItem value="pending">Waiting for first inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </CompactFilterRow>
                    <CompactFilterRow label="Inspection timing">
                      <Select value={freshness} onValueChange={(value) => { setFreshness(value); resetPage() }}>
                        <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any timing</SelectItem>
                          <SelectItem value="pending">Pending first check</SelectItem>
                          <SelectItem value="fresh">On schedule</SelectItem>
                          <SelectItem value="due">Due</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </CompactFilterRow>
                    <CompactFilterRow label="Tier">
                      <Select value={inspectionTier} onValueChange={(value) => { setInspectionTier(value); resetPage() }}>
                        <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any tier</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="critical">Critical · 3 days</SelectItem>
                          <SelectItem value="priority">Priority · 7 days</SelectItem>
                          <SelectItem value="routine">Routine · 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </CompactFilterRow>
                    <CompactFilterRow label="Issue">
                      <Select value={issueFilter || issueType} onValueChange={(value) => { setIssueType(value); resetPage() }} disabled={Boolean(issueFilter)}>
                        <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ISSUE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </CompactFilterRow>
                    <CompactFilterRow label="Source">
                      <Select value={source} onValueChange={(value) => { setSource(value); resetPage() }}>
                        <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any source</SelectItem>
                          <SelectItem value="sitemap">Sitemap only</SelectItem>
                          <SelectItem value="gsc">GSC only</SelectItem>
                          <SelectItem value="both">Sitemap + GSC</SelectItem>
                        </SelectContent>
                      </Select>
                    </CompactFilterRow>
                  </div>

                  <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen} className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        aria-expanded={advancedFiltersOpen}
                        className={cn(
                          "h-9 w-full justify-between rounded-md border border-transparent px-3 text-xs hover:bg-muted/60",
                          advancedFiltersOpen && "border-general-border bg-muted text-foreground"
                        )}
                      >
                        <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" />{advancedFiltersOpen ? "Hide advanced filters" : "Show advanced filters"}</span>
                        <span className="inline-flex items-center gap-2">
                          {advancedFilterCount > 0 ? <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px]">{advancedFilterCount}</Badge> : null}
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedFiltersOpen && "rotate-180")} />
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2.5 rounded-lg border border-general-border bg-muted/20 p-3">
                      <div>
                        <div className="mb-2 text-xs font-medium text-foreground">Exact index status</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-white p-2.5">
                          {INDEX_BUCKET_META.map((meta) => (
                            <label key={meta.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-foreground">
                              <Checkbox checked={selectedBuckets.includes(meta.key)} onCheckedChange={(checked) => toggleBucket(meta.key, checked === true)} />
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                              <span className="min-w-0 leading-4">{meta.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {[
                        ["Last selection reason", selectionReason, setSelectionReason, SELECTION_REASON_OPTIONS],
                        ["Rich results", richResultState, setRichResultState, RICH_RESULT_OPTIONS],
                        ["Google last crawl", crawlRecency, setCrawlRecency, RECENCY_OPTIONS],
                        ["Massic last check", inspectionRecency, setInspectionRecency, RECENCY_OPTIONS],
                      ].map(([label, value, setter, options]) => (
                        <CompactFilterRow key={String(label)} label={String(label)}>
                          <Select value={String(value)} onValueChange={(next) => { (setter as (value: string) => void)(next); resetPage() }}>
                            <SelectTrigger size="sm" className="w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(options as Array<{ value: string; label: string }>).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </CompactFilterRow>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-general-border-four bg-white px-3 py-2.5">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters} disabled={localFilterCount === 0}>Clear filters</Button>
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => setFilterOpen(false)}>Done</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex w-full max-w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as IndexingTab)
                resetPage()
              }}
            >
              <TabsList className="h-9 rounded-[8px] p-[3px]">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-[29px] rounded-[6px] px-2.5 text-xs"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setExpanded(true)}
              aria-label="Expand pages table"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {issueFilter ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-general-muted-foreground">Filtered by insight</span>
              <button
                type="button"
                onClick={onClearInsight}
                aria-label={`Clear ${ISSUE_LABELS.get(issueFilter) || issueFilter.replaceAll("_", " ")} insight filter`}
                className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{ISSUE_LABELS.get(issueFilter) || issueFilter.replaceAll("_", " ")}</span>
                <X className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
            {localFilterCount > 0 ? <span className="text-[11px] text-general-muted-foreground">+ {localFilterCount} page filter{localFilterCount === 1 ? "" : "s"}</span> : null}
          </div>
        ) : localFilterCount > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-foreground-light px-3 py-2 text-xs">
            <span className="text-general-muted-foreground">{localFilterCount} page filter{localFilterCount === 1 ? "" : "s"} applied</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAllFilters}>Clear all</Button>
          </div>
        ) : null}
      </div>

      <PagesTableBody {...tableProps} maxHeightClass="max-h-[520px]" />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        isFetching={pagesQuery.isFetching}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          resetPage()
        }}
      />

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="flex h-[85vh] !w-[96vw] !max-w-[1600px] flex-col gap-0 p-0 sm:!max-w-[1600px]"
          style={{ width: "96vw", maxWidth: "1600px" }}
          showCloseButton={false}
        >
          <DialogHeader className="flex-row items-center justify-between border-b border-general-border-four px-4 py-3">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Pages
              </DialogTitle>
              <p className="text-xs text-general-muted-foreground">
                {formatNumber(total)} matching tracked URLs
              </p>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <PagesTableBody {...tableProps} maxHeightClass="h-full max-h-full" />
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            isFetching={pagesQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              resetPage()
            }}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedPage)} onOpenChange={(open) => { if (!open) setSelectedPage(null) }}>
        <SheetContent side="right" className="!w-full gap-0 overflow-hidden p-0 sm:!max-w-[600px]">
          <SheetHeader className="shrink-0 border-b border-general-border bg-white px-5 py-4 pr-12">
            <SheetTitle className="text-base font-medium">Page inspection</SheetTitle>
            <SheetDescription className="break-all text-xs leading-5">{selectedUrl}</SheetDescription>
            {selectedUrl ? (
              <a href={selectedUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-blue-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Open page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-foreground-light px-4 py-4 sm:px-5">
            {detailsQuery.isLoading ? (
              <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-general-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading inspection details…
              </div>
            ) : detailsQuery.isError ? (
              <div className="rounded-lg border border-general-border bg-white p-4">
                <p className="text-sm font-medium text-foreground">Couldn&apos;t load this page</p>
                <p className="mt-1 text-xs text-general-muted-foreground">Close the drawer and try opening the page again.</p>
              </div>
            ) : detailsQuery.data ? (
              <div className="space-y-4">
                <section className="rounded-lg border border-general-border bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-general-muted-foreground">Latest known status</p>
                      <p className="mt-1 text-base font-medium text-foreground">
                        {selectedPage?.known_status ? getBucketLabel(selectedPage.index_bucket) : "Waiting for first inspection"}
                      </p>
                      <p className="mt-1 text-xs text-general-muted-foreground">
                        {selectedPage?.known_status ? formatDetailValue(detailsQuery.data.latest?.coverage_state, "Google did not provide a coverage description") : "Google-specific details will appear after the first successful check."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="rounded capitalize">{selectedPage?.inspection_tier || "new"} tier</Badge>
                      <Badge variant="outline" className="rounded capitalize">{selectedPage?.freshness_state === "fresh" ? "On schedule" : selectedPage?.freshness_state || "pending"}</Badge>
                      <Badge variant="outline" className="rounded capitalize">{selectedPage?.source || "tracked"}</Badge>
                    </div>
                  </div>
                </section>

                {detailsQuery.data.latest ? (
                  <section>
                    <div className="mb-2">
                      <h3 className="text-sm font-medium text-foreground">Inspection overview</h3>
                      <p className="text-xs text-general-muted-foreground">Google results and Massic monitoring times.</p>
                    </div>
                    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-general-border bg-general-border sm:grid-cols-2">
                      <DetailField label="Index status" value={getBucketLabel(String(detailsQuery.data.latest.index_bucket || "unknown"))} />
                      <DetailField label="Coverage" value={formatDetailValue(detailsQuery.data.latest.coverage_state)} />
                      <DetailField label="Page fetch" value={formatDetailValue(detailsQuery.data.latest.page_fetch_state)} />
                      <DetailField label="Robots" value={formatDetailValue(detailsQuery.data.latest.robots_txt_state)} />
                      <DetailField label="Rich results" value={formatDetailValue(detailsQuery.data.latest.rich_results_verdict)} />
                      <DetailField label="Mobile usability" value={formatDetailValue(detailsQuery.data.latest.mobile_usability_verdict)} />
                      <DetailField label="Google last crawled" value={formatDateTime(detailsQuery.data.latest.last_crawl_time as string)} />
                      <DetailField label="Massic last checked" value={formatDateTime(detailsQuery.data.tracked.last_inspected_at as string)} />
                    </dl>
                  </section>
                ) : (
                  <div className="rounded-lg border border-general-border bg-white p-4 text-sm text-general-muted-foreground">
                    Waiting for the first Google inspection. Monitoring information is available below.
                  </div>
                )}

                <section>
                  <h3 className="text-sm font-medium text-foreground">Monitoring schedule</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-general-border bg-general-border sm:grid-cols-2">
                    <DetailField label="Tier" value={formatDetailValue(detailsQuery.data.tracked.inspection_tier, "New")} />
                    <DetailField label="Schedule status" value={selectedPage?.freshness_state === "fresh" ? "On schedule" : formatDetailValue(selectedPage?.freshness_state, "Pending")} />
                    <DetailField label="Next inspection" value={formatDateTime(detailsQuery.data.tracked.next_inspection_at as string)} />
                    <DetailField
                      label="Last selection reason"
                      value={
                        SELECTION_REASON_LABELS.get(String(detailsQuery.data.tracked.last_selection_reason || "")) ||
                        formatDetailValue(
                          detailsQuery.data.tracked.last_selection_reason,
                          detailsQuery.data.tracked.last_inspected_at
                            ? "Legacy inspection — reason not recorded"
                            : "Not selected yet"
                        )
                      }
                    />
                  </dl>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-foreground">Canonicals</h3>
                  <div className="mt-2 divide-y divide-general-border overflow-hidden rounded-lg border border-general-border bg-white text-xs">
                    <div className="p-3"><span className="text-general-muted-foreground">Declared by page</span><p className="mt-1 break-all font-medium text-foreground">{String(detailsQuery.data.latest?.user_canonical || "Not declared")}</p></div>
                    <div className="p-3"><span className="text-general-muted-foreground">Selected by Google</span><p className="mt-1 break-all font-medium text-foreground">{String(detailsQuery.data.latest?.google_canonical || "Not reported")}</p></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-foreground">Inspection history</h3>
                  <div className="mt-2 divide-y divide-general-border overflow-hidden rounded-lg border border-general-border bg-white">
                    {detailsQuery.data.history.length ? detailsQuery.data.history.map((item, index) => (
                      <div key={`${String(item.time)}-${index}`} className="flex flex-col gap-1 p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="font-medium text-foreground">{getBucketLabel(String(item.index_bucket || "unknown"))}</span>
                        <span className="text-general-muted-foreground">{formatDateTime(item.time as string)}</span>
                      </div>
                    )) : <div className="p-3 text-xs text-general-muted-foreground">No inspection history yet.</div>}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-foreground">Recent changes</h3>
                  <div className="mt-2 divide-y divide-general-border overflow-hidden rounded-lg border border-general-border bg-white">
                    {detailsQuery.data.movements.length ? detailsQuery.data.movements.map((item, index) => (
                      <div key={`${item.detected_at}-${index}`} className="p-3 text-xs">
                        <div className="font-medium text-foreground">{getBucketLabel(item.before_bucket)} <span className="text-general-muted-foreground">→</span> {getBucketLabel(item.after_bucket)}</div>
                        {item.changed_fields ? <div className="mt-1 capitalize text-general-muted-foreground">Changed: {Object.keys(item.changed_fields).map((field) => field.replaceAll("_", " ")).join(", ")}</div> : null}
                        <div className="mt-1 text-general-muted-foreground">{formatDateTime(item.detected_at)}</div>
                      </div>
                    )) : <div className="p-3 text-xs text-general-muted-foreground">No changes detected yet.</div>}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
