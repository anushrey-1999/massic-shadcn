"use client"

import * as React from "react"
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Download, Plus } from "lucide-react"
import Link from "next/link"

import { DataTable } from "@/components/filter-table"
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Button } from "@/components/ui/button"

import {
  getCampaignsTableColumns,
  type ReviewCampaignRow,
} from "./campaigns-table-columns"

const demoCampaigns: ReviewCampaignRow[] = [
  {
    id: "camp_1",
    name: "Google Reviews",
    platform: "google",
    isDefault: true,
    createdAt: new Date(2026, 0, 15),
    totalClicks: 2450,
    steps: 5,
  },
  {
    id: "camp_2",
    name: "Yelp",
    platform: "yelp",
    isDefault: false,
    createdAt: new Date(2026, 0, 10),
    totalClicks: 1875,
    steps: 4,
  },
  {
    id: "camp_3",
    name: "Google Reviews",
    platform: "google",
    isDefault: false,
    createdAt: new Date(2026, 0, 5),
    totalClicks: 3200,
    steps: 6,
  },
  {
    id: "camp_4",
    name: "Yelp",
    platform: "yelp",
    isDefault: false,
    createdAt: new Date(2025, 11, 28),
    totalClicks: 1520,
    steps: 3,
  },
  {
    id: "camp_5",
    name: "Google Reviews",
    platform: "google",
    isDefault: false,
    createdAt: new Date(2025, 11, 20),
    totalClicks: 2890,
    steps: 5,
  },
]

export function CampaignsTableClient({ businessId }: { businessId: string }) {
  const [campaigns, setCampaigns] = React.useState<ReviewCampaignRow[]>(demoCampaigns)

  const columns = React.useMemo(() => getCampaignsTableColumns(businessId), [businessId])

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    globalFilterFn: "includesString",
  })

  return (
    <>
      <DataTable
        table={table}
        emptyMessage="No campaigns found."
        pageSizeOptions={[10, 20, 30, 50]}
      >
        <DataTableAdvancedToolbar table={table} className="flex-wrap gap-2">
          <DataTableSearch
            value={globalFilter}
            onChange={(value) => setGlobalFilter(value)}
            placeholder="Search campaigns..."
          />
          <DataTableSortList table={table} align="start" />
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" type="button" aria-label="Download">
            <Download className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1" />
          <Button asChild className="gap-2 shrink-0">
            <Link href={`/business/${businessId}/reviews/campaigns/new`}>
              <Plus className="h-4 w-4" />
              Add
            </Link>
          </Button>
        </DataTableAdvancedToolbar>
      </DataTable>
    </>
  )
}
