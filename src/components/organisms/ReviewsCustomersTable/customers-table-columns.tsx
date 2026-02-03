"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Check, Star, Trash2, X } from "lucide-react"
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

export type CustomerStatus = "completed" | "failed" | "pending" | "in-progress"

export type CampaignPlatform = "google" | "yelp"

export interface CampaignLink {
  platform: CampaignPlatform
  label: string
}

export interface ReviewCustomerRow {
  id: string
  name: string
  phone: string
  email: string
  createdAt: Date
  campaignsLinked: CampaignLink[]
  status: CustomerStatus
}

export interface NewRowDraft {
  name: string
  phone: string
  email: string
  dateCreatedText: string
  campaign: "" | "Google Reviews" | "Yelp"
}

export interface AddRowColumnOptions {
  newRowId: string
  draft: NewRowDraft
  onDraftChange: (field: keyof NewRowDraft, value: string) => void
  onSaveNewRow: () => void
  onCancelNewRow: () => void
}

function CampaignChip({ campaign }: { campaign: CampaignLink }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-foreground">
      {campaign.platform === "google" ? (
        <img
          src="https://www.google.com/s2/favicons?domain=google.com&sz=32"
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
        />
      ) : (
        <Star className="h-3.5 w-3.5 shrink-0 fill-[#d32323] text-[#d32323]" />
      )}
      <span className="truncate">{campaign.label}</span>
    </span>
  )
}

function getOrdinal(n: number) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (v % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function formatDate(date: Date) {
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
}

const CAMPAIGN_OPTIONS: { value: "Google Reviews" | "Yelp"; platform: CampaignPlatform }[] = [
  { value: "Google Reviews", platform: "google" },
  { value: "Yelp", platform: "yelp" },
]

export function getCustomersTableColumns(
  addRowOptions?: AddRowColumnOptions
): ColumnDef<ReviewCustomerRow>[] {
  const isNewRow = addRowOptions
    ? (row: ReviewCustomerRow) => row.id === addRowOptions.newRowId
    : () => false

  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Customer Name" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <Input
              type="text"
              value={addRowOptions.draft.name}
              onChange={(e) => addRowOptions.onDraftChange("name", e.target.value)}
              placeholder="Customer name"
              className="h-8 text-sm"
            />
          )
        return <div className="truncate font-medium">{row.original.name}</div>
      },
      size: 220,
      minSize: 160,
      maxSize: 320,
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Phone" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <Input
              type="tel"
              inputMode="numeric"
              value={addRowOptions.draft.phone}
              onChange={(e) => addRowOptions.onDraftChange("phone", e.target.value)}
              placeholder="Phone"
              className="h-8 text-sm"
            />
          )
        return <div className="truncate">{row.original.phone}</div>
      },
      size: 160,
      minSize: 140,
      maxSize: 200,
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Email" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <Input
              type="email"
              value={addRowOptions.draft.email}
              onChange={(e) => addRowOptions.onDraftChange("email", e.target.value)}
              placeholder="Email"
              className="h-8 text-sm"
            />
          )
        return <div className="truncate">{row.original.email}</div>
      },
      size: 260,
      minSize: 200,
      maxSize: 360,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Date Created" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <Input
              type="text"
              value={addRowOptions.draft.dateCreatedText}
              onChange={(e) => addRowOptions.onDraftChange("dateCreatedText", e.target.value)}
              placeholder="e.g. 8th Jan 2026"
              className="h-8 text-sm"
            />
          )
        return <div className="truncate">{formatDate(row.original.createdAt)}</div>
      },
      sortingFn: "datetime",
      size: 160,
      minSize: 140,
      maxSize: 200,
    },
    {
      id: "campaignsLinked",
      accessorKey: "campaignsLinked",
      accessorFn: (row) => row.campaignsLinked[0]?.label ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Campaigns Linked" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <Select
              value={addRowOptions.draft.campaign || undefined}
              onValueChange={(v) => addRowOptions.onDraftChange("campaign", v ?? "")}
            >
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.platform} value={opt.value}>
                    {opt.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        const campaign = row.original.campaignsLinked[0]
        if (!campaign) return <span className="text-muted-foreground">-</span>
        return <CampaignChip campaign={campaign} />
      },
      size: 200,
      minSize: 160,
      maxSize: 280,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => {
        if (addRowOptions && isNewRow(row.original))
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                aria-label="Save"
                onClick={addRowOptions.onSaveNewRow}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Cancel"
                onClick={addRowOptions.onCancelNewRow}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        return (
          <div className="flex w-full items-center">
            <Badge
              variant="outline"
              className={cn(
                "w-fit shrink-0 capitalize border",
                statusStyles[row.original.status]
              )}
            >
              {row.original.status === "in-progress" ? "In-Progress" : row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
            </Badge>
            <div className="ml-auto flex w-9 shrink-0 items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                type="button"
                aria-label="Delete customer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 200,
    },
  ]
}

