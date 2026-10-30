"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, RefreshCw, Search, X } from "lucide-react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PeriodSelector } from "@/components/molecules/analytics/PeriodSelector"
import { SmartSitemapOverview } from "@/components/organisms/smart-sitemap/SmartSitemapOverview"
import { SmartSitemapPagination } from "@/components/organisms/smart-sitemap/SmartSitemapPagination"
import { SmartSitemapTable } from "@/components/organisms/smart-sitemap/SmartSitemapTable"
import type { SitemapSortState } from "@/components/organisms/smart-sitemap/SmartSitemapTableLayout"
import { SmartSitemapTree } from "@/components/organisms/smart-sitemap/SmartSitemapTree"
import {
  SITEMAP_VIEWS,
  SmartSitemapViewToggle,
  type SitemapView,
} from "@/components/organisms/smart-sitemap/SmartSitemapViewToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import {
  SMART_SITEMAP_SORTS,
  SMART_SITEMAP_STATUSES,
  useSmartSitemapList,
  useSmartSitemapTree,
  type SmartSitemapQueryParams,
  type SmartSitemapSort,
  type SmartSitemapStatus,
  type SortOrder,
} from "@/hooks/use-smart-sitemap"
import { defaultSortOrder, siteHost } from "@/lib/smart-sitemap"
import { resolveTimePeriodRange, type OptInTimePeriod, type TimePeriodValue } from "@/utils/analytics-period"

const PAGE_SIZE = 50
const DEFAULT_PERIOD: TimePeriodValue = "60 days"
const DEFAULT_SORT: SmartSitemapSort = "gsc.clicks"
const DEFAULT_VIEW: SitemapView = "table"
const OPT_IN_PERIODS: readonly OptInTimePeriod[] = ["60 days"]
const VIEW_STORAGE_KEY = "smart-sitemap-view"

function readPeriod(value: string | null): TimePeriodValue {
  return value && resolveTimePeriodRange(value as TimePeriodValue) ? (value as TimePeriodValue) : DEFAULT_PERIOD
}

function readSort(value: string | null): SmartSitemapSort {
  return SMART_SITEMAP_SORTS.find((sort) => sort === value) ?? DEFAULT_SORT
}

function readOrder(value: string | null, sort: SmartSitemapSort): SortOrder {
  return value === "asc" || value === "desc" ? value : defaultSortOrder(sort)
}

function readView(value: string | null): SitemapView | null {
  return SITEMAP_VIEWS.find((view) => view === value) ?? null
}

function readStatuses(value: string | null): SmartSitemapStatus[] {
  if (!value) return []
  const wanted = new Set(value.split(","))
  return SMART_SITEMAP_STATUSES.filter((status) => wanted.has(status))
}

function readPage(value: string | null): number {
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function SmartSitemapTemplate({ businessId }: { businessId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { profileData } = useBusinessProfileById(businessId)
  const businessName = profileData?.Name || profileData?.DisplayName || "Business"
  const host = siteHost(profileData?.Website)

  const period = readPeriod(searchParams.get("period"))
  const sortBy = readSort(searchParams.get("sort"))
  const sortOrder = readOrder(searchParams.get("order"), sortBy)
  const statusParam = searchParams.get("status")
  const statuses = useMemo(() => readStatuses(statusParam), [statusParam])
  const page = readPage(searchParams.get("page"))
  const urlSearch = searchParams.get("q") ?? ""

  // The URL wins so links are shareable; otherwise the last view picked on this device.
  const urlView = readView(searchParams.get("view"))
  const [storedView, setStoredView] = useState<SitemapView | null>(null)
  useEffect(() => {
    try {
      setStoredView(readView(window.localStorage.getItem(VIEW_STORAGE_KEY)))
    } catch {
      setStoredView(null)
    }
  }, [])
  const view = urlView ?? storedView ?? DEFAULT_VIEW

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput.trim(), 300)

  const updateParams = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      if (resetPage) next.delete("page")
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const lastDebouncedSearch = useRef(debouncedSearch)
  useEffect(() => {
    if (debouncedSearch === lastDebouncedSearch.current) return
    lastDebouncedSearch.current = debouncedSearch
    if (debouncedSearch !== urlSearch) updateParams({ q: debouncedSearch || null })
  }, [debouncedSearch, updateParams, urlSearch])

  const queryParams = useMemo<SmartSitemapQueryParams>(
    () => ({ period, sortBy, sortOrder, search: urlSearch || undefined, indexingStatuses: statuses }),
    [period, sortBy, sortOrder, urlSearch, statuses]
  )

  const listQuery = useSmartSitemapList(
    businessId,
    { ...queryParams, page, limit: PAGE_SIZE },
    { enabled: view === "table" }
  )
  const treeQuery = useSmartSitemapTree(businessId, queryParams, "/", { enabled: view === "tree" })

  const listData = listQuery.data
  const treeRoot = treeQuery.data?.pages[0]
  const active = view === "table" ? listQuery : treeQuery
  const hasData = view === "table" ? Boolean(listData) : Boolean(treeRoot)
  const isEmpty = view === "table" ? listData?.pages.length === 0 : treeRoot?.nodes.length === 0
  const statusCounts = (view === "table" ? listData?.meta.indexing.statusCounts : treeRoot?.meta.indexing.statusCounts) ?? null
  const updating = active.isPlaceholderData || (active.isFetching && !active.isLoading && !treeQuery.isFetchingNextPage)
  const hasFilters = Boolean(urlSearch || statuses.length)

  const toggleStatus = (status: SmartSitemapStatus) => {
    const next = statuses.includes(status) ? statuses.filter((value) => value !== status) : [...statuses, status]
    updateParams({ status: next.length ? next.join(",") : null })
  }

  const clearFilters = () => {
    setSearchInput("")
    updateParams({ q: null, status: null })
  }

  const changeSort = ({ sortBy: nextSort, sortOrder: nextOrder }: SitemapSortState) => {
    updateParams({
      sort: nextSort === DEFAULT_SORT ? null : nextSort,
      order: nextOrder === defaultSortOrder(nextSort) ? null : nextOrder,
    })
  }

  const changeView = (next: SitemapView) => {
    setStoredView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // Without storage the choice still lives in the URL.
    }
    updateParams({ view: next === DEFAULT_VIEW ? null : next })
  }

  const changePage = (nextPage: number) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null }, false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const pageHref = useCallback(
    (pageId: string) =>
      `/business/${businessId}/analytics/pages/${pageId}${period === DEFAULT_PERIOD ? "" : `?period=${encodeURIComponent(period)}`}`,
    [businessId, period]
  )

  // Pages beyond the end (e.g. after a filter shrinks the list) fall back to the last page.
  useEffect(() => {
    if (listData && listData.pagination.totalPages > 0 && page > listData.pagination.totalPages) {
      updateParams({ page: listData.pagination.totalPages > 1 ? String(listData.pagination.totalPages) : null }, false)
    }
  }, [listData, page, updateParams])

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: businessName },
    { label: "Analytics", href: `/business/${businessId}/analytics` },
    { label: "Sitemap" },
  ]

  const sort: SitemapSortState = { sortBy, sortOrder }

  return (
    <div className="flex min-h-screen flex-col bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] flex-1 px-5 py-6 md:px-7">
        <div className="mb-5">
          <h1 className="text-xl font-medium text-general-foreground">Sitemap</h1>
          <p className="mt-1 max-w-2xl text-sm text-general-muted-foreground">
            Every known page{host ? ` on ${host}` : ""} with search, website and indexing data. Use Tree to compare
            sections of the site.
          </p>
        </div>

        {active.isError && !hasData ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-general-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-general-foreground">Pages could not be loaded</p>
            <p className="max-w-md text-sm text-general-muted-foreground">
              The request failed or timed out. Large sites can take a little while; try again.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => active.refetch()} disabled={active.isFetching}>
              {active.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Try again
            </Button>
          </div>
        ) : (
          <>
            <SmartSitemapOverview
              statusCounts={statusCounts}
              selectedStatuses={statuses}
              onToggleStatus={toggleStatus}
              pending={updating}
            />

            <div className="mt-4 mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <SmartSitemapViewToggle value={view} onChange={changeView} />
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-general-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    maxLength={200}
                    placeholder="Search pages by path"
                    aria-label="Search pages by path"
                    className="h-9 bg-white pr-8 pl-9"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-general-muted-foreground hover:bg-secondary"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                {hasFilters ? (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {updating ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-general-muted-foreground" role="status">
                    <Loader2 className="size-3.5 animate-spin" />
                    Updating
                  </span>
                ) : null}
                <PeriodSelector
                  value={period}
                  onValueChange={(value) => updateParams({ period: value === DEFAULT_PERIOD ? null : value })}
                  optInPeriods={OPT_IN_PERIODS}
                />
              </div>
            </div>

            {active.isError && hasData ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white px-4 py-2.5 text-sm">
                <span className="text-general-muted-foreground">The latest change could not be loaded. Showing the previous results.</span>
                <Button variant="ghost" size="sm" onClick={() => active.refetch()} disabled={active.isFetching}>
                  Try again
                </Button>
              </div>
            ) : null}

            {view === "tree" && hasFilters && treeRoot?.nodes.length ? (
              <p className="mb-2 text-xs text-general-muted-foreground">
                The tree shows only pages that match the filters, and folder totals cover those pages.
              </p>
            ) : null}

            {isEmpty ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-general-border-three bg-white px-6 py-12 text-center">
                <p className="text-sm font-medium text-general-foreground">
                  {hasFilters ? "No pages match these filters" : "No pages found yet"}
                </p>
                <p className="max-w-md text-sm text-general-muted-foreground">
                  {hasFilters
                    ? "Try a shorter path or include more indexing statuses."
                    : "Pages appear here once site discovery, Search Console or GA4 finds them."}
                </p>
                {hasFilters ? (
                  <Button variant="outline" size="sm" className="mt-1" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : view === "table" ? (
              <SmartSitemapTable
                pages={listData?.pages ?? null}
                skeletonCount={12}
                updating={updating}
                sort={sort}
                onSort={changeSort}
                pageHref={pageHref}
              />
            ) : (
              <SmartSitemapTree
                businessId={businessId}
                params={queryParams}
                rootQuery={treeQuery}
                filtered={hasFilters}
                sort={sort}
                onSort={changeSort}
                pageHref={pageHref}
              />
            )}

            {view === "table" && listData ? (
              <SmartSitemapPagination
                page={listData.pagination.page}
                totalPages={listData.pagination.totalPages}
                total={listData.total}
                pageSize={PAGE_SIZE}
                onPageChange={changePage}
                disabled={updating}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
