"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Edit2 } from "lucide-react"
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getReviewPlatformIconUrl,
  type ReviewPlatformId,
} from "@/utils/review-platforms"

export interface ReviewCampaignRow {
  id: string
  name: string
  platform: ReviewPlatformId
  isDefault: boolean
  createdAt: Date
  totalClicks: number
  steps: number
  metrics?: {
    total: number
    waitingForApproval: number
    inProgress: number
    completed: number
    failed: number
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th"
  const mod = day % 10
  if (mod === 1) return "st"
  if (mod === 2) return "nd"
  if (mod === 3) return "rd"
  return "th"
}

function formatCreatedOn(dateInput: Date): string {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }
  const day = date.getDate()
  const month = date.toLocaleString("en-US", { month: "long" })
  const year = date.getFullYear()
  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`
}

export function getCampaignsTableColumns(
  businessId: string,
  currentTab?: string,
  locationId?: string | null,
  onEditCampaign?: (href: string) => void
): ColumnDef<ReviewCampaignRow>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Campaign Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string
        const platform = row.original.platform
        const isDefault = row.original.isDefault
        const iconUrl = getReviewPlatformIconUrl(platform)
        return (
          <div className="flex items-center gap-3">
            <img
              src={iconUrl}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0"
            />
            <span className="text-sm">{name}</span>
            {isDefault ? (
              <Badge variant="secondary" className="text-xs font-normal">
                Default Campaign
              </Badge>
            ) : null}
          </div>
        )
      },
      size: 250,
      minSize: 150,
      maxSize: 400,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created on" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date
        return <span className="text-sm">{formatCreatedOn(date)}</span>
      },
      size: 150,
      minSize: 100,
      maxSize: 200,
    },
    {
      id: "totalClicks",
      accessorKey: "totalClicks",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Total Clicks" />
      ),
      cell: ({ row }) => {
        const clicks = row.getValue("totalClicks") as number
        return <span className="text-sm">{clicks.toLocaleString()}</span>
      },
      size: 130,
      minSize: 100,
      maxSize: 180,
    },
    {
      id: "customers",
      accessorFn: (row) => row.metrics?.total ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Customers" />
      ),
      cell: ({ row }) => {
        const metrics = row.original.metrics
        if (!metrics) return <span className="text-sm">0</span>
        return (
          <div className="text-sm">
            <span>{metrics.total}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {metrics.completed} done, {metrics.waitingForApproval} waiting
            </span>
          </div>
        )
      },
      size: 180,
      minSize: 140,
      maxSize: 240,
    },
    {
      id: "steps",
      accessorKey: "steps",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Steps" />
      ),
      cell: ({ row }) => {
        const steps = row.getValue("steps") as number
        return <span className="text-sm">{steps}</span>
      },
      size: 100,
      minSize: 80,
      maxSize: 150,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const campaignId = row.original.id
        const tabParam = currentTab ? `&tab=${currentTab}` : ""
        const locationParam = locationId ? `&locationId=${encodeURIComponent(locationId)}` : ""
        const editHref = `/business/${businessId}/reviews/campaigns/new?campaignId=${campaignId}${tabParam}${locationParam}`

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-gray-100 hover:bg-gray-200"
              type="button"
              aria-label="Edit campaign"
              onClick={() => {
                onEditCampaign?.(editHref)
              }}
            >
              <Edit2 className="h-2 w-2 text-gray-600" />
            </Button>
          </div>
        )
      },
      size: 60,
      minSize: 48,
      maxSize: 72,
    },
  ]
}
