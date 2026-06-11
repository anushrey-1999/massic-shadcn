"use client"

import * as React from "react"
import type { ReactElement, ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Eye, Pencil, Trash2 } from "lucide-react"
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  isDefault?: boolean
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

export interface CustomersTableColumnOptions {
  onEditRow: (row: ReviewCustomerRow) => void
  onDeleteRow: (rowId: string, isNew?: boolean) => void
  onApproveRow: (row: ReviewCustomerRow) => void
  onViewRow: (row: ReviewCustomerRow) => void
  onCampaignHover?: (campaignId: string) => void
  getCampaignActivityContent?: (campaignId: string) => ReactNode
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

function WithTooltip({
  content,
  children,
  contentClassName,
  hideArrow,
  arrowClassName,
}: {
  content?: ReactNode
  children: ReactElement
  contentClassName?: string
  hideArrow?: boolean
  arrowClassName?: string
}) {
  if (!content) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className={contentClassName}
        hideArrow={hideArrow}
        arrowClassName={arrowClassName}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export function getCustomersTableColumns(
  options: CustomersTableColumnOptions
): ColumnDef<ReviewCustomerRow>[] {
  const {
    onEditRow,
    onDeleteRow,
    onApproveRow,
    onViewRow,
    onCampaignHover,
    getCampaignActivityContent,
  } = options

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
          disabled={!row.getCanSelect()}
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
        return (
          <WithTooltip content={value || "-"}>
            <div className="truncate font-medium">
              {value || "-"}
            </div>
          </WithTooltip>
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
        return (
          <WithTooltip content={value || "-"}>
            <div className="truncate">
              {value || "-"}
            </div>
          </WithTooltip>
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
        return (
          <WithTooltip content={value || "-"}>
            <div className="truncate">
              {value || "-"}
            </div>
          </WithTooltip>
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
        if (!row.original.campaignName) {
          return (
            <span className="text-muted-foreground">
              -
            </span>
          )
        }
        const tooltipContent =
          getCampaignActivityContent?.(row.original.campaignId) || row.original.campaignName
        return (
          <WithTooltip
            content={tooltipContent}
            contentClassName="max-w-none rounded-xl border bg-popover p-0 text-popover-foreground shadow-lg"
            arrowClassName="fill-popover"
          >
            <div
              className="min-w-0"
              onMouseEnter={() => onCampaignHover?.(row.original.campaignId)}
              onFocus={() => onCampaignHover?.(row.original.campaignId)}
            >
              <CampaignChip
                label={row.original.campaignName}
                platform={row.original.campaignPlatform}
              />
            </div>
          </WithTooltip>
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
          <WithTooltip content={statusLabel}>
            <Badge
              variant="outline"
              className={cn(
                "max-w-full truncate border",
                statusStyles[row.original.status]
              )}
            >
              {statusLabel}
            </Badge>
          </WithTooltip>
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
        return (
          <div className="flex items-center justify-end gap-1">
            <WithTooltip content="View customer details">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="View customer details"
                onClick={(event) => {
                  event.stopPropagation()
                  onViewRow(row.original)
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </WithTooltip>
            <WithTooltip content="Edit customer">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="Edit customer"
                onClick={(event) => {
                  event.stopPropagation()
                  onEditRow(row.original)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </WithTooltip>
            {row.original.status === "waiting-approval" ? (
              <WithTooltip content="Approve customer">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-emerald-700"
                  type="button"
                  aria-label="Approve customer"
                  onClick={(event) => {
                    event.stopPropagation()
                    onApproveRow(row.original)
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </WithTooltip>
            ) : null}
            <WithTooltip content="Delete customer">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                type="button"
                aria-label="Delete customer"
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteRow(row.original.id, row.original.isNew)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </WithTooltip>
          </div>
        )
      },
      enableSorting: false,
      size: 104,
      minSize: 96,
      maxSize: 116,
    },
  ]
}
