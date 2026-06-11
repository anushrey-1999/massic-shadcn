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
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { useFeatureActionGuard } from "@/hooks/use-permissions"
import {
  useApproveReviewCustomers,
  useReviewCampaignById,
  useReviewCampaignsList,
} from "@/hooks/use-review-campaigns"
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
  type ReviewCustomerRow,
} from "./customers-table-columns"

type CustomerFormState = {
  name: string
  phone: string
  email: string
  campaignId: string
}

type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>

type CustomerDialogState =
  | { mode: "add"; row?: null }
  | { mode: "edit"; row: ReviewCustomerRow }
  | null

type JourneyTimelineItem = {
  key: string
  type: "event" | "activity"
  title: string
  subtitle?: string
  occurredAt?: string | null
  sortTime?: number
  order: number
  statusLabel: string
  statusClassName: string
  marker: "complete" | "pending" | "warning" | "failed"
  icon: React.ComponentType<{ className?: string }>
  subject?: string | null
  content?: string | null
  buttonText?: string | null
  manuallySent?: boolean
  skipReason?: string | null
  errorMessage?: string | null
}

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  campaignId: "",
}

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

function isValidEmail(value: string) {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPhone(value: string) {
  return isValidUsPhone(value)
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

function getLifecycleEventTitle(type: string) {
  switch (type) {
    case "CREATED":
      return "Customer created and assigned to campaign"
    case "STARTED":
      return "Campaign started"
    case "COMPLETED":
      return "Campaign completed"
    case "FAILED":
      return "Campaign failed"
    default:
      return type.replaceAll("_", " ")
  }
}

function getLifecycleEventIcon(type: string) {
  switch (type) {
    case "STARTED":
      return Route
    case "COMPLETED":
      return CheckCircle2
    case "FAILED":
      return XCircle
    case "CREATED":
    default:
      return User
  }
}

function getLifecycleEventMarker(type: string): JourneyTimelineItem["marker"] {
  return type === "FAILED" ? "failed" : "complete"
}

function getActivityMarker(status: string): JourneyTimelineItem["marker"] {
  switch (status) {
    case "SENT":
    case "CLICKED":
    case "PROCESSED":
      return "complete"
    case "SKIPPED":
      return "warning"
    case "FAILED":
      return "failed"
    case "NEXT":
    case "PLANNED":
    default:
      return "pending"
  }
}

function getJourneyMarkerClassName(marker: JourneyTimelineItem["marker"]) {
  switch (marker) {
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "failed":
      return "border-red-200 bg-red-50 text-red-700"
    case "pending":
    default:
      return "border-border bg-background text-muted-foreground"
  }
}

function getJourneyMarkerIcon(marker: JourneyTimelineItem["marker"]) {
  switch (marker) {
    case "complete":
      return CheckCircle2
    case "failed":
      return XCircle
    case "warning":
      return AlertCircle
    case "pending":
    default:
      return Clock
  }
}

export function CustomersTableClient({
  businessId,
  selectedLocationIdForApi,
}: {
  businessId: string
  selectedLocationIdForApi?: string | null
}) {
  const guardCreateCustomer = useFeatureActionGuard("reviews.customers.create")
  const guardEditCustomer = useFeatureActionGuard("reviews.customers.edit")
  const guardDeleteCustomer = useFeatureActionGuard("reviews.customers.delete")
  const guardApproveCustomer = useFeatureActionGuard("reviews.customers.approve")
  const guardSendNow = useFeatureActionGuard("reviews.customers.sendNow")
  const [existingRows, setExistingRows] = React.useState<ReviewCustomerRow[]>([])
  const [customerDialog, setCustomerDialog] = React.useState<CustomerDialogState>(null)
  const [customerForm, setCustomerForm] = React.useState<CustomerFormState>(EMPTY_CUSTOMER_FORM)
  const [customerFormErrors, setCustomerFormErrors] = React.useState<CustomerFormErrors>({})
  const [customerServerError, setCustomerServerError] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ReviewCustomerRow | null>(null)
  const [selectedCustomer, setSelectedCustomer] = React.useState<ReviewCustomerRow | null>(null)
  const [hoveredCampaignId, setHoveredCampaignId] = React.useState<string | null>(null)
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
  const hoveredCampaignQuery = useReviewCampaignById(hoveredCampaignId)
  const timelineQuery = useReviewCustomerTimeline(businessId, selectedCustomer?.id || null)
  const timeline = timelineQuery.data?.data
  const canSendNow = Boolean(
    timeline?.nextStep &&
    timeline.status !== "WAITING_FOR_APPROVAL" &&
    timeline.status !== "COMPLETED" &&
    timeline.status !== "FAILED"
  )
  const journeyTimelineItems = React.useMemo<JourneyTimelineItem[]>(() => {
    if (!timeline) return []

    const campaignName = timeline.campaign?.name || selectedCustomer?.campaignName || ""
    const lifecycleItems = timeline.events
      .filter((event) => ["CREATED", "COMPLETED", "FAILED"].includes(event.type))
      .map((event, index) => {
        const eventTime = new Date(event.occurredAt).getTime()
        const marker = getLifecycleEventMarker(event.type)
        const lifecycleOrder =
          event.type === "CREATED"
            ? 0
            : event.type === "COMPLETED"
                ? 900
                : event.type === "FAILED"
                  ? 901
                  : index
        return {
          key: `event-${event.type}-${event.occurredAt}-${index}`,
          type: "event" as const,
          title: getLifecycleEventTitle(event.type),
          subtitle: event.type === "CREATED"
            ? campaignName || undefined
            : undefined,
          occurredAt: event.occurredAt,
          sortTime: event.type === "COMPLETED"
            ? Number.MAX_SAFE_INTEGER - 1
            : Number.isNaN(eventTime)
              ? undefined
              : eventTime,
          order: lifecycleOrder,
          statusLabel: event.type === "FAILED" ? "Failed" : "Complete",
          statusClassName: event.type === "FAILED"
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200",
          marker,
          icon: getLifecycleEventIcon(event.type),
          errorMessage: event.errorMessage,
        }
      })

    const activityItems = timeline.plannedActivities.map((activity, index) => {
      const displayStatus = activity.status === "CLICKED" ? "SENT" : activity.status
      const config = getActivityStatusConfig(displayStatus)
      const marker = getActivityMarker(activity.status)
      const activityTime = activity.executedAt || activity.scheduledAt
      const sortTime = activityTime ? new Date(activityTime).getTime() : undefined
      const statusLabel = config.label
      return {
        key: `activity-${activity.type}-${activity.orderIndex}`,
        type: "activity" as const,
        title: `Step ${activity.orderIndex}: ${activity.type === "EMAIL" ? "Email" : "SMS"}`,
        subtitle: activity.sentManually && activity.executedAt
          ? `Sent manually on ${formatDateTime(activity.executedAt)}`
          : activity.scheduledAt
          ? `Scheduled for ${formatDateTime(activity.scheduledAt)}`
          : `Runs ${activity.sequenceDays === 0 ? "on start day" : `${activity.sequenceDays} day${activity.sequenceDays === 1 ? "" : "s"} after start`}`,
        occurredAt: activityTime,
        sortTime: sortTime && !Number.isNaN(sortTime) ? sortTime : undefined,
        order: 100 + index,
        statusLabel,
        statusClassName: config.badge,
        marker,
        icon: activity.type === "EMAIL" ? Mail : MessageSquare,
        subject: activity.subject,
        content: activity.content || activity.contentPreview,
        buttonText: activity.buttonText,
        manuallySent: Boolean(activity.sentManually),
        skipReason: activity.skipReason,
        errorMessage: activity.errorMessage,
      }
    })

    return [...lifecycleItems, ...activityItems].sort((a, b) => {
      const aTime = a.sortTime ?? Number.MAX_SAFE_INTEGER
      const bTime = b.sortTime ?? Number.MAX_SAFE_INTEGER
      if (aTime !== bTime) return aTime - bTime
      return a.order - b.order
    })
  }, [selectedCustomer?.campaignName, timeline])

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

  const tableContainerRef = React.useRef<HTMLDivElement | null>(null)
  const existingRowsRef = React.useRef<ReviewCustomerRow[]>([])

  React.useEffect(() => {
    existingRowsRef.current = existingRows
  }, [existingRows])

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
    () => sortedExistingRows,
    [sortedExistingRows]
  )

  const setCustomerFormField = React.useCallback(
    (field: keyof CustomerFormState, value: string) => {
      setCustomerForm((prev) => ({ ...prev, [field]: value }))
      setCustomerFormErrors((prev) => ({ ...prev, [field]: undefined }))
      setCustomerServerError(null)
    },
    []
  )

  const openAddCustomerDialog = React.useCallback(() => {
    if (!guardCreateCustomer()) return
    setCustomerDialog({ mode: "add" })
    setCustomerForm({
      ...EMPTY_CUSTOMER_FORM,
      campaignId: defaultCampaignOption?.id || "",
    })
    setCustomerFormErrors({})
    setCustomerServerError(null)
  }, [defaultCampaignOption, guardCreateCustomer])

  const openEditCustomerDialog = React.useCallback((row: ReviewCustomerRow) => {
    if (!guardEditCustomer()) return
    setCustomerDialog({ mode: "edit", row })
    setCustomerForm({
      name: row.name,
      phone: row.phone,
      email: row.email,
      campaignId: row.campaignId,
    })
    setCustomerFormErrors({})
    setCustomerServerError(null)
  }, [guardEditCustomer])

  const validateCustomerForm = React.useCallback(() => {
    const errors: CustomerFormErrors = {}
    const name = customerForm.name.trim()
    const email = customerForm.email.trim()
    const phone = customerForm.phone.trim()
    const normalizedPhone = normalizeUsPhoneToE164(phone)
    const editingId = customerDialog?.mode === "edit" ? customerDialog.row.id : null

    if (!name) errors.name = "Name is required"
    if (!customerForm.campaignId) errors.campaignId = "Campaign is required"
    if (!email && !phone) {
      errors.email = "Email or phone is required"
      errors.phone = "Email or phone is required"
    }
    if (email && !isValidEmail(email)) errors.email = "Invalid email"
    if (phone && !isValidPhone(phone)) errors.phone = "Enter a valid US phone number"

    const duplicateEmail = email
      ? existingRows.some(
          (row) =>
            row.id !== editingId &&
            row.email.trim().toLowerCase() === email.toLowerCase()
        )
      : false
    const duplicatePhone = normalizedPhone
      ? existingRows.some(
          (row) =>
            row.id !== editingId &&
            normalizeUsPhoneToE164(row.phone) === normalizedPhone
        )
      : false

    if (duplicateEmail) errors.email = "Email already exists in this location"
    if (duplicatePhone) errors.phone = "Phone already exists in this location"

    return errors
  }, [customerDialog, customerForm, existingRows])

  const handleDeleteRow = React.useCallback(
    (rowId: string, isNew?: boolean) => {
      if (!guardDeleteCustomer()) return
      const target = existingRowsRef.current.find((row) => row.id === rowId)
      if (target) setDeleteTarget(target)
    },
    [guardDeleteCustomer]
  )

  const handleViewRow = React.useCallback((row: ReviewCustomerRow) => {
    setSelectedCustomer(row)
  }, [])

  const handleApproveRow = React.useCallback(
    (row: ReviewCustomerRow) => {
      if (!guardApproveCustomer()) return
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
    [approveCustomers.mutate, guardApproveCustomer]
  )

  const getCampaignActivityContent = React.useCallback(
    (campaignId: string) => {
      if (hoveredCampaignId !== campaignId) {
        return "Hover to load campaign activity"
      }
      if (hoveredCampaignQuery.isLoading) {
        return "Loading campaign activity..."
      }
      const activities = hoveredCampaignQuery.data?.data?.activities || []
      if (activities.length === 0) {
        return "No campaign activities found"
      }

      return (
        <div className="w-80 overflow-hidden rounded-xl bg-popover">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Campaign Activity</p>
            <p className="text-xs text-muted-foreground">
              {activities.length} scheduled step{activities.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-1.5 p-2">
            {activities.slice(0, 4).map((activity) => {
              const Icon = activity.Type === "EMAIL" ? Mail : MessageSquare
              const preview = activity.Subject || activity.Content || "No content"
              return (
                <div key={activity.Id} className="rounded-lg border bg-muted/30 p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          Step {activity.OrderIndex}: {activity.Type === "EMAIL" ? "Email" : "SMS"}
                        </p>
                        <p className="truncate text-[11px] leading-4 text-muted-foreground">
                          {preview}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Day {activity.SequenceDays}
                    </span>
                  </div>
                  {activity.ButtonText ? (
                    <p className="mt-2 truncate rounded-md bg-background px-2 py-1 text-[11px] font-medium text-foreground">
                      Button: {activity.ButtonText}
                    </p>
                  ) : null}
                </div>
              )
            })}
            {activities.length > 4 ? (
              <p className="px-1 pb-1 text-[11px] text-muted-foreground">
                +{activities.length - 4} more step{activities.length - 4 === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>
      )
    },
    [hoveredCampaignId, hoveredCampaignQuery.data?.data?.activities, hoveredCampaignQuery.isLoading]
  )

  const columns = React.useMemo(
    () =>
      getCustomersTableColumns({
        onEditRow: openEditCustomerDialog,
        onDeleteRow: handleDeleteRow,
        onApproveRow: handleApproveRow,
        onViewRow: handleViewRow,
        onCampaignHover: setHoveredCampaignId,
        getCampaignActivityContent,
      }),
    [
      openEditCustomerDialog,
      handleDeleteRow,
      handleApproveRow,
      handleViewRow,
      getCampaignActivityContent,
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

  const handleSubmitCustomer = React.useCallback(async () => {
    if (customerDialog?.mode === "edit") {
      if (!guardEditCustomer()) return
    } else if (!guardCreateCustomer()) {
      return
    }
    if (!selectedLocationIdForApi) return

    const errors = validateCustomerForm()
    setCustomerFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const row = customerDialog?.mode === "edit" ? customerDialog.row : null
    const payload = {
      businessId,
      locationId: selectedLocationIdForApi,
      customers: [
        {
          ...(row ? { id: row.id } : {}),
          name: customerForm.name.trim(),
          phone: normalizeUsPhoneToE164(customerForm.phone) || null,
          email: customerForm.email.trim() || null,
          campaignId: customerForm.campaignId,
        },
      ],
    }

    try {
      await saveCustomers.mutateAsync(payload)
      setCustomerDialog(null)
      setCustomerForm(EMPTY_CUSTOMER_FORM)
      setCustomerFormErrors({})
      setCustomerServerError(null)
    } catch (error) {
      const mutationError = error as Error & {
        fieldErrors?: CustomerFormErrors
      }
      if (mutationError.fieldErrors) {
        setCustomerFormErrors(mutationError.fieldErrors)
      }
      setCustomerServerError(mutationError.message || "Failed to save customer")
    }
  }, [
    businessId,
    selectedLocationIdForApi,
    customerDialog,
    customerForm,
    guardCreateCustomer,
    guardEditCustomer,
    validateCustomerForm,
    saveCustomers,
  ])

  const handleConfirmDelete = React.useCallback(async () => {
    if (!guardDeleteCustomer()) return
    if (!deleteTarget) return
    await deleteCustomer.mutateAsync({ id: deleteTarget.id, businessId })
    setDeleteTarget(null)
  }, [deleteTarget, deleteCustomer, businessId, guardDeleteCustomer])

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
    if (!guardApproveCustomer()) return
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
  }, [approveCustomers, guardApproveCustomer, selectedWaitingRows])

  const approveAllWaitingForVisibleCampaigns = React.useCallback(() => {
    if (!guardApproveCustomer()) return
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
  }, [approveCustomers, guardApproveCustomer, tableData])

  const handleSendNow = React.useCallback(() => {
    if (!guardSendNow()) return
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
  }, [businessId, canSendNow, guardSendNow, selectedCustomer, sendCustomerNow, timeline?.nextStep])

  return (
    <>
      <div ref={tableContainerRef}>
        {defaultCampaignOption ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-950">
                  Default campaign active
                </p>
                <p className="mt-0.5 text-sm leading-5 text-blue-800">
                  New customers will be assigned to{" "}
                  <span className="font-medium">{defaultCampaignOption.name}</span>{" "}
                  automatically.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <DataTable
          table={table}
          emptyMessage="No customers found."
          pageSizeOptions={[10, 24, 30, 50, 100]}
          isLoading={isLoading}
          disableHorizontalScroll
          onRowClick={(row) => {
            handleViewRow(row)
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
            <Button
              type="button"
              className="gap-2 shrink-0"
              onClick={openAddCustomerDialog}
              disabled={!selectedLocationIdForApi || saveCustomers.isPending}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DataTableAdvancedToolbar>
        </DataTable>
      </div>

      <Dialog
        open={!!customerDialog}
        onOpenChange={(open) => {
          if (open) return
          setCustomerDialog(null)
          setCustomerForm(EMPTY_CUSTOMER_FORM)
          setCustomerFormErrors({})
          setCustomerServerError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {customerDialog?.mode === "edit" ? "Edit customer" : "Add customer"}
            </DialogTitle>
            <DialogDescription>
              {customerDialog?.mode === "edit"
                ? "Update this customer's contact details and linked campaign."
                : "Add one customer to this location and assign a review campaign."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {customerServerError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{customerServerError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={customerForm.name}
                onChange={(event) => setCustomerFormField("name", event.target.value)}
                placeholder="Customer name"
                aria-invalid={!!customerFormErrors.name}
              />
              {customerFormErrors.name ? (
                <p className="text-xs text-destructive">{customerFormErrors.name}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  value={customerForm.phone}
                  onChange={(event) => setCustomerFormField("phone", event.target.value)}
                  placeholder="+1 555 123 4567"
                  aria-invalid={!!customerFormErrors.phone}
                />
                {customerFormErrors.phone ? (
                  <p className="text-xs text-destructive">{customerFormErrors.phone}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerForm.email}
                  onChange={(event) => setCustomerFormField("email", event.target.value)}
                  placeholder="customer@example.com"
                  aria-invalid={!!customerFormErrors.email}
                />
                {customerFormErrors.email ? (
                  <p className="text-xs text-destructive">{customerFormErrors.email}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-campaign">Campaign</Label>
              <Select
                value={customerForm.campaignId || undefined}
                onValueChange={(value) => setCustomerFormField("campaignId", value)}
                disabled={customerDialog?.mode === "add" && Boolean(defaultCampaignOption)}
              >
                <SelectTrigger id="customer-campaign" aria-invalid={!!customerFormErrors.campaignId}>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaignOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerFormErrors.campaignId ? (
                <p className="text-xs text-destructive">{customerFormErrors.campaignId}</p>
              ) : defaultCampaignOption && customerDialog?.mode === "add" ? (
                <p className="text-xs text-muted-foreground">
                  Default campaign is selected automatically.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerDialog(null)}
              disabled={saveCustomers.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitCustomer}
              disabled={!selectedLocationIdForApi || saveCustomers.isPending}
            >
              {saveCustomers.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {customerDialog?.mode === "edit" ? "Save customer" : "Add customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="rounded-xl border bg-card p-3 shadow-xs">
                  <div className="mb-2 flex items-center justify-between gap-3">
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

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
                        <p className="truncate text-sm font-medium">{timelineQuery.data.data.name}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Campaign</p>
                        <p className="truncate text-sm font-medium">
                          {timelineQuery.data.data.campaign?.name || selectedCustomer?.campaignName || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                        <p className="truncate text-sm font-medium">{timelineQuery.data.data.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                        <p className="truncate text-sm font-medium">{timelineQuery.data.data.phone || "No phone"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-3 shadow-xs">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Next Scheduled Step</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-2"
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
                    <div className="grid gap-2 rounded-lg bg-muted/30 p-2 sm:grid-cols-[1fr_1.2fr_1fr]">
                      <div className="flex min-w-0 items-center gap-2 px-1 py-1">
                        {timelineQuery.data.data.nextStep.type === "EMAIL" ? (
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Activity</p>
                          <p className="truncate text-sm font-medium">
                            {timelineQuery.data.data.nextStep.type === "EMAIL" ? "Email" : "SMS"} step{" "}
                            {timelineQuery.data.data.nextStep.orderIndex}
                          </p>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 px-1 py-1">
                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Scheduled</p>
                          <p className="truncate text-sm font-medium">
                            {formatDateTime(timelineQuery.data.data.nextStep.scheduledAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 px-1 py-1">
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Timezone</p>
                          <p className="truncate text-sm font-medium">
                            {timelineQuery.data.data.nextStep.timezone}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      No upcoming step. The customer may be waiting for approval, completed, failed, or at the end of the campaign.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Customer Journey Timeline</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {journeyTimelineItems.length} items
                    </Badge>
                  </div>

                  {journeyTimelineItems.length > 0 ? (
                    <div className="relative pl-4">
                      <div className="absolute left-[27px] top-3 bottom-3 w-px bg-border" />
                      <div className="space-y-4">
                        {journeyTimelineItems.map((item) => {
                          const MarkerIcon = getJourneyMarkerIcon(item.marker)
                          const ItemIcon = item.icon
                          return (
                            <div key={item.key} className="relative">
                              <div
                                className={`absolute left-0 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border ${getJourneyMarkerClassName(item.marker)}`}
                              >
                                <MarkerIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="ml-10 rounded-lg border bg-card p-3 shadow-xs">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                      <p className="truncate text-sm font-semibold">
                                        {item.title}
                                      </p>
                                    </div>
                                    {item.subtitle ? (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {item.subtitle}
                                      </p>
                                    ) : null}
                                    {item.occurredAt && item.type === "event" ? (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {formatDateTime(item.occurredAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                  <Badge variant="outline" className={item.statusClassName}>
                                    {item.statusLabel}
                                  </Badge>
                                </div>

                                {item.subject ? (
                                  <p className="mt-3 whitespace-pre-wrap break-words text-xs font-medium text-foreground">
                                    Subject: {item.subject}
                                  </p>
                                ) : null}
                                {item.content ? (
                                  <p className={item.subject
                                    ? "mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground"
                                    : "mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground"}
                                  >
                                    {item.content}
                                  </p>
                                ) : null}
                                {item.buttonText ? (
                                  <p className="mt-2 inline-flex max-w-full rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                                    <span className="shrink-0">Button:&nbsp;</span>
                                    <span className="break-words">{item.buttonText}</span>
                                  </p>
                                ) : null}
                                {item.manuallySent ? (
                                  <p className="mt-2 inline-flex max-w-full rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                                    Sent manually
                                  </p>
                                ) : null}
                                {item.skipReason ? (
                                  <p className="mt-2 text-xs font-medium text-amber-700">
                                    Skipped: {item.skipReason}
                                  </p>
                                ) : null}
                                {item.errorMessage ? (
                                  <p className="mt-2 text-xs font-medium text-red-700">
                                    Error: {item.errorMessage}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No customer journey activity is available yet.
                    </div>
                  )}
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
