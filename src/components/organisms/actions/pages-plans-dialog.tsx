"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { toast } from "sonner"

import { DataTable } from "@/components/filter-table"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RelevancePill } from "@/components/ui/relevance-pill"
import { Typography } from "@/components/ui/typography"
import { formatDate, formatVolume } from "@/lib/format"
import { cn } from "@/lib/utils"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanDetailResponse, PagePlannerPlanItem, PagePlannerPlanMeta } from "@/types/page-planner-types"

const PAGE_PLANS_QUERY_KEY = "page-planner-plans"

function isArchived(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim().toLowerCase()
  if (!s || s === "null" || s === "undefined") return false
  return true
}

function getIsActive(plan: PagePlannerPlanMeta): boolean {
  const status = (plan.status || "").toString().toLowerCase()
  // Server is source-of-truth: some "active" plans still have archived_at set.
  if (status === "active") return true
  // If status is explicitly set to something non-active, trust the server.
  if (status) return false
  // Fallback only when older records don't have status populated at all.
  return Boolean(plan.activated_at) && !isArchived((plan as any).archived_at)
}

function formatMaybeDate(value: string | null | undefined): string {
  if (!value) return "—"
  const formatted = formatDate(value, "PP")
  return formatted || "—"
}

function oppScoreLabel(score: number | undefined): "High" | "Medium" | "Low" {
  const v = typeof score === "number" && Number.isFinite(score) ? score : 0
  if (v >= 0.67) return "High"
  if (v >= 0.34) return "Medium"
  return "Low"
}

function toTitleCase(value: string): string {
  const s = (value || "").trim()
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function TypePill({ pageType }: { pageType?: string | null }) {
  const label = pageType ? toTitleCase(pageType) : "—"
  return (
    <div className="inline-flex items-center justify-center rounded-lg bg-secondary px-2 py-1.5">
      <span className="text-[10px] font-medium leading-normal tracking-[0.15px] text-general-muted-foreground">
        {label}
      </span>
    </div>
  )
}

type MetricPill = {
  label: string
  value: string
  valueClassName?: string
}

function MetricPillView({ pill }: { pill: MetricPill }) {
  const isRelevance = pill.label.toLowerCase() === "relevance"
  const isOppScore = pill.label.toLowerCase() === "opp score"
  const relevanceScore = React.useMemo(() => {
    if (!isRelevance) return 0
    const raw = Number.parseFloat(pill.value)
    if (!Number.isFinite(raw)) return 0
    if (raw > 1) return raw / 100
    return raw
  }, [isRelevance, pill.value])

  const oppScoreStyle = React.useMemo((): React.CSSProperties | undefined => {
    if (!isOppScore) return undefined
    const v = (pill.value || "").toLowerCase().trim()
    if (v === "high") return { color: "#84cc16" }
    if (v === "medium") return { color: "hsl(45, 93%, 47%)" }
    if (v === "low") return { color: "hsl(0, 84%, 60%)" }
    return undefined
  }, [isOppScore, pill.value])

  return (
    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-1.5 py-1 text-sm font-normal">
      <span className="text-general-border-four">{pill.label}</span>
      {isRelevance ? (
        <RelevancePill score={relevanceScore} className="border-0 bg-transparent px-0 py-0" />
      ) : (
        <span className={cn("text-general-foreground", !isOppScore && pill.valueClassName)} style={oppScoreStyle}>
          {pill.value}
        </span>
      )}
    </div>
  )
}

function extractPlanItemsFromDetail(payload: unknown): PagePlannerPlanItem[] {
  const p: any = payload as any
  const direct =
    (Array.isArray(p?.plan) && p.plan) ||
    (Array.isArray(p?.items) && p.items) ||
    (Array.isArray(p?.output_data?.plan) && p.output_data.plan) ||
    (Array.isArray(p?.output_data?.items) && p.output_data.items) ||
    (Array.isArray(p?.plan_json) && p.plan_json) ||
    null
  return (direct as PagePlannerPlanItem[]) ?? []
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
}

export function PagesPlansDialog({ open, onOpenChange, businessId }: Props) {
  const pagePlanner = usePagePlanner()
  const queryClient = useQueryClient()
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewPlan, setPreviewPlan] = React.useState<PagePlannerPlanMeta | null>(null)
  const [previewOpenItemId, setPreviewOpenItemId] = React.useState<string | null>(null)

  const plansQuery = useQuery({
    queryKey: [PAGE_PLANS_QUERY_KEY, businessId],
    enabled: open && Boolean(businessId),
    queryFn: async () => {
      const data = await pagePlanner.listPlans(businessId)
      const all = Array.isArray(data?.plans) ? data.plans : []
      return all.filter((p) => (p.plan_type || "").toString().toLowerCase() === "pages")
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  })

  const setActiveMutation = useMutation({
    mutationFn: async (planId: number) => {
      return pagePlanner.setActivePlan(businessId, planId)
    },
    onMutate: async (planId: number) => {
      toast.loading("Making plan active…", { id: "pages-plan-activate" })
      await queryClient.cancelQueries({ queryKey: [PAGE_PLANS_QUERY_KEY, businessId] })
      const prev = queryClient.getQueryData<PagePlannerPlanMeta[]>([PAGE_PLANS_QUERY_KEY, businessId])
      const nowIso = new Date().toISOString()

      if (prev && Array.isArray(prev)) {
        queryClient.setQueryData<PagePlannerPlanMeta[]>(
          [PAGE_PLANS_QUERY_KEY, businessId],
          prev.map((p) => {
            const pId =
              typeof (p as any).id === "number"
                ? (p as any).id
                : Number.parseInt(String((p as any).id ?? ""), 10)
            if (!Number.isFinite(pId)) return p
            if (pId === planId) {
              return {
                ...p,
                status: "active",
                activated_at: (p as any).activated_at || nowIso,
                archived_at: null,
              } as any
            }
            // Deactivate any previously active plan so activePlanId updates immediately.
            if (getIsActive(p)) {
              return { ...p, status: "inactive" } as any
            }
            return p
          })
        )
      }

      return { prev }
    },
    onSuccess: async (_data, planId) => {
      toast.success("Plan activated", { id: "pages-plan-activate" })
      // Refetch the plans list first so activePlanId updates to the new plan.
      await queryClient.refetchQueries({ queryKey: [PAGE_PLANS_QUERY_KEY, businessId] })
      // Refetch all cached plan detail queries and also explicitly prefetch the newly active
      // plan's detail so the main table has fresh data without waiting for another round trip.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["page-planner-plan", businessId] }),
        queryClient.prefetchQuery({
          queryKey: ["page-planner-plan", businessId, planId],
          queryFn: () => pagePlanner.getPlanById(businessId, planId),
        }),
      ])
    },
    onError: (err: any, _planId, ctx) => {
      const msg =
        (typeof err?.response?.data === "string" && err.response.data) ||
        (typeof err?.message === "string" && err.message) ||
        "Failed to activate plan"
      toast.error(msg, { id: "pages-plan-activate" })
      if (ctx?.prev) {
        queryClient.setQueryData([PAGE_PLANS_QUERY_KEY, businessId], ctx.prev)
      }
    },
  })

  const previewPlanId = previewPlan?.id ?? null
  const previewQuery = useQuery({
    queryKey: ["page-planner-plan", businessId, previewPlanId],
    enabled: previewOpen && Boolean(businessId) && typeof previewPlanId === "number",
    queryFn: async () => {
      return pagePlanner.getPlanById(businessId, previewPlanId as number) as Promise<PagePlannerPlanDetailResponse>
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  })

  const previewItems = React.useMemo(() => {
    return extractPlanItemsFromDetail(previewQuery.data)
  }, [previewQuery.data])

  const previewRows = React.useMemo(() => {
    return previewItems.map((item, idx) => {
      const raw: any = item as any
      const relevance = typeof raw?.business_relevance_score === "number" ? raw.business_relevance_score : 0
      const vol = typeof raw?.search_volume === "number" ? raw.search_volume : 0
      const opp = oppScoreLabel(typeof raw?.page_opportunity_score === "number" ? raw.page_opportunity_score : 0)
      const pageType = typeof raw?.page_type === "string" ? raw.page_type : ""
      const keyword = typeof raw?.keyword === "string" ? raw.keyword : ""
      const rationale = typeof raw?.rationale === "string" ? raw.rationale : ""
      const status = typeof raw?.status === "string" ? raw.status : null
      const rowId = `${raw?.page_id || keyword || "row"}-${idx}`

      return {
        id: rowId,
        title: keyword || "Untitled",
        description: rationale || null,
        planItemStatus: status,
        pageType: pageType || null,
        metrics: [
          { label: "Relevance", value: String(relevance) },
          { label: "Type", value: pageType ? pageType.charAt(0).toUpperCase() + pageType.slice(1) : "—" },
          { label: "Vol", value: formatVolume(vol) },
          { label: "Opp Score", value: opp },
        ] as MetricPill[],
      }
    })
  }, [previewItems])

  React.useEffect(() => {
    if (!previewOpen) return
    setPreviewOpenItemId(previewRows[0]?.id ?? null)
  }, [previewOpen, previewRows])

  const columns = React.useMemo((): ColumnDef<PagePlannerPlanMeta>[] => {
    return [
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
          const planId =
            typeof (plan as any)?.id === "number"
              ? (plan as any).id
              : Number.parseInt(String((plan as any)?.id ?? ""), 10)
          const safePlanId = Number.isFinite(planId) ? planId : null
          const isBusy = setActiveMutation.isPending && setActiveMutation.variables === safePlanId

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "default"}
                className={cn("h-8", isActive && "cursor-default")}
                onClick={() => {
                  if (isActive) return
                  if (typeof safePlanId !== "number") return
                  setActiveMutation.mutate(safePlanId)
                }}
                disabled={!businessId || isActive || setActiveMutation.isPending || typeof safePlanId !== "number"}
              >
                {isBusy ? "Making active…" : isActive ? "Active" : "Make active"}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  if (typeof safePlanId !== "number") return
                  setPreviewPlan(plan)
                  setPreviewOpen(true)
                }}
                disabled={!businessId || typeof safePlanId !== "number"}
                aria-label="View plan details"
              >
                <Eye className="h-4 w-4" />
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
    initialState: {
      pagination: {
        pageIndex: 0,
        // Effectively disables pagination by fitting all rows on one "page".
        pageSize: 9999,
      },
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setPreviewOpen(false)
          setPreviewPlan(null)
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[900px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>All plans</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="h-[70vh] min-h-0">
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
        </div>
      </DialogContent>

      <Dialog
        open={previewOpen}
        onOpenChange={(next) => {
          setPreviewOpen(next)
          if (!next) setPreviewPlan(null)
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[1100px] h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Plan details</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-general-border bg-white px-3 py-2">
                <div className="text-xs text-muted-foreground">Plan ID</div>
                <div className="text-sm font-medium">{previewPlan?.id ?? "—"}</div>
              </div>
              <div className="rounded-lg border border-general-border bg-white px-3 py-2">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-sm font-medium">{previewPlan?.status ?? "—"}</div>
              </div>
              <div className="rounded-lg border border-general-border bg-white px-3 py-2">
                <div className="text-xs text-muted-foreground">Items</div>
                <div className="text-sm font-medium">{previewItems.length}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Proposed: {formatMaybeDate(previewPlan?.proposed_at ?? null)} · Activated:{" "}
                {formatMaybeDate(previewPlan?.activated_at ?? null)}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-general-border bg-white">
              {previewQuery.isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : previewRows.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No pages found in this plan.</div>
              ) : (
                <div className="divide-y divide-general-border">
                  {previewRows.map((row) => {
                    const open = previewOpenItemId === row.id
                    return (
                      <Collapsible
                        key={row.id}
                        open={open}
                        onOpenChange={(next) => setPreviewOpenItemId(next ? row.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "group flex w-full items-center gap-2 px-2 py-1.5 text-left",
                              "select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              open && "bg-[#FAFAFA]"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-normal tracking-[0.07px] text-general-foreground">
                                  {row.title}
                                </span>
                                {!open ? <TypePill pageType={row.pageType} /> : null}
                              </div>
                              {open && row.description ? (
                                <div className="mt-0.5 truncate text-xs font-normal tracking-[0.18px] text-general-muted-foreground">
                                  {row.description}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex w-[52px] items-center justify-end">
                              <div
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-opacity",
                                  open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                                aria-hidden="true"
                              >
                                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="bg-[#FAFAFA]">
                          <div className="flex items-start justify-between gap-2 px-2 py-1.5">
                            <div className="flex flex-1 flex-wrap items-center gap-2">
                              {row.metrics.map((pill) => {
                                const displayPill =
                                  pill.label === "Type"
                                    ? {
                                        label: "Status",
                                        value:
                                          (row.planItemStatus ?? "")
                                            .trim()
                                            .replace(/^./, (c: string) => c.toUpperCase()) || "Build",
                                      }
                                    : pill
                                return (
                                  <MetricPillView
                                    key={`${row.id}-${displayPill.label}`}
                                    pill={displayPill}
                                  />
                                )
                              })}
                            </div>
                            <div className="w-[52px]" />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

