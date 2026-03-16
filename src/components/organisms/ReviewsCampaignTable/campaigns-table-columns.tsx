"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Edit2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface ReviewCampaignRow {
  id: string
  name: string
  platform: "google" | "yelp"
  isDefault: boolean
  createdAt: Date
  totalClicks: number
  steps: number
}

export function getCampaignsTableColumns(businessId: string): ColumnDef<ReviewCampaignRow>[] {
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
        const faviconDomain = platform === "yelp" ? "yelp.com" : "google.com"
        return (
          <div className="flex items-center gap-3">
            <img
              src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
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
        const formatted = new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        return <span className="text-sm">{formatted}</span>
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
        const router = useRouter()
        const campaignId = row.original.id
        
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-gray-100 hover:bg-gray-200"
              type="button"
              aria-label="Edit campaign"
              onClick={() => {
                router.push(`/business/${businessId}/reviews/campaigns/new?campaignId=${campaignId}`)
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
