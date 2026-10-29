"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDownWideNarrow, Check, ChevronDown, Loader2, RefreshCw, Search, X } from "lucide-react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PeriodSelector } from "@/components/molecules/analytics/PeriodSelector"
import { ANALYTICS_TOOLBAR_BUTTON_CLASS } from "@/components/molecules/analytics/AnalyticsHeaderActions"
import { SmartSitemapOverview } from "@/components/organisms/smart-sitemap/SmartSitemapOverview"
import {
  SmartSitemapPageCard,
  SmartSitemapPageCardSkeleton,
} from "@/components/organisms/smart-sitemap/SmartSitemapPageCard"
import { SmartSitemapPagination } from "@/components/organisms/smart-sitemap/SmartSitemapPagination"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import {
  SMART_SITEMAP_SORTS,
  SMART_SITEMAP_STATUSES,
  useSmartSitemapList,
  type SmartSitemapSort,
  type SmartSitemapStatus,
} from "@/hooks/use-smart-sitemap"
import { siteHost } from "@/lib/smart-sitemap"
import { resolveTimePeriodRange, type OptInTimePeriod, type TimePeriodValue } from "@/utils/analytics-period"

const PAGE_SIZE = 24
const DEFAULT_PERIOD: TimePeriodValue = "60 days"
const DEFAULT_SORT: SmartSitemapSort = "gsc.clicks"
const OPT_IN_PERIODS: readonly OptInTimePeriod[] = ["60 days"]

const SORT_OPTIONS: Record<SmartSitemapSort, { label: string; hint?: string; order: "asc" | "desc" }> = {
  "gsc.clicks": { label: "Clicks", order: "desc" },
  "gsc.impressions": { label: "Impressions", order: "desc" },
  "gsc.position": { label: "Avg. position", hint: "Best first", order: "asc" },
  "ga4.sessions": { label: "Sessions", order: "desc" },
  "ga4.keyEvents": { label: "Key events", order: "desc" },
}

function readPeriod(value: string | null): TimePeriodValue {
  return value && resolveTimePeriodRange(value as TimePeriodValue) ? (value as TimePeriodValue) : DEFAULT_PERIOD
}

function readSort(value: string | null): SmartSitemapSort {
  return SMART_SITEMAP_SORTS.find((sort) => sort === value) ?? DEFAULT_SORT
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
  const sort = readSort(searchParams.get("sort"))
  const statuses = useMemo(() => readStatuses(searchParams.get("status")), [searchParams])
  const page = readPage(searchParams.get("page"))
  const urlSearch = searchParams.get("q") ?? ""

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

  const listQuery = useSmartSitemapList(businessId, {
    period,
    page,
    limit: PAGE_SIZE,
    sortBy: sort,
    sortOrder: SORT_OPTIONS[sort].order,
    search: urlSearch || undefined,
    indexingStatuses: statuses,
  })
  const data = listQuery.data
  const updating = listQuery.isFetching && !listQuery.isLoading
  const hasFilters = Boolean(urlSearch || statuses.length)

  const toggleStatus = (status: SmartSitemapStatus) => {
    const next = statuses.includes(status) ? statuses.filter((value) => value !== status) : [...statuses, status]
    updateParams({ status: next.length ? next.join(",") : null })
  }

  const clearFilters = () => {
    setSearchInput("")
    updateParams({ q: null, status: null })
  }

  const changePage = (nextPage: number) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null }, false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Pages beyond the end (e.g. after a filter shrinks the list) fall back to the last page.
  useEffect(() => {
    if (data && data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
      updateParams({ page: data.pagination.totalPages > 1 ? String(data.pagination.totalPages) : null }, false)
    }
  }, [data, page, updateParams])

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: businessName },
    { label: "Analytics", href: `/business/${businessId}/analytics` },
    { label: "Sitemap" },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] flex-1 px-5 py-6 md:px-7">
        <div className="mb-5">
          <h1 className="text-xl font-medium text-general-foreground">Sitemap</h1>
          <p className="mt-1 max-w-2xl text-sm text-general-muted-foreground">
            Every known page{host ? ` on ${host}` : ""}, ranked by search clicks. Indexing shows the latest known
            Google state.
          </p>
        </div>

        {listQuery.isError && !data ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-general-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-general-foreground">Pages could not be loaded</p>
            <p className="max-w-md text-sm text-general-muted-foreground">
              The request failed or timed out. Large sites can take a little while; try again.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
              {listQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Try again
            </Button>
          </div>
        ) : (
          <>
            <SmartSitemapOverview
              statusCounts={data?.meta.indexing.statusCounts ?? null}
              selectedStatuses={statuses}
              onToggleStatus={toggleStatus}
              pending={updating}
            />

            <div className="mt-4 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-80">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-general-muted-foreground hover:bg-general-secondary"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={ANALYTICS_TOOLBAR_BUTTON_CLASS}>
                      <ArrowDownWideNarrow strokeWidth={1.5} />
                      Sort: {SORT_OPTIONS[sort].label}
                      <ChevronDown strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 rounded-[8px] border-general-border">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15px] text-muted-foreground">
                      Sort by
                    </DropdownMenuLabel>
                    {SMART_SITEMAP_SORTS.map((option) => (
                      <DropdownMenuItem
                        key={option}
                        className="h-8 cursor-pointer gap-2"
                        onSelect={() => updateParams({ sort: option === DEFAULT_SORT ? null : option })}
                      >
                        <span className="flex-1">{SORT_OPTIONS[option].label}</span>
                        {SORT_OPTIONS[option].hint ? (
                          <span className="text-xs text-muted-foreground">{SORT_OPTIONS[option].hint}</span>
                        ) : null}
                        {option === sort ? <Check className="size-4 text-primary" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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

            {listQuery.isError && data ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white px-4 py-2.5 text-sm">
                <span className="text-general-muted-foreground">The latest change could not be loaded. Showing the previous results.</span>
                <Button variant="ghost" size="sm" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                  Try again
                </Button>
              </div>
            ) : null}

            {!data ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }, (_, index) => (
                  <SmartSitemapPageCardSkeleton key={index} />
                ))}
              </div>
            ) : data.pages.length ? (
              <div
                className="grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                style={{ opacity: updating ? 0.6 : 1 }}
                aria-busy={updating}
              >
                {data.pages.map((item) => (
                  <SmartSitemapPageCard
                    key={item.id}
                    page={item}
                    href={`/business/${businessId}/analytics/pages/${item.id}${period === DEFAULT_PERIOD ? "" : `?period=${encodeURIComponent(period)}`}`}
                  />
                ))}
              </div>
            ) : (
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
            )}

            {data ? (
              <SmartSitemapPagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={data.total}
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
