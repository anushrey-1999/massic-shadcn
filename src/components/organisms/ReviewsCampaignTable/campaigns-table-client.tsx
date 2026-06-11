"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { CalendarDays, Clock, History, Loader2, Mail, MessageSquare, Route, Plus } from "lucide-react"

import { DataTable } from "@/components/filter-table"
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import {
  getCampaignsTableColumns,
  type ReviewCampaignRow,
} from "./campaigns-table-columns"
import {
  useReviewCampaignsList,
  useReviewCampaignVersions,
  type ReviewCampaignVersion,
  type ReviewCampaignsSort,
} from "@/hooks/use-review-campaigns"
import { useDebounce } from "@/hooks/use-debounce"
import { useFeatureActionGuard } from "@/hooks/use-permissions"

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTrigger(triggerType: ReviewCampaignVersion["triggerType"]) {
  return triggerType === "AUTO" ? "Auto" : "Manual"
}

function ensureSmsReviewLink(content: string) {
  if (/\{\{\s*Review Link\s*\}\}/i.test(content)) {
    return content
  }
  return `${content.trim()}\n{{Review Link}}`.trim()
}

export function CampaignsTableClient({
  businessId,
  currentTab = "campaign",
  selectedLocationIdForApi,
}: {
  businessId: string;
  currentTab?: string;
  selectedLocationIdForApi?: string | null;
}) {
  const router = useRouter()
  const guardCreateCampaign = useFeatureActionGuard("reviews.campaigns.create")
  const guardEditCampaign = useFeatureActionGuard("reviews.campaigns.edit")
  const [historyCampaign, setHistoryCampaign] = React.useState<ReviewCampaignRow | null>(null)
  const [selectedVersionId, setSelectedVersionId] = React.useState<string | null>(null)
  const columns = React.useMemo(
    () => getCampaignsTableColumns(
      businessId,
      currentTab,
      selectedLocationIdForApi,
      (href) => {
        if (guardEditCampaign()) router.push(href)
      },
      setHistoryCampaign
    ),
    [businessId, currentTab, guardEditCampaign, router, selectedLocationIdForApi]
  )

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedSearch = useDebounce(globalFilter, 400)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const apiSort = React.useMemo<ReviewCampaignsSort>(() => {
    const current = sorting[0]
    if (!current?.id) return {}
    return {
      sortBy: current.id as ReviewCampaignsSort["sortBy"],
      sortDir: current.desc ? "desc" : "asc",
    }
  }, [sorting])

  const { data: campaignsResponse, isLoading } = useReviewCampaignsList(
    businessId,
    selectedLocationIdForApi,
    apiSort,
    debouncedSearch,
    pagination
  )
  const versionsQuery = useReviewCampaignVersions(historyCampaign?.id || null)
  const versions = versionsQuery.data?.data || []
  const selectedVersion = React.useMemo(
    () => versions.find((version) => version.id === selectedVersionId) || versions[0] || null,
    [selectedVersionId, versions]
  )

  React.useEffect(() => {
    if (!historyCampaign) {
      setSelectedVersionId(null)
      return
    }
    if (!selectedVersionId && versions[0]?.id) {
      setSelectedVersionId(versions[0].id)
    }
  }, [historyCampaign, selectedVersionId, versions])
  const campaigns = React.useMemo<ReviewCampaignRow[]>(() => {
    const items = campaignsResponse?.data || []
    return items.map((item) => {
      const reviewUrl = item.reviewDestinationUrl || ""
      const platform = reviewUrl.toLowerCase().includes("yelp") ? "yelp" : "google"
      return {
        id: String(item.id),
        name: item.name,
        platform,
        isDefault: Boolean(item.isDefault),
        createdAt: new Date(item.createdAt),
        totalClicks: Number(item.totalClicks || 0),
        steps: Number(item.steps || 0),
        metrics: item.metrics,
      }
    })
  }, [campaignsResponse?.data])

  const table = useReactTable({
    data: campaigns,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: campaignsResponse?.meta?.totalPages ?? -1,
    globalFilterFn: "includesString",
  })

  return (
    <>
      <DataTable
        table={table}
        emptyMessage="No campaigns found."
        pageSizeOptions={[10, 20, 30, 50]}
        isLoading={isLoading}
      >
        <DataTableAdvancedToolbar table={table} className="flex-wrap gap-2">
          <DataTableSearch
            value={globalFilter}
            onChange={(value) => setGlobalFilter(value)}
            placeholder="Search campaigns..."
          />
          <DataTableSortList table={table} align="start" />
          <div className="min-w-0 flex-1" />
          <Button
            type="button"
            className="gap-2 shrink-0"
            onClick={() => {
              if (!guardCreateCampaign()) return
              router.push(`/business/${businessId}/reviews/campaigns/new?tab=${currentTab}${selectedLocationIdForApi ? `&locationId=${encodeURIComponent(selectedLocationIdForApi)}` : ""}`)
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </DataTableAdvancedToolbar>
      </DataTable>

      <Sheet open={!!historyCampaign} onOpenChange={(open) => !open && setHistoryCampaign(null)}>
        <SheetContent className="gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base">
                  {historyCampaign?.name || "Campaign"} Version History
                </SheetTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review each saved version and the activity snapshot used for that version.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 bg-card">
                {versions.length} {versions.length === 1 ? "version" : "versions"}
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            {versionsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading version history...
              </div>
            ) : versionsQuery.isError ? (
              <div className="p-5 text-sm text-destructive">
                {versionsQuery.error.message || "Failed to load version history"}
              </div>
            ) : versions.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                No version history found for this campaign.
              </div>
            ) : selectedVersion ? (
              <div className="space-y-4 p-4">
                <div className="rounded-xl border bg-card shadow-xs">
                  <div className="border-b px-3 py-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Versions
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Latest first
                      </span>
                    </div>
                    <div className="space-y-1">
                      {versions.map((version) => {
                        const isSelected = version.id === selectedVersion.id
                        return (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => setSelectedVersionId(version.id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-foreground"
                                : "hover:bg-muted/60"
                            }`}
                          >
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              isSelected ? "border-primary bg-background text-primary" : "bg-background text-muted-foreground"
                            }`}>
                              v{version.versionNumber}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">
                                  {formatDateTime(version.createdAt)}
                                </p>
                                {version.isActive ? (
                                  <Badge variant="outline" className="h-5 shrink-0 bg-emerald-50 px-1.5 text-[10px] text-emerald-700 border-emerald-200">
                                    Active
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {formatTrigger(version.triggerType)} · {version.timezone || "UTC"} · {version.steps} steps
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x border-b text-sm">
                    <div className="px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Route className="h-3 w-3" />
                        Trigger
                      </div>
                      <p className="font-medium">{formatTrigger(selectedVersion.triggerType)}</p>
                    </div>
                    <div className="px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Timezone
                      </div>
                      <p className="truncate font-medium">{selectedVersion.timezone || "UTC"}</p>
                    </div>
                    <div className="px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        Steps
                      </div>
                      <p className="font-medium">{selectedVersion.steps}</p>
                    </div>
                  </div>

                  <div className="border-b px-3 py-2">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">Review URL</p>
                    <p className="truncate text-xs text-muted-foreground" title={selectedVersion.reviewDestinationUrl}>
                      {selectedVersion.reviewDestinationUrl}
                    </p>
                  </div>

                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-primary" />
                        <p className="text-sm font-semibold">
                          Version {selectedVersion.versionNumber} activity snapshot
                        </p>
                      </div>
                      {selectedVersion.isActive ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      ) : null}
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      {selectedVersion.activities.map((activity) => {
                        const Icon = activity.Type === "EMAIL" ? Mail : MessageSquare
                        const content =
                          activity.Type === "SMS"
                            ? ensureSmsReviewLink(activity.Content || "")
                            : activity.Content
                        return (
                          <div
                            key={activity.Id}
                            className="grid grid-cols-[36px_1fr] border-b last:border-b-0"
                          >
                            <div className="flex items-start justify-center bg-muted/30 py-3">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border bg-background">
                                <Icon className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </div>
                            <div className="min-w-0 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium">
                                  Step {activity.OrderIndex}: {activity.Type === "EMAIL" ? "Email" : "SMS"}
                                </p>
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Day {activity.SequenceDays}
                                </span>
                              </div>
                              {activity.Subject ? (
                                <p className="mt-1 text-xs font-medium leading-relaxed text-foreground">
                                  {activity.Subject}
                                </p>
                              ) : null}
                              {content ? (
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                                  {content}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">No message content</p>
                              )}
                              {activity.ButtonText ? (
                                <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground">
                                  Button: {activity.ButtonText}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
