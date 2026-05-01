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

import { Plus } from "lucide-react"

import { DataTable } from "@/components/filter-table"
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  getCampaignsTableColumns,
  type ReviewCampaignRow,
} from "./campaigns-table-columns"
import { useReviewCampaignsList, type ReviewCampaignsSort } from "@/hooks/use-review-campaigns"
import { useDebounce } from "@/hooks/use-debounce"

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
  const [confirmNavigation, setConfirmNavigation] = React.useState<{
    href: string
    title: string
    description: string
    confirmLabel: string
  } | null>(null)
  const columns = React.useMemo(
    () => getCampaignsTableColumns(
      businessId,
      currentTab,
      selectedLocationIdForApi,
      (href) => setConfirmNavigation({
        href,
        title: "Edit campaign?",
        description: "Editing a campaign publishes a new active version for future customers. Existing started customer journeys stay on their original version.",
        confirmLabel: "Continue",
      })
    ),
    [businessId, currentTab, selectedLocationIdForApi]
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

  const { data: campaignsResponse, isLoading, isFetching } = useReviewCampaignsList(
    businessId,
    selectedLocationIdForApi,
    apiSort,
    debouncedSearch,
    pagination
  )
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
        isFetching={isFetching}
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
              router.push(`/business/${businessId}/reviews/campaigns/new?tab=${currentTab}${selectedLocationIdForApi ? `&locationId=${encodeURIComponent(selectedLocationIdForApi)}` : ""}`)
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </DataTableAdvancedToolbar>
      </DataTable>
      <AlertDialog open={!!confirmNavigation} onOpenChange={(open) => !open && setConfirmNavigation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmNavigation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmNavigation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmNavigation) return
                router.push(confirmNavigation.href)
                setConfirmNavigation(null)
              }}
            >
              {confirmNavigation?.confirmLabel || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
