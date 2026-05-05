"use client"

import * as React from "react"
import type {
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  MousePointerClick,
  Plus,
  Route,
  Send,
  User,
  XCircle,
} from "lucide-react"

import { DataTable } from "@/components/filter-table"
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar"
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list"
import { DataTableSearch } from "@/components/filter-table/data-table-search"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebounce } from "@/hooks/use-debounce"
import { useApproveReviewCustomers, useReviewCampaignsList } from "@/hooks/use-review-campaigns"
import {
  useDeleteReviewCustomer,
  useReviewCustomerTimeline,
  useReviewCustomers,
  useSaveReviewCustomers,
  useSendReviewCustomerNow,
  type ReviewCustomerListItem,
  type ReviewCustomerListSort,
  type ReviewCustomerStatus,
} from "@/hooks/use-review-customers"
import { isValidUsPhone, normalizeUsPhoneToE164 } from "@/utils/phone"
import { getReviewPlatformIdFromUrl } from "@/utils/review-platforms"

import {
  getCustomersTableColumns,
  type CampaignOption,
  type EditableField,
  type ReviewCustomerRow,
  type RowValidationErrors,
} from "./customers-table-columns"

function normalizeDisplayValue(value: string | null | undefined) {
  if (!value || value === "-") return ""
  return String(value)
}

function normalizeStatus(status: string) {
  switch (status) {
    case "WAITING_FOR_APPROVAL":
      return "waiting-approval" as const
    case "PENDING":
      return "pending" as const
    case "IN_PROGRESS":
      return "in-progress" as const
    case "COMPLETED":
      return "completed" as const
    case "FAILED":
      return "failed" as const
    default:
      return "pending" as const
  }
}

function isRowEmpty(row: ReviewCustomerRow) {
  return !row.name.trim() && !row.phone.trim() && !row.email.trim() && !row.campaignId
}

function isValidEmail(value: string) {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPhone(value: string) {
  return isValidUsPhone(value)
}

function createDraftRow(id: string, defaultCampaign?: CampaignOption | null): ReviewCustomerRow {
  return {
    id,
    name: "",
    phone: "",
    email: "",
    createdAt: null,
    campaignId: defaultCampaign?.id || "",
    campaignName: defaultCampaign?.name || "",
    campaignPlatform: defaultCampaign?.platform || "google",
    status: "draft",
    isNew: true,
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function getTimelineEventConfig(type: string) {
  switch (type) {
    case "SENT":
      return {
        icon: Send,
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      }
    case "SKIPPED":
      return {
        icon: Route,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      }
    case "FAILED":
      return {
        icon: XCircle,
        badge: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500",
      }
    case "CLICKED":
      return {
        icon: MousePointerClick,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      }
    case "COMPLETED":
      return {
        icon: CheckCircle2,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      }
    case "STARTED":
      return {
        icon: Clock,
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        dot: "bg-violet-500",
      }
    case "CREATED":
    default:
      return {
        icon: User,
        badge: "bg-muted text-muted-foreground border-border",
        dot: "bg-muted-foreground",
      }
  }
}

function getActivityStatusConfig(status: string) {
  switch (status) {
    case "CLICKED":
      return {
        label: "Clicked",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      }
    case "SENT":
      return {
        label: "Sent",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      }
    case "SKIPPED":
      return {
        label: "Skipped",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      }
    case "FAILED":
      return {
        label: "Failed",
        badge: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500",
      }
    case "NEXT":
      return {
        label: "Next",
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        dot: "bg-violet-500",
      }
    case "PROCESSED":
      return {
        label: "Processed",
        badge: "bg-slate-50 text-slate-700 border-slate-200",
        dot: "bg-slate-500",
      }
    case "PLANNED":
    default:
      return {
        label: "Planned",
        badge: "bg-muted text-muted-foreground border-border",
        dot: "bg-muted-foreground",
      }
  }
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: React.ReactNode
}) {
  const tooltipValue = typeof value === "string" ? value : undefined
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="min-w-0 truncate text-sm font-medium text-foreground">
            {value || "-"}
          </div>
        </TooltipTrigger>
        {tooltipValue ? (
          <TooltipContent sideOffset={4}>{tooltipValue}</TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  )
}

export function CustomersTableClient({
  businessId,
  selectedLocationIdForApi,
}: {
  businessId: string
  selectedLocationIdForApi?: string | null
}) {
  const [draftRows, setDraftRows] = React.useState<ReviewCustomerRow[]>([])
  const [existingRows, setExistingRows] = React.useState<ReviewCustomerRow[]>([])
  const [originalRows, setOriginalRows] = React.useState<ReviewCustomerRow[]>([])
  const [editingRow, setEditingRow] = React.useState<{
    rowId: string
    field: EditableField
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ReviewCustomerRow | null>(null)
  const [selectedCustomer, setSelectedCustomer] = React.useState<ReviewCustomerRow | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<ReviewCustomerStatus | "all">("all")
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void | Promise<void>
  } | null>(null)

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedSearch = useDebounce(globalFilter, 400)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 24,
  })

  const apiSort = React.useMemo<ReviewCustomerListSort | undefined>(() => {
    const current = sorting[0]
    if (!current?.id) return undefined
    const sortBy = current.id === "campaignId" ? "campaignName" : current.id
    if (!["name", "createdAt", "status", "campaignName"].includes(sortBy)) return undefined
    return {
      sortBy: sortBy as ReviewCustomerListSort["sortBy"],
      sortDir: current.desc ? "desc" : "asc",
    }
  }, [sorting])

  const { data: customersResponse, isLoading } = useReviewCustomers(
    businessId,
    selectedLocationIdForApi || null,
    debouncedSearch,
    apiSort,
    pagination,
    {
      status: statusFilter === "all" ? null : statusFilter,
    }
  )
  const { data: campaignsResponse } = useReviewCampaignsList(
    businessId,
    selectedLocationIdForApi || null,
    undefined,
    undefined,
    { pageIndex: 0, pageSize: 100 }
  )
  const saveCustomers = useSaveReviewCustomers()
  const deleteCustomer = useDeleteReviewCustomer()
  const approveCustomers = useApproveReviewCustomers()
  const sendCustomerNow = useSendReviewCustomerNow()
  const timelineQuery = useReviewCustomerTimeline(businessId, selectedCustomer?.id || null)
  const timeline = timelineQuery.data?.data
  const canSendNow = Boolean(
    timeline?.nextStep &&
    timeline.status !== "WAITING_FOR_APPROVAL" &&
    timeline.status !== "COMPLETED" &&
    timeline.status !== "FAILED"
  )

  const campaignOptions = React.useMemo<CampaignOption[]>(() => {
    const items = campaignsResponse?.data || []
    return items.map((item) => ({
      id: String(item.id),
      name: item.name,
      platform: getReviewPlatformIdFromUrl(item.reviewDestinationUrl || ""),
      isDefault: Boolean(item.isDefault),
    }))
  }, [campaignsResponse?.data])

  const defaultCampaignOption = React.useMemo(
    () => campaignOptions.find((option) => option.isDefault) || null,
    [campaignOptions]
  )

  const nextDraftId = React.useRef(1)
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!defaultCampaignOption) return

    setDraftRows((prev) =>
      prev.map((row) => {
        if (!row.isNew || row.campaignId === defaultCampaignOption.id) return row
        return {
          ...row,
          campaignId: defaultCampaignOption.id,
          campaignName: defaultCampaignOption.name,
          campaignPlatform: defaultCampaignOption.platform,
        }
      })
    )
  }, [defaultCampaignOption])

  React.useEffect(() => {
    if (!editingRow) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (
        target instanceof HTMLElement &&
        (target.closest("[role='dialog']") ||
          target.closest("[role='listbox']") ||
          target.closest("[data-radix-popper-content-wrapper]"))
      ) {
        return
      }

      if (
        target instanceof HTMLElement &&
        target.closest(`[data-row-id="${CSS.escape(editingRow.rowId)}"]`)
      ) {
        return
      }

      setEditingRow(null)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [editingRow])

  React.useEffect(() => {
    const items = customersResponse?.data
    if (!items) return

    const mapped = items.map((item: ReviewCustomerListItem) => {
      const campaign = item.campaign
      const platform = getReviewPlatformIdFromUrl(campaign?.reviewDestinationUrl)
      return {
        id: String(item.id),
        name: item.name || "",
        phone: normalizeDisplayValue(item.phone),
        email: normalizeDisplayValue(item.email),
        createdAt: item.createdAt ? new Date(item.createdAt) : null,
        campaignId: campaign?.id ? String(campaign.id) : "",
        campaignName: campaign?.name || "",
        campaignPlatform: platform,
        status: normalizeStatus(item.status),
      } as ReviewCustomerRow
    })

    setExistingRows(mapped)
    setOriginalRows(mapped)
    setDraftRows([])
    setEditingRow(null)
  }, [customersResponse?.data])

  const sortedExistingRows = React.useMemo(() => {
    if (sorting.length === 0) return existingRows
    const current = sorting[0]
    if (!current?.id) return existingRows

    const sorted = [...existingRows]
    const factor = current.desc ? -1 : 1

    sorted.sort((a, b) => {
      switch (current.id) {
        case "name":
          return a.name.localeCompare(b.name) * factor
        case "phone":
          return a.phone.localeCompare(b.phone) * factor
        case "email":
          return a.email.localeCompare(b.email) * factor
        case "campaignId":
          return a.campaignName.localeCompare(b.campaignName) * factor
        case "status":
          return a.status.localeCompare(b.status) * factor
        case "createdAt":
        default: {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0
          const bTime = b.createdAt ? b.createdAt.getTime() : 0
          return (aTime - bTime) * factor
        }
      }
    })

    return sorted
  }, [existingRows, sorting])

  const tableData = React.useMemo(
    () => [...draftRows, ...sortedExistingRows],
    [draftRows, sortedExistingRows]
  )

  const originalMap = React.useMemo(() => {
    const map = new Map<string, ReviewCustomerRow>()
    originalRows.forEach((row) => map.set(row.id, row))
    return map
  }, [originalRows])

  const newRowsToSave = React.useMemo(
    () => draftRows.filter((row) => !isRowEmpty(row)),
    [draftRows]
  )

  const updatedRowsToSave = React.useMemo(() => {
    return existingRows.filter((row) => {
      const original = originalMap.get(row.id)
      if (!original) return false
      return (
        row.name.trim() !== original.name.trim() ||
        row.phone.trim() !== original.phone.trim() ||
        row.email.trim() !== original.email.trim() ||
        row.campaignId !== original.campaignId
      )
    })
  }, [existingRows, originalMap])

  const rowsToValidate = React.useMemo(() => {
    const ids = new Set<string>()
    newRowsToSave.forEach((row) => ids.add(row.id))
    updatedRowsToSave.forEach((row) => ids.add(row.id))
    return ids
  }, [newRowsToSave, updatedRowsToSave])

  const rowErrors = React.useMemo(() => {
    const errors: Record<string, RowValidationErrors> = {}
    tableData.forEach((row) => {
      if (!rowsToValidate.has(row.id)) return
      const rowError: RowValidationErrors = {}
      if (!row.name.trim()) {
        rowError.name = "Name is required"
      }
      if (!row.campaignId) {
        rowError.campaignId = "Campaign is required"
      }
      if (!row.email.trim() && !row.phone.trim()) {
        rowError.email = "Email or phone is required"
        rowError.phone = "Email or phone is required"
      }
      if (row.email.trim() && !isValidEmail(row.email)) {
        rowError.email = "Invalid email"
      }
      if (row.phone.trim() && !isValidPhone(row.phone)) {
        rowError.phone = "Enter a valid US phone number"
      }
      if (Object.keys(rowError).length > 0) {
        errors[row.id] = rowError
      }
    })
    return errors
  }, [rowsToValidate, tableData])

  const hasValidationErrors = Object.keys(rowErrors).length > 0
  const hasPendingChanges = newRowsToSave.length > 0 || updatedRowsToSave.length > 0

  const rowErrorsRef = React.useRef<Record<string, RowValidationErrors>>({})
  React.useEffect(() => {
    rowErrorsRef.current = rowErrors
  }, [rowErrors])

  const handleDraftChange = React.useCallback(
    (rowId: string, field: EditableField, value: string) => {
      setDraftRows((prev) => {
        const nextRows = prev.map((row) => {
          if (row.id !== rowId) return row
          if (field === "campaignId") {
            const campaign = campaignOptions.find((opt) => opt.id === value)
            return {
              ...row,
              campaignId: value,
              campaignName: campaign?.name || "",
              campaignPlatform: campaign?.platform || "google",
            }
          }
          return { ...row, [field]: value }
        })

        return nextRows
      })
    },
    [campaignOptions]
  )

  const handleExistingChange = React.useCallback(
    (rowId: string, field: EditableField, value: string) => {
      setExistingRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row
          if (field === "campaignId") {
            const campaign = campaignOptions.find((opt) => opt.id === value)
            return {
              ...row,
              campaignId: value,
              campaignName: campaign?.name || "",
              campaignPlatform: campaign?.platform || "google",
            }
          }
          return { ...row, [field]: value }
        })
      )
    },
    [campaignOptions]
  )

  const handleValueChange = React.useCallback(
    (rowId: string, field: EditableField, value: string) => {
      if (rowId.startsWith("new-")) {
        handleDraftChange(rowId, field, value)
      } else {
        handleExistingChange(rowId, field, value)
      }
    },
    [handleDraftChange, handleExistingChange]
  )

  const handleDeleteRow = React.useCallback(
    (rowId: string, isNew?: boolean) => {
      if (isNew || rowId.startsWith("new-")) {
        setConfirmAction({
          title: "Remove draft row?",
          description: "This will remove the unsaved customer row from the table.",
          confirmLabel: "Remove",
          onConfirm: () => {
            setDraftRows((prev) => prev.filter((row) => row.id !== rowId))
          },
        })
        return
      }

      const target = existingRows.find((row) => row.id === rowId)
      if (target) setDeleteTarget(target)
    },
    [existingRows]
  )

  const handleStartEdit = React.useCallback((rowId: string, field: EditableField) => {
    setEditingRow({ rowId, field })
  }, [])

  const handleViewRow = React.useCallback((row: ReviewCustomerRow) => {
    if (!row.isNew) setSelectedCustomer(row)
  }, [])

  const handleApproveRow = React.useCallback(
    (row: ReviewCustomerRow) => {
      if (!row.campaignId) return
      setConfirmAction({
        title: "Approve customer?",
        description: `This will start the campaign journey for ${row.name || "this customer"} immediately.`,
        confirmLabel: "Approve",
        onConfirm: () => approveCustomers.mutate({
          campaignId: row.campaignId,
          customerIds: [row.id],
        }),
      })
    },
    [approveCustomers.mutate]
  )

  const columns = React.useMemo(
    () =>
      getCustomersTableColumns({
        campaignOptions,
        hasDefaultCampaign: Boolean(defaultCampaignOption),
        editingRow,
        onStartEdit: handleStartEdit,
        onValueChange: handleValueChange,
        onDeleteRow: handleDeleteRow,
        onApproveRow: handleApproveRow,
        onViewRow: handleViewRow,
        getRowErrors: (rowId) => rowErrorsRef.current[rowId],
      }),
    [
      campaignOptions,
      defaultCampaignOption,
      editingRow,
      handleStartEdit,
      handleValueChange,
      handleDeleteRow,
      handleApproveRow,
      handleViewRow,
    ]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: customersResponse?.meta?.totalPages ?? -1,
    globalFilterFn: "includesString",
    autoResetAll: false,
    autoResetPageIndex: false,
  })

  const handleSaveEdits = React.useCallback(async () => {
    if (!hasPendingChanges || hasValidationErrors) return
    if (!selectedLocationIdForApi) return

    setConfirmAction({
      title: "Save customer changes?",
      description: "This will save the customer rows you added or edited.",
      confirmLabel: "Save",
      onConfirm: async () => {
        const payload = {
          businessId,
          locationId: selectedLocationIdForApi,
          customers: [
            ...newRowsToSave.map((row) => ({
              name: row.name.trim(),
              phone: normalizeUsPhoneToE164(row.phone) || null,
              email: row.email.trim() || null,
              campaignId: row.campaignId,
            })),
            ...updatedRowsToSave.map((row) => ({
              id: row.id,
              name: row.name.trim(),
              phone: normalizeUsPhoneToE164(row.phone) || null,
              email: row.email.trim() || null,
              campaignId: row.campaignId,
            })),
          ],
        }

        await saveCustomers.mutateAsync(payload)
      },
    })
  }, [
    businessId,
    selectedLocationIdForApi,
    hasPendingChanges,
    hasValidationErrors,
    newRowsToSave,
    updatedRowsToSave,
    saveCustomers,
  ])

  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    await deleteCustomer.mutateAsync({ id: deleteTarget.id, businessId })
    setDeleteTarget(null)
  }, [deleteTarget, deleteCustomer, businessId])

  const selectedWaitingRows = React.useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows
        .map((row) => row.original)
        .filter((row) => row.status === "waiting-approval" && row.campaignId),
    [table, rowSelection]
  )

  const approveSelected = React.useCallback(() => {
    if (selectedWaitingRows.length === 0) return
    setConfirmAction({
      title: "Approve selected customers?",
      description: `This will start campaign journeys for ${selectedWaitingRows.length} selected waiting customer${selectedWaitingRows.length === 1 ? "" : "s"}.`,
      confirmLabel: "Approve selected",
      onConfirm: () => {
        const byCampaign = new Map<string, string[]>()
        selectedWaitingRows.forEach((row) => {
          const ids = byCampaign.get(row.campaignId) || []
          ids.push(row.id)
          byCampaign.set(row.campaignId, ids)
        })
        byCampaign.forEach((customerIds, campaignId) => {
          approveCustomers.mutate({ campaignId, customerIds })
        })
        setRowSelection({})
      },
    })
  }, [approveCustomers, selectedWaitingRows])

  const approveAllWaitingForVisibleCampaigns = React.useCallback(() => {
    const campaignIds = Array.from(
      new Set(tableData.filter((row) => row.status === "waiting-approval").map((row) => row.campaignId).filter(Boolean))
    )
    if (campaignIds.length === 0) return
    setConfirmAction({
      title: "Approve all waiting customers?",
      description: "This will approve every waiting customer in the visible campaigns and start their campaign journeys immediately.",
      confirmLabel: "Approve all",
      onConfirm: () => {
        campaignIds.forEach((campaignId) => {
          approveCustomers.mutate({ campaignId, approveAll: true })
        })
      },
    })
  }, [approveCustomers, tableData])

  const handleSendNow = React.useCallback(() => {
    if (!selectedCustomer || !canSendNow) return
    const nextStep = timeline?.nextStep
    setConfirmAction({
      title: "Send campaign step now?",
      description: nextStep
        ? `This will send ${nextStep.type} step ${nextStep.orderIndex} now. Future steps will still follow the existing campaign schedule.`
        : "This will send the next campaign step now.",
      confirmLabel: "Send now",
      onConfirm: () => sendCustomerNow.mutate({
        id: selectedCustomer.id,
        businessId,
      }),
    })
  }, [businessId, canSendNow, selectedCustomer, sendCustomerNow, timeline?.nextStep])

  return (
    <>
      <div ref={tableContainerRef}>
        <DataTable
          table={table}
          emptyMessage="No customers found."
          pageSizeOptions={[10, 24, 30, 50, 100]}
          isLoading={isLoading}
          disableHorizontalScroll
          onRowClick={(row) => {
            if (!row.isNew) handleStartEdit(row.id, "name")
          }}
          selectedRowId={selectedCustomer?.id || null}
        >
          <DataTableAdvancedToolbar table={table} className="flex-wrap gap-2">
            <DataTableSearch
              value={globalFilter}
              onChange={(value) => setGlobalFilter(value)}
              placeholder="Search..."
            />
            <DataTableSortList table={table} align="start" />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as ReviewCustomerStatus | "all")
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
            >
              <SelectTrigger className="h-9 w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="WAITING_FOR_APPROVAL">Waiting for approval</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-0 flex-1" />
            {selectedWaitingRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={approveSelected}
                disabled={approveCustomers.isPending}
              >
                Approve selected
              </Button>
            )}
            {tableData.some((row) => row.status === "waiting-approval") && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={approveAllWaitingForVisibleCampaigns}
                disabled={approveCustomers.isPending}
              >
                Approve all waiting
              </Button>
            )}
            {hasPendingChanges && (
              <Button
                type="button"
                className="gap-2 shrink-0"
                onClick={handleSaveEdits}
                disabled={hasValidationErrors || saveCustomers.isPending}
              >
                <Check className="h-4 w-4" />
                Save Edits
              </Button>
            )}
            <Button
              type="button"
              className="gap-2 shrink-0"
              onClick={() => {
                const nextId = `new-${nextDraftId.current++}`
                setDraftRows((prev) => [...prev, createDraftRow(nextId, defaultCampaignOption)])
              }}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DataTableAdvancedToolbar>
        </DataTable>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const action = confirmAction
                setConfirmAction(null)
                await action?.onConfirm()
              }}
            >
              {confirmAction?.confirmLabel || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the customer and related tracking links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base">
                  {selectedCustomer?.name || "Customer"}
                </SheetTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Campaign journey, scheduled messages, and activity history
                </p>
              </div>
              {timelineQuery.data?.data?.status ? (
                <Badge variant="outline" className="shrink-0 bg-card">
                  {timelineQuery.data.data.status.replaceAll("_", " ")}
                </Badge>
              ) : null}
            </div>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            {timelineQuery.isLoading ? (
              <div className="p-5 text-sm text-muted-foreground">Loading timeline...</div>
            ) : timelineQuery.data?.data ? (
              <div className="space-y-5 p-5">
                <div className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Customer Overview</p>
                      <p className="text-xs text-muted-foreground">
                        {timelineQuery.data.data.campaign?.name || selectedCustomer?.campaignName || "No campaign linked"}
                      </p>
                    </div>
                    {timelineQuery.data.data.waitingReason ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {timelineQuery.data.data.waitingReason}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Ready
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem
                      icon={User}
                      label="Customer"
                      value={timelineQuery.data.data.name}
                    />
                    <DetailItem
                      icon={Route}
                      label="Campaign"
                      value={timelineQuery.data.data.campaign?.name || selectedCustomer?.campaignName}
                    />
                    <DetailItem
                      icon={Mail}
                      label="Email"
                      value={timelineQuery.data.data.email || "No email"}
                    />
                    <DetailItem
                      icon={MessageSquare}
                      label="Phone"
                      value={timelineQuery.data.data.phone || "No phone"}
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Next Scheduled Step</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={handleSendNow}
                      disabled={!canSendNow || sendCustomerNow.isPending}
                    >
                      {sendCustomerNow.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {sendCustomerNow.isPending ? "Sending..." : "Send now"}
                    </Button>
                  </div>
                  {timelineQuery.data.data.nextStep ? (
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem
                        icon={timelineQuery.data.data.nextStep.type === "EMAIL" ? Mail : MessageSquare}
                        label="Activity"
                        value={`${timelineQuery.data.data.nextStep.type} step ${timelineQuery.data.data.nextStep.orderIndex}`}
                      />
                      <DetailItem
                        icon={CalendarDays}
                        label="Scheduled"
                        value={formatDateTime(timelineQuery.data.data.nextStep.scheduledAt)}
                      />
                      <DetailItem
                        icon={Clock}
                        label="Timezone"
                        value={timelineQuery.data.data.nextStep.timezone}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No upcoming step. The customer may be waiting for approval, completed, failed, or at the end of the campaign.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Campaign Activity Plan</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {timelineQuery.data.data.plannedActivities.length} steps
                    </Badge>
                  </div>

                  <div className="relative space-y-0 pl-4">
                    <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border" />
                    {timelineQuery.data.data.plannedActivities.map((activity) => {
                      const config = getActivityStatusConfig(activity.status)
                      const Icon = activity.type === "EMAIL" ? Mail : MessageSquare
                      const messageContent = activity.content || activity.contentPreview
                      return (
                        <div key={`${activity.type}-${activity.orderIndex}`} className="relative pb-4 last:pb-0">
                          <div className="absolute left-0 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                            <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                          </div>
                          <div className="ml-10 rounded-lg border bg-card p-3 shadow-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm font-semibold">
                                    Step {activity.orderIndex}: {activity.type === "EMAIL" ? "Email" : "SMS"}
                                  </p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {activity.scheduledAt
                                    ? `Scheduled for ${formatDateTime(activity.scheduledAt)}`
                                    : `Runs ${activity.sequenceDays === 0 ? "on start day" : `${activity.sequenceDays} day${activity.sequenceDays === 1 ? "" : "s"} after start`}`}
                                </p>
                              </div>
                              <Badge variant="outline" className={config.badge}>
                                {config.label}
                              </Badge>
                            </div>

                            {activity.subject ? (
                              <p className="mt-3 whitespace-pre-wrap break-words text-xs font-medium">
                                {activity.subject}
                              </p>
                            ) : null}
                            {messageContent ? (
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                                {messageContent}
                              </p>
                            ) : null}
                            {activity.buttonText ? (
                              <p className="mt-2 inline-flex max-w-full rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                                <span className="shrink-0">Button:&nbsp;</span>
                                <span className="break-words">{activity.buttonText}</span>
                              </p>
                            ) : null}
                            {activity.skipReason ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                Skipped: {activity.skipReason}
                              </p>
                            ) : null}
                            {activity.errorMessage ? (
                              <p className="mt-2 text-xs font-medium text-red-700">
                                Error: {activity.errorMessage}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">What Happened</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {timelineQuery.data.data.events.length} events
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {timelineQuery.data.data.events.map((event, index) => {
                      const config = getTimelineEventConfig(event.type)
                      const Icon = config.icon
                      return (
                        <div
                          key={`${event.type}-${event.occurredAt}-${index}`}
                          className="relative rounded-lg border bg-card p-3 shadow-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="truncate text-sm font-medium">
                                        {event.label}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={4}>{event.label}</TooltipContent>
                                  </Tooltip>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDateTime(event.occurredAt)}
                                  </p>
                                </div>
                                <Badge variant="outline" className={config.badge}>
                                  {event.type}
                                </Badge>
                              </div>

                              {(event.activity || event.skipReason || event.errorMessage) ? (
                                <>
                                  <Separator className="my-3" />
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {event.activity ? (
                                      <>
                                        <div>
                                          <p className="text-muted-foreground">Activity</p>
                                          <p className="font-medium">
                                            {event.activity.type} step {event.activity.orderIndex}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Sequence Day</p>
                                          <p className="font-medium">{event.activity.sequenceDays}</p>
                                        </div>
                                      </>
                                    ) : null}
                                    {event.skipReason ? (
                                      <div className="col-span-2">
                                        <p className="text-muted-foreground">Skip Reason</p>
                                        <p className="font-medium text-amber-700">{event.skipReason}</p>
                                      </div>
                                    ) : null}
                                    {event.errorMessage ? (
                                      <div className="col-span-2">
                                        <p className="text-muted-foreground">Error</p>
                                        <p className="font-medium text-red-700">{event.errorMessage}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {timelineQuery.data.data.plannedActivities.length === 0 ? (
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div className="flex gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p>
                        The activity plan will appear after the customer is assigned to a campaign journey.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-5 text-sm text-muted-foreground">Timeline unavailable.</div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
