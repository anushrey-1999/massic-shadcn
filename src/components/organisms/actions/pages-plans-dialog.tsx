"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"

import { DataTable } from "@/components/filter-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Typography } from "@/components/ui/typography"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanMeta } from "@/types/page-planner-types"

const PAGE_PLANS_QUERY_KEY = "page-planner-plans"

function getIsActive(plan: PagePlannerPlanMeta): boolean {
  const status = (plan.status || "").toString().toLowerCase()
  return (
    (status === "active" || Boolean(plan.activated_at)) &&
    !plan.archived_at &&
    plan.valid === true
  )
}

function formatMaybeDate(value: string | null | undefined): string {
  if (!value) return "—"
  const formatted = formatDate(value, "PP")
  return formatted || "—"
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
}

export function PagesPlansDialog({ open, onOpenChange, businessId }: Props) {
  const pagePlanner = usePagePlanner()
  const queryClient = useQueryClient()

  const plansQuery = useQuery({
    queryKey: [PAGE_PLANS_QUERY_KEY, businessId],
    enabled: open && Boolean(businessId),
    queryFn: async () => {
      const data = await pagePlanner.listPlans(businessId)
      const all = Array.isArray(data?.plans) ? data.plans : []
      return all.filter((p) => (p.plan_type || "").toString().toLowerCase() === "pages")
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  })

  const setActiveMutation = useMutation({
    mutationFn: async (planId: number) => {
      return pagePlanner.setActivePlan(businessId, planId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PAGE_PLANS_QUERY_KEY, businessId] })
    },
  })

  const columns = React.useMemo((): ColumnDef<PagePlannerPlanMeta>[] => {
    return [
      {
        id: "active",
        header: () => (
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        ),
        cell: ({ row }) => {
          const plan = row.original
          return getIsActive(plan) ? (
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </Badge>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-muted-foreground">—</span>
            </div>
          )
        },
        enableSorting: false,
        size: 90,
        minSize: 90,
        maxSize: 120,
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
        enableSorting: false,
        size: 120,
        minSize: 110,
        maxSize: 180,
      },
      {
        id: "proposed_at",
        accessorKey: "proposed_at",
        header: () => <span className="text-xs text-muted-foreground">Proposed</span>,
        cell: ({ row }) => (
          <Typography variant="p" className="text-xs">
            {formatMaybeDate(row.getValue<string | null>("proposed_at"))}
          </Typography>
        ),
        enableSorting: false,
        size: 140,
        minSize: 130,
        maxSize: 180,
      },
      {
        id: "activated_at",
        accessorKey: "activated_at",
        header: () => <span className="text-xs text-muted-foreground">Activated</span>,
        cell: ({ row }) => (
          <Typography variant="p" className="text-xs">
            {formatMaybeDate(row.getValue<string | null>("activated_at"))}
          </Typography>
        ),
        enableSorting: false,
        size: 140,
        minSize: 130,
        maxSize: 180,
      },
      {
        id: "timeframe",
        accessorKey: "timeframe",
        header: () => (
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground">Items</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Typography variant="p" className="text-xs tabular-nums">
              {row.getValue<number | null>("timeframe") ?? "—"}
            </Typography>
          </div>
        ),
        enableSorting: false,
        size: 110,
        minSize: 100,
        maxSize: 140,
      },
      {
        id: "actions",
        header: () => (
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">Action</span>
          </div>
        ),
        cell: ({ row }) => {
          const plan = row.original
          const isActive = getIsActive(plan)
          const isBusy = setActiveMutation.isPending && setActiveMutation.variables === plan.id

          return (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "default"}
                className={cn("h-8", isActive && "cursor-default")}
                onClick={() => {
                  if (isActive) return
                  setActiveMutation.mutate(plan.id)
                }}
                disabled={!businessId || isActive || setActiveMutation.isPending}
              >
                {isBusy ? "Making active…" : isActive ? "Active" : "Make active"}
              </Button>
            </div>
          )
        },
        enableSorting: false,
        size: 140,
        minSize: 130,
        maxSize: 180,
      },
    ]
  }, [businessId, setActiveMutation])

  const table = useReactTable({
    data: plansQuery.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[900px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>All plans</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <DataTable
            table={table}
            isLoading={plansQuery.isLoading}
            isFetching={plansQuery.isFetching || setActiveMutation.isPending}
            emptyMessage="No plans found."
            showPagination={false}
            disableHorizontalScroll={true}
            className="[&_tbody_tr]:h-10 [&_tbody_td]:py-0.5"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

