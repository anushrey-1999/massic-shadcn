"use client"

import * as React from "react"
import type { ColumnDef, RowSelectionState, SortingState, Updater } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { DataTable } from "@/components/filter-table"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options"
import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"
import { formatVolume } from "@/lib/format"
import type { PagePlannerPlanItem } from "@/types/page-planner-types"

type Props = {
  data: PagePlannerPlanItem[]
  isLoading?: boolean
  isFetching?: boolean
  emptyMessage?: string
  rowSelection: RowSelectionState
  onRowSelectionChange: (updaterOrValue: Updater<RowSelectionState>) => void
}

function getRowId(row: PagePlannerPlanItem, index: number) {
  return row.page_id || row.keyword || `row-${index}`
}

export function PagesRefineTable({
  data,
  isLoading = false,
  isFetching = false,
  emptyMessage = "No pages found.",
  rowSelection,
  onRowSelectionChange,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns = React.useMemo((): ColumnDef<PagePlannerPlanItem>[] => {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
        minSize: 40,
        maxSize: 40,
      },
      {
        id: "keyword",
        accessorKey: "keyword",
        header: () => <span className="text-xs text-muted-foreground">Page</span>,
        cell: ({ row }) => (
          <Typography variant="p" className="truncate">
            {row.getValue<string>("keyword") || "N/A"}
          </Typography>
        ),
        enableSorting: true,
        size: 320,
        minSize: 220,
        maxSize: 500,
      },
      {
        id: "page_type",
        accessorKey: "page_type",
        header: () => <span className="text-xs text-muted-foreground">Type</span>,
        cell: ({ row }) => (
          <Typography variant="p" className="truncate">
            {row.getValue<string>("page_type") || "—"}
          </Typography>
        ),
        enableSorting: true,
        size: 180,
        minSize: 140,
        maxSize: 260,
      },
      {
        id: "search_volume",
        accessorKey: "search_volume",
        header: () => <span className="text-xs text-muted-foreground">Volume</span>,
        cell: ({ row }) => {
          const volume = row.getValue<number | undefined>("search_volume")
          return <Typography variant="p">{formatVolume(volume || 0)}</Typography>
        },
        enableSorting: true,
        size: 120,
        minSize: 110,
        maxSize: 160,
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => <span className="text-xs text-muted-foreground">Status</span>,
        cell: ({ row }) => (
          <Typography variant="p" className="font-mono text-xs">
            {row.getValue<string>("status") || "—"}
          </Typography>
        ),
        enableSorting: true,
        size: 120,
        minSize: 110,
        maxSize: 180,
      },
    ]
  }, [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row, index) => getRowId(row, index),
  })

  return (
    <div className="bg-white rounded-lg h-full flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={emptyMessage}
        showPagination={false}
        disableHorizontalScroll={true}
        className="[&_tbody_tr]:h-10 [&_tbody_td]:py-0.5"
      >
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2" />
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <DataTableViewOptions table={table} align="end" />
          </div>
        </div>
      </DataTable>
    </div>
  )
}

