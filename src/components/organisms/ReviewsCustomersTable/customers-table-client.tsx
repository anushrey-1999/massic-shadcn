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

import { DataTable } from "@/components/filter-table"
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import {
  getCustomersTableColumns,
  type NewRowDraft,
  type ReviewCustomerRow,
} from "./customers-table-columns"

const demoCustomers: ReviewCustomerRow[] = [
  {
    id: "c_1",
    name: "Jane Smith",
    phone: "555-555-5555",
    email: "jane@gmail.com",
    createdAt: new Date(2026, 0, 8),
    campaignsLinked: [{ platform: "google", label: "Google Reviews" }],
    status: "completed",
  },
  {
    id: "c_2",
    name: "Jane Smith",
    phone: "-",
    email: "jane@gmail.com",
    createdAt: new Date(2026, 0, 7),
    campaignsLinked: [{ platform: "yelp", label: "Yelp" }],
    status: "failed",
  },
  {
    id: "c_3",
    name: "Jane Smith",
    phone: "555-555-5555",
    email: "-",
    createdAt: new Date(2026, 0, 6),
    campaignsLinked: [],
    status: "pending",
  },
  {
    id: "c_4",
    name: "Jane Smith",
    phone: "555-555-5555",
    email: "jane@gmail.com",
    createdAt: new Date(2026, 0, 5),
    campaignsLinked: [
      { platform: "google", label: "Google Reviews" },
      { platform: "yelp", label: "Yelp" },
    ],
    status: "in-progress",
  },
]

const NEW_ROW_ID = "__new__"

const initialDraft: NewRowDraft = {
  name: "",
  phone: "",
  email: "",
  dateCreatedText: "",
  campaign: "",
}

function parseDateText(text: string): Date {
  const d = new Date(text)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export function CustomersTableClient() {
  const [customers, setCustomers] = React.useState<ReviewCustomerRow[]>(demoCustomers)
  const [isAddingRow, setIsAddingRow] = React.useState(false)
  const [draft, setDraft] = React.useState<NewRowDraft>(initialDraft)
  const [showBeginCampaignDialog, setShowBeginCampaignDialog] = React.useState(false)

  const onDraftChange = React.useCallback((field: keyof NewRowDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }, [])

  const onSaveNewRow = React.useCallback(() => {
    setShowBeginCampaignDialog(true)
  }, [])

  const onConfirmBeginCampaign = React.useCallback(() => {
    const campaignsLinked =
      draft.campaign === "Google Reviews"
        ? [{ platform: "google" as const, label: "Google Reviews" }]
        : draft.campaign === "Yelp"
          ? [{ platform: "yelp" as const, label: "Yelp" }]
          : []
    const newRow: ReviewCustomerRow = {
      id: `c_${Date.now()}`,
      name: draft.name.trim() || "-",
      phone: draft.phone.trim() || "-",
      email: draft.email.trim() || "-",
      createdAt: parseDateText(draft.dateCreatedText),
      campaignsLinked,
      status: "pending",
    }
    setCustomers((prev) => [newRow, ...prev])
    setIsAddingRow(false)
    setDraft(initialDraft)
    setShowBeginCampaignDialog(false)
  }, [draft])

  const onCancelNewRow = React.useCallback(() => {
    setIsAddingRow(false)
    setDraft(initialDraft)
  }, [])

  const tableData = React.useMemo(() => {
    if (!isAddingRow) return customers
    const draftRow: ReviewCustomerRow = {
      id: NEW_ROW_ID,
      name: draft.name,
      phone: draft.phone,
      email: draft.email,
      createdAt: new Date(8640000000000000),
      campaignsLinked:
        draft.campaign === "Google Reviews"
          ? [{ platform: "google", label: "Google Reviews" }]
          : draft.campaign === "Yelp"
            ? [{ platform: "yelp", label: "Yelp" }]
            : [],
      status: "pending",
    }
    return [draftRow, ...customers]
  }, [customers, isAddingRow, draft])

  const addRowOptions = React.useMemo(
    () =>
      isAddingRow
        ? {
            newRowId: NEW_ROW_ID,
            draft,
            onDraftChange,
            onSaveNewRow,
            onCancelNewRow,
          }
        : undefined,
    [isAddingRow, draft, onDraftChange, onSaveNewRow, onCancelNewRow]
  )

  const columns = React.useMemo(
    () => getCustomersTableColumns(addRowOptions),
    [addRowOptions]
  )

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 24,
  })

  const table = useReactTable({
    data: tableData,
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
        emptyMessage="No customers found."
        pageSizeOptions={[10, 24, 30, 50, 100]}
      >
        <DataTableAdvancedToolbar table={table} className="flex-wrap gap-2">
          <DataTableSearch
            value={globalFilter}
            onChange={(value) => setGlobalFilter(value)}
            placeholder="Search..."
          />
          <DataTableSortList table={table} align="start" />
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" type="button" aria-label="Download">
            <Download className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1" />
          <Button
            type="button"
            className="gap-2 shrink-0"
            disabled={isAddingRow}
            onClick={() => {
              setIsAddingRow(true)
              setDraft(initialDraft)
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </DataTableAdvancedToolbar>
      </DataTable>

      <Dialog open={showBeginCampaignDialog} onOpenChange={setShowBeginCampaignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Begin Campaign</DialogTitle>
            <DialogDescription>
              Confirming will start the communication sequence for the selected campaign and customers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBeginCampaignDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={onConfirmBeginCampaign}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

