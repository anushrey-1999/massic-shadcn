"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Trash2, X } from "lucide-react"
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getReviewPlatformIconUrl, type ReviewPlatformId } from "@/utils/review-platforms"

export type CustomerStatus =
  | "waiting-approval"
  | "pending"
  | "in-progress"
  | "completed"
  | "failed"
  | "draft"

export type CampaignPlatform = ReviewPlatformId

export interface CampaignOption {
  id: string
  name: string
  platform: CampaignPlatform
}

export interface ReviewCustomerRow {
  id: string
  name: string
  phone: string
  email: string
  createdAt: Date | null
  campaignId: string
  campaignName: string
  campaignPlatform: CampaignPlatform
  status: CustomerStatus
  isNew?: boolean
}

export type EditableField = "name" | "phone" | "email" | "campaignId"

export type RowValidationErrors = Partial<Record<EditableField, string>>

export interface CustomersTableColumnOptions {
  campaignOptions: CampaignOption[]
  editingCell: { rowId: string; field: EditableField } | null
  onStartEdit: (rowId: string, field: EditableField) => void
  onValueChange: (rowId: string, field: EditableField, value: string) => void
  onStopEdit: () => void
  onDeleteRow: (rowId: string, isNew?: boolean) => void
  onApproveRow: (row: ReviewCustomerRow) => void
  getRowErrors: (rowId: string) => RowValidationErrors | undefined
}

function CampaignChip({ label, platform }: { label: string; platform: CampaignPlatform }) {
  const iconUrl = getReviewPlatformIconUrl(platform)
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-foreground">
      <img
        src={iconUrl}
        alt=""
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function getOrdinal(n: number) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (v % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function formatDate(date: Date | null) {
  if (!date) return "-"
  try {
    const d = date.getDate()
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
    const year = date.getFullYear()
    return `${getOrdinal(d)} ${month} ${year}`
  } catch {
    return ""
  }
}

const statusStyles: Record<CustomerStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  "in-progress": "bg-sky-100 text-sky-800 border-sky-200",
  "waiting-approval": "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-muted text-muted-foreground border-muted",
}

function getStatusLabel(status: CustomerStatus) {
  switch (status) {
    case "waiting-approval":
      return "Waiting Approval"
    case "in-progress":
      return "In-Progress"
    case "draft":
      return "Draft"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function getCustomersTableColumns(
  options: CustomersTableColumnOptions
): ColumnDef<ReviewCustomerRow>[] {
  const {
    campaignOptions,
    editingCell,
    onStartEdit,
    onValueChange,
    onStopEdit,
    onDeleteRow,
    onApproveRow,
    getRowErrors,
  } = options

  const isEditing = (rowId: string, field: EditableField) =>
    editingCell?.rowId === rowId && editingCell.field === field

  const errorClass = (rowId: string, field: EditableField) =>
    getRowErrors(rowId)?.[field] ? "border-destructive" : ""

  return [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
          aria-label="Select all customers on page"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect() || row.original.isNew}
          onChange={(event) => row.toggleSelected(event.target.checked)}
          aria-label="Select customer"
        />
      ),
      enableSorting: false,
      size: 48,
      minSize: 40,
      maxSize: 56,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Customer Name" />
      ),
      cell: ({ row }) => {
        const value = row.original.name
        const showInput = row.original.isNew || isEditing(row.original.id, "name")
        if (showInput) {
          return (
            <Input
              type="text"
              value={value}
              onChange={(e) => onValueChange(row.original.id, "name", e.target.value)}
              placeholder="type name here"
              className={cn("h-8 text-sm", errorClass(row.original.id, "name"))}
              aria-invalid={!!getRowErrors(row.original.id)?.name}
              title={getRowErrors(row.original.id)?.name}
              onBlur={() => !row.original.isNew && onStopEdit()}
              autoFocus={!row.original.isNew && isEditing(row.original.id, "name")}
            />
          )
        }
        return (
          <div
            className="truncate font-medium cursor-pointer"
            title={value || "-"}
            onClick={() => onStartEdit(row.original.id, "name")}
          >
            {value || "-"}
          </div>
        )
      },
      size: 150,
      minSize: 110,
      maxSize: 180,
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Phone" />,
      cell: ({ row }) => {
        const value = row.original.phone
        const showInput = row.original.isNew || isEditing(row.original.id, "phone")
        if (showInput) {
          return (
            <Input
              type="tel"
              inputMode="numeric"
              value={value}
              onChange={(e) => onValueChange(row.original.id, "phone", e.target.value)}
              placeholder="type name here"
              className={cn("h-8 text-sm", errorClass(row.original.id, "phone"))}
              aria-invalid={!!getRowErrors(row.original.id)?.phone}
              title={getRowErrors(row.original.id)?.phone}
              onBlur={() => !row.original.isNew && onStopEdit()}
              autoFocus={!row.original.isNew && isEditing(row.original.id, "phone")}
            />
          )
        }
        return (
          <div
            className="truncate cursor-text"
            title={value || "-"}
            onClick={() => onStartEdit(row.original.id, "phone")}
          >
            {value || "-"}
          </div>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Email" />,
      cell: ({ row }) => {
        const value = row.original.email
        const showInput = row.original.isNew || isEditing(row.original.id, "email")
        if (showInput) {
          return (
            <Input
              type="email"
              value={value}
              onChange={(e) => onValueChange(row.original.id, "email", e.target.value)}
              placeholder="type name here"
              className={cn("h-8 text-sm", errorClass(row.original.id, "email"))}
              aria-invalid={!!getRowErrors(row.original.id)?.email}
              title={getRowErrors(row.original.id)?.email}
              onBlur={() => !row.original.isNew && onStopEdit()}
              autoFocus={!row.original.isNew && isEditing(row.original.id, "email")}
            />
          )
        }
        return (
          <div
            className="truncate cursor-text"
            title={value || "-"}
            onClick={() => onStartEdit(row.original.id, "email")}
          >
            {value || "-"}
          </div>
        )
      },
      size: 190,
      minSize: 140,
      maxSize: 220,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date Created" />
      ),
      cell: ({ row }) => (
        <div className="truncate text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </div>
      ),
      sortingFn: "datetime",
      size: 125,
      minSize: 100,
      maxSize: 140,
    },
    {
      id: "campaignId",
      accessorKey: "campaignId",
      accessorFn: (row) => row.campaignName || "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Campaign Linked" />
      ),
      cell: ({ row }) => {
        const showInput = row.original.isNew || isEditing(row.original.id, "campaignId")
        if (showInput) {
          return (
            <Select
              value={row.original.campaignId || undefined}
              onValueChange={(v) => onValueChange(row.original.id, "campaignId", v)}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full text-sm",
                  errorClass(row.original.id, "campaignId")
                )}
                aria-invalid={!!getRowErrors(row.original.id)?.campaignId}
                title={getRowErrors(row.original.id)?.campaignId}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {campaignOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        if (!row.original.campaignName) {
          return (
            <span
              className="text-muted-foreground cursor-text"
              onClick={() => onStartEdit(row.original.id, "campaignId")}
            >
              -
            </span>
          )
        }
        return (
          <div
            className="min-w-0 cursor-text"
            title={row.original.campaignName}
            onClick={() => onStartEdit(row.original.id, "campaignId")}
          >
            <CampaignChip
              label={row.original.campaignName}
              platform={row.original.campaignPlatform}
            />
          </div>
        )
      },
      size: 155,
      minSize: 120,
      maxSize: 180,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const statusLabel = getStatusLabel(row.original.status)
        return (
          <Badge
            variant="outline"
            className={cn(
              "max-w-full truncate border",
              statusStyles[row.original.status]
            )}
            title={statusLabel}
          >
            {statusLabel}
          </Badge>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 135,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isNew = row.original.isNew
        return (
          <div className="flex items-center justify-end gap-1">
            {!isNew && row.original.status === "waiting-approval" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-emerald-700"
                type="button"
                aria-label="Approve customer"
                title="Approve customer"
                onClick={() => onApproveRow(row.original)}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              type="button"
              aria-label={isNew ? "Remove row" : "Delete customer"}
              title={isNew ? "Remove row" : "Delete customer"}
              onClick={() => onDeleteRow(row.original.id, row.original.isNew)}
            >
              {isNew ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        )
      },
      enableSorting: false,
      size: 80,
      minSize: 72,
      maxSize: 90,
    },
  ]
}
