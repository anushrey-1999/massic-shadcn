"use client"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Filter,
  Loader2,
  Maximize2,
  X,
} from "lucide-react"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useIndexingPages, type IndexingPageRow } from "@/hooks/use-gsc-indexing"
import { INDEX_BUCKET_META, getBucketColor } from "@/lib/gsc-index-bucket"
import {
  formatAbsoluteDate,
  formatNumber,
  formatRelativeDate,
  getRichResultSummary,
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

interface IndexingPagesTableProps {
  businessId: string | null
  website: string | null
  range: { from: string; to: string }
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

function DateStack({ value }: { value: string | null | undefined }) {
  return (
    <div className="whitespace-nowrap">
      <div className="text-xs font-medium text-foreground">
        {formatRelativeDate(value)}
      </div>
      <div className="mt-0.5 text-[11px] text-general-muted-foreground">
        {formatAbsoluteDate(value)}
      </div>
    </div>
  )
}

function RichResultsCell({ row }: { row: IndexingPageRow }) {
  const summary = getRichResultSummary(
    row.rich_results_verdict,
    row.rich_results_items
  )
  return (
    <div className="min-w-[128px]">
      <div
        className={cn(
          "text-xs font-medium",
          summary.tone === "ok" && "text-emerald-600",
          summary.tone === "fail" && "text-red-600",
          summary.tone === "none" && "text-general-muted-foreground"
        )}
      >
        {summary.label}
      </div>
      {summary.items.length > 0 ? (
        <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-general-muted-foreground">
          {summary.items.join(", ")}
        </div>
      ) : null}
    </div>
  )
}

function StatusCell({ row }: { row: IndexingPageRow }) {
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
}: {
  rows: IndexingPageRow[]
  sort: IndexingSortKey
  dir: IndexingSortDir
  isLoading: boolean
  isFetching: boolean
  onSort: (key: IndexingSortKey) => void
  maxHeightClass: string
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
        <TableElement className="min-w-[1180px] table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="URL"
                sortKey="page"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[34%]"
              />
              <SortableHead
                label="Clicks"
                sortKey="clicks"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                align="right"
                className="w-[8%]"
              />
              <SortableHead
                label="Impressions"
                sortKey="impressions"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                align="right"
                className="w-[10%]"
              />
              <SortableHead
                label="Status"
                sortKey="status"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[17%]"
              />
              <SortableHead
                label="Last crawl"
                sortKey="last_crawl"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[11%]"
              />
              <SortableHead
                label="Rich results"
                sortKey="rich_results"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[12%]"
              />
              <SortableHead
                label="Last inspection"
                sortKey="last_inspected"
                activeSort={sort}
                activeDir={dir}
                onSort={onSort}
                className="w-[12%]"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-[280px] text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-general-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-[280px] text-center">
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
                  className="h-[60px] bg-[#0f2f27]/5 hover:bg-muted/40"
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
                  <TableCell className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
                    {formatNumber(row.clicks)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
                    {formatNumber(row.impressions)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusCell row={row} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <DateStack value={row.last_crawl_time} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <RichResultsCell row={row} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <DateStack value={row.last_inspected_time} />
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

  const offset = (page - 1) * pageSize
  const indexBuckets =
    selectedBuckets.length > 0 ? selectedBuckets : getTabIndexBuckets(activeTab)
  const filterCount =
    selectedBuckets.length +
    (richResultState !== "all" ? 1 : 0) +
    (crawlRecency !== "all" ? 1 : 0) +
    (inspectionRecency !== "all" ? 1 : 0)

  const pagesQuery = useIndexingPages(businessId, website, {
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
  })

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
    resetPage()
  }

  useEffect(() => {
    setPage(1)
  }, [range.from, range.to])

  const tableProps = {
    rows,
    sort,
    dir,
    isLoading: pagesQuery.isLoading,
    isFetching: pagesQuery.isFetching,
    onSort: handleSort,
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
          className="flex w-full flex-wrap items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <DataTableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Search URLs..."
              className="max-w-[280px]"
              inputClassName="bg-white text-xs"
            />
            <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative h-9 w-9"
                aria-label="Open table filters"
              >
                <Filter className="h-4 w-4" />
                {filterCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1 text-[10px]"
                  >
                    {filterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-0">
              <div className="border-b border-general-border-four px-3 py-2">
                <div className="text-sm font-medium text-foreground">
                  Table filters
                </div>
                <div className="text-xs text-general-muted-foreground">
                  Narrow by status, rich results and freshness.
                </div>
              </div>
              <div className="space-y-4 p-3">
                <div>
                  <div className="mb-2 text-xs font-medium text-foreground">
                    Exact index bucket
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {INDEX_BUCKET_META.map((meta) => (
                      <label
                        key={meta.key}
                        className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
                      >
                        <Checkbox
                          checked={selectedBuckets.includes(meta.key)}
                          onCheckedChange={(checked) =>
                            toggleBucket(meta.key, checked === true)
                          }
                        />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-foreground">
                      Rich results
                    </div>
                    <Select
                      value={richResultState}
                      onValueChange={(value) => {
                        setRichResultState(value)
                        resetPage()
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RICH_RESULT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="mb-1.5 text-xs font-medium text-foreground">
                      Last crawl
                    </div>
                    <Select
                      value={crawlRecency}
                      onValueChange={(value) => {
                        setCrawlRecency(value)
                        resetPage()
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="mb-1.5 text-xs font-medium text-foreground">
                      Last inspection
                    </div>
                    <Select
                      value={inspectionRecency}
                      onValueChange={(value) => {
                        setInspectionRecency(value)
                        resetPage()
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-general-border-four p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          </div>

          <div className="flex items-center gap-2">
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
                {formatNumber(total)} indexed report URLs
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
    </div>
  )
}
