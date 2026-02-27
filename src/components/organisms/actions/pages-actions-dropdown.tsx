"use client"

import * as React from "react"
import {
  AppWindow,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Hammer,
  Loader2,
  RotateCw,
  Sparkles,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RelevancePill } from "@/components/ui/relevance-pill"
import { cn } from "@/lib/utils"
import { PagesPlansDialog } from "./pages-plans-dialog"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanItem, PagePlannerPlanMeta } from "@/types/page-planner-types"
import { formatVolume } from "@/lib/format"
import { useRefinePlanOverlayOptional } from "./refine-plan-overlay-provider"
import type { RowSelectionState } from "@tanstack/react-table"

type ActionStatus = "build" | "optimize"
type SortDirection = "asc" | "desc" | null

type MetricPill = {
  label: string
  value: string
  valueClassName?: string
  leftIcon?: React.ReactNode
}

export type PagesActionsItem = {
  id: string
  title: string
  status?: ActionStatus
  description?: string
  metrics?: MetricPill[]
}

type Props = {
  businessId: string
  title?: string
  lastUpdatedLabel?: string
  items?: PagesActionsItem[]
  totalRows?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mode?: "section" | "table"
  planItemsOverride?: PagePlannerPlanItem[] | null
  externalBusy?: boolean
  externalBusyLabel?: string | null
  onTableContextChange?: (ctx: {
    planId: number | null
    planItems: PagePlannerPlanItem[]
    selectedKeywords: string[]
  }) => void
}

const DEFAULT_ITEMS: PagesActionsItem[] = []

const PAGE_PLANS_QUERY_KEY = "page-planner-plans"

function isActivePlan(plan: PagePlannerPlanMeta): boolean {
  const status = (plan.status || "").toString().toLowerCase()
  return (
    (status === "active" || Boolean(plan.activated_at)) &&
    !plan.archived_at &&
    plan.valid === true
  )
}

function toTitleCase(value: string): string {
  const s = (value || "").trim()
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function oppScoreLabel(score: number | undefined): "High" | "Medium" | "Low" {
  const v = typeof score === "number" && Number.isFinite(score) ? score : 0
  if (v >= 0.67) return "High"
  if (v >= 0.34) return "Medium"
  return "Low"
}

function extractPlanItems(payload: unknown): PagePlannerPlanItem[] | null {
  const seen = new Set<unknown>()

  const walk = (node: unknown, depth: number): PagePlannerPlanItem[] | null => {
    if (depth > 5) return null
    if (!node || typeof node !== "object") return null
    if (seen.has(node)) return null
    seen.add(node)

    if (Array.isArray(node)) {
      const arr = node as any[]
      if (arr.length === 0) return []
      const looksLikeItems = arr.every(
        (x) => x && typeof x === "object" && typeof (x as any).keyword === "string"
      )
      return looksLikeItems ? (arr as PagePlannerPlanItem[]) : null
    }

    const obj = node as Record<string, unknown>

    for (const key of ["plan", "items", "output_data", "data", "result"]) {
      if (key in obj) {
        const found = walk(obj[key], depth + 1)
        if (found) return found
      }
    }

    for (const value of Object.values(obj)) {
      const found = walk(value, depth + 1)
      if (found) return found
    }

    return null
  }

  return walk(payload, 0)
}

function getPlanItemRowId(item: PagePlannerPlanItem, index: number) {
  // page_id / keyword can collide across rows; include index to guarantee uniqueness for React keys + selection.
  const base = item.page_id || item.keyword || "row"
  return `${base}-${index}`
}

function ensureUniqueRowIds(items: PagesActionsItem[]): PagesActionsItem[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const raw = (item.id || "").trim() || "row"
    const count = seen.get(raw) ?? 0
    seen.set(raw, count + 1)
    if (count === 0) return item
    return { ...item, id: `${raw}-${count}` }
  })
}

function StatusPill({ status }: { status: ActionStatus }) {
  const label = status === "build" ? "Build" : "Optimize"
  const Icon = Hammer
  return (
    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5">
      <Icon className="h-3 w-3 text-[#D4D4D4]" />
      <span className="text-[10px] font-medium leading-normal tracking-[0.15px] text-general-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function CompletedPill() {
  return (
    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-lime-50 px-2 py-1.5">
      <Check className="h-3 w-3 text-lime-600" />
    </div>
  )
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
    if (v === "high") return { color: "#84cc16" } // lime-600 (matches RelevancePill)
    if (v === "medium") return { color: "hsl(45, 93%, 47%)" } // yellow/orange (matches RelevancePill)
    if (v === "low") return { color: "hsl(0, 84%, 60%)" } // red (matches RelevancePill)
    return undefined
  }, [isOppScore, pill.value])

  return (
    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-1.5 py-1 text-sm font-normal">
      <span className="text-general-border-four">{pill.label}</span>
      {isRelevance ? (
        <RelevancePill
          score={relevanceScore}
          className="border-0 bg-transparent px-0 py-0"
        />
      ) : (
        <>
          {pill.leftIcon ? <span className="ml-0.5">{pill.leftIcon}</span> : null}
          <span
            className={cn("text-general-foreground", !isOppScore && pill.valueClassName)}
            style={oppScoreStyle}
          >
            {pill.value}
          </span>
        </>
      )}
    </div>
  )
}

function getRelevanceSortValue(item: PagesActionsItem): number {
  const metric = item.metrics?.find((m) => m.label.toLowerCase() === "relevance")
  if (!metric) return 0
  const raw = Number.parseFloat(metric.value)
  if (!Number.isFinite(raw)) return 0
  if (raw > 1) return raw
  return raw * 100
}

export function PagesActionsDropdown({
  businessId,
  title = "Pages",
  lastUpdatedLabel = "Last updated 12 Feb",
  items = DEFAULT_ITEMS,
  totalRows = 30,
  open,
  onOpenChange,
  mode = "section",
  planItemsOverride = null,
  externalBusy = false,
  externalBusyLabel = null,
  onTableContextChange,
}: Props) {
  const refinePlan = useRefinePlanOverlayOptional()
  const pagePlanner = usePagePlanner()
  const queryClient = useQueryClient()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(true)
  const [rows, setRows] = React.useState<PagesActionsItem[]>(() => (items?.length ? items : []))
  const [openItemId, setOpenItemId] = React.useState<string | null>(() => (items?.[0]?.id ?? null))
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
  const [doneIds, setDoneIds] = React.useState<Set<string>>(() => new Set())
  const [visibleCount, setVisibleCount] = React.useState(10)
  const contentId = React.useId()
  const [plansOpen, setPlansOpen] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [sourceMode, setSourceMode] = React.useState<"active" | "generated" | "placeholder">("placeholder")
  const [planItems, setPlanItems] = React.useState<PagePlannerPlanItem[]>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const pagesBusy = Boolean(refinePlan?.pagesBusy)
  const pagesBusyLabel = refinePlan?.pagesBusyLabel ?? null
  const pagesOverridePlanItems = refinePlan?.pagesOverridePlanItems ?? null
  const pagesRegenerateError = refinePlan?.pagesRegenerateError ?? null
  const isSelectable = mode === "table"

  const isPanelOpen = mode === "table" ? true : open ?? uncontrolledOpen
  const setPanelOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (open === undefined) setUncontrolledOpen(next)
    },
    [onOpenChange, open]
  )

  const plansQuery = useQuery({
    queryKey: [PAGE_PLANS_QUERY_KEY, businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const data = await pagePlanner.listPlans(businessId)
      const all = Array.isArray(data?.plans) ? data.plans : []
      return all.filter((p) => (p.plan_type || "").toString().toLowerCase() === "pages")
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  })

  const hasAnyPlans = (plansQuery.data?.length ?? 0) > 0
  const isPlansLoading = plansQuery.isLoading

  const activePlanId = React.useMemo(() => {
    const plans = plansQuery.data ?? []
    const active = plans.find(isActivePlan)
    return active?.id ?? null
  }, [plansQuery.data])

  const activePlanQuery = useQuery({
    queryKey: ["page-planner-plan", businessId, activePlanId],
    enabled: Boolean(businessId) && typeof activePlanId === "number",
    queryFn: async () => {
      return pagePlanner.getPlanById(businessId, activePlanId as number)
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  })

  React.useEffect(() => {
    if (!planItemsOverride) return
    setPlanItems(planItemsOverride)
    setRowSelection({})
    setVisibleCount(10)
  }, [planItemsOverride])

  const selectedKeywords = React.useMemo(() => {
    const selectedIds = Object.entries(rowSelection)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)

    if (selectedIds.length === 0) return []

    const out: string[] = []
    for (let i = 0; i < planItems.length; i++) {
      const id = getPlanItemRowId(planItems[i]!, i)
      if (selectedIds.includes(id)) {
        const kw = (planItems[i]?.keyword || "").trim()
        if (kw) out.push(kw)
      }
    }
    return out
  }, [planItems, rowSelection])

  React.useEffect(() => {
    onTableContextChange?.({
      planId: typeof activePlanId === "number" ? activePlanId : null,
      planItems,
      selectedKeywords,
    })
  }, [activePlanId, onTableContextChange, planItems, selectedKeywords])

  React.useEffect(() => {
    if (!hasAnyPlans) return
    if (typeof activePlanId !== "number") return
    if (pagesBusy) return

    const extracted = extractPlanItems(activePlanQuery.data)
    if (!extracted || extracted.length === 0) return
    setPlanItems(extracted)
    setRowSelection({})
    setVisibleCount(10)

    const nextRows: PagesActionsItem[] = extracted.map((item, idx) => {
      const relevance = typeof item.business_relevance_score === "number" ? item.business_relevance_score : 0
      const vol = typeof item.search_volume === "number" ? item.search_volume : 0
      const opp = oppScoreLabel(typeof item.page_opportunity_score === "number" ? item.page_opportunity_score : 0)
      return {
        id: getPlanItemRowId(item, idx),
        title: item.keyword || "Untitled",
        status: "build",
        description: item.rationale || undefined,
        metrics: [
          { label: "Relevance", value: String(relevance) },
          { label: "Type", value: toTitleCase(item.page_type || "") || "—" },
          { label: "Vol", value: formatVolume(vol) },
          { label: "Opp Score", value: opp },
        ],
      }
    })

    const uniqRows = ensureUniqueRowIds(nextRows)
    setRows(uniqRows)
    setOpenItemId(uniqRows[0]?.id ?? null)
    setDoneIds(new Set())
    setSourceMode("active")
  }, [activePlanId, activePlanQuery.data, hasAnyPlans, pagesBusy])

  React.useEffect(() => {
    if (!pagesOverridePlanItems || pagesOverridePlanItems.length === 0) return
    if (pagesBusy) return

    setPlanItems(pagesOverridePlanItems)
    setRowSelection({})
    setVisibleCount(10)

    const nextRows: PagesActionsItem[] = pagesOverridePlanItems.map((item, idx) => {
      const relevance = typeof item.business_relevance_score === "number" ? item.business_relevance_score : 0
      const vol = typeof item.search_volume === "number" ? item.search_volume : 0
      const opp = oppScoreLabel(typeof item.page_opportunity_score === "number" ? item.page_opportunity_score : 0)
      return {
        id: getPlanItemRowId(item, idx),
        title: item.keyword || "Untitled",
        status: "build",
        description: item.rationale || undefined,
        metrics: [
          { label: "Relevance", value: String(relevance) },
          { label: "Type", value: toTitleCase(item.page_type || "") || "—" },
          { label: "Vol", value: formatVolume(vol) },
          { label: "Opp Score", value: opp },
        ],
      }
    })

    const uniqRows = ensureUniqueRowIds(nextRows)
    setRows(uniqRows)
    setOpenItemId(uniqRows[0]?.id ?? null)
    setDoneIds(new Set())
    setSourceMode("generated")
  }, [pagesOverridePlanItems, pagesBusy])

  React.useEffect(() => {
    // Only apply caller-provided items (e.g. storybook). In product we default to [].
    if (hasAnyPlans) return
    if (!items?.length) {
      setRows([])
      setOpenItemId(null)
      setDoneIds(new Set())
      setSourceMode("placeholder")
      setVisibleCount(10)
      return
    }
    const uniqRows = ensureUniqueRowIds(items)
    setRows(uniqRows)
    setOpenItemId(uniqRows[0]?.id ?? null)
    setDoneIds(new Set())
    setSourceMode("placeholder")
    setVisibleCount(10)
  }, [items, hasAnyPlans])

  const handleGenerate = React.useCallback(async () => {
    if (!businessId || isGenerating) return
    setIsGenerating(true)
    try {
      const response = await pagePlanner.generatePlan(businessId, {
        page_ideas_required: 30,
        calendar_events: [],
        regenerate: false,
      })

      const plan = Array.isArray(response?.plan) ? response.plan : []
      setPlanItems(plan)
      setRowSelection({})
      setVisibleCount(10)
      const nextRows: PagesActionsItem[] = plan.map((item, idx) => {
        const relevance = typeof item.business_relevance_score === "number" ? item.business_relevance_score : 0
        const vol = typeof item.search_volume === "number" ? item.search_volume : 0
        const opp = oppScoreLabel(typeof item.page_opportunity_score === "number" ? item.page_opportunity_score : 0)
        return {
          id: getPlanItemRowId(item, idx),
          title: item.keyword || "Untitled",
          status: "build",
          description: item.rationale || undefined,
          metrics: [
            { label: "Relevance", value: String(relevance) },
            { label: "Type", value: toTitleCase(item.page_type || "") || "—" },
            { label: "Vol", value: formatVolume(vol) },
            { label: "Opp Score", value: opp },
          ],
        }
      })

      const uniqRows = ensureUniqueRowIds(nextRows)
      setRows(uniqRows)
      setOpenItemId(uniqRows[0]?.id ?? null)
      setDoneIds(new Set())
      setSourceMode("generated")
      await queryClient.invalidateQueries({ queryKey: [PAGE_PLANS_QUERY_KEY, businessId] })

      // First plan UX: immediately make the newly generated plan active.
      try {
        const plans = await pagePlanner.listPlans(businessId)
        const pagesPlans = (Array.isArray(plans?.plans) ? plans.plans : []).filter(
          (p) => (p.plan_type || "").toString().toLowerCase() === "pages"
        )
        const newestId =
          pagesPlans.length > 0
            ? Math.max(...pagesPlans.map((p) => (typeof p.id === "number" ? p.id : 0)))
            : null
        if (typeof newestId === "number" && newestId > 0) {
          await pagePlanner.setActivePlan(businessId, newestId)
          await queryClient.invalidateQueries({ queryKey: [PAGE_PLANS_QUERY_KEY, businessId] })
          await queryClient.invalidateQueries({ queryKey: ["page-planner-plan", businessId, newestId] })
        }
      } catch {
        // If activation fails, keep showing the generated plan as a fallback.
      }
    } finally {
      setIsGenerating(false)
    }
  }, [businessId, isGenerating, pagePlanner, queryClient])

  const sortedRows = React.useMemo(() => {
    if (!sortDirection) return rows
    const dir = sortDirection === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = getRelevanceSortValue(a)
      const bv = getRelevanceSortValue(b)
      if (av !== bv) return (av - bv) * dir
      return a.title.localeCompare(b.title)
    })
  }, [rows, sortDirection])

  const isTableBusy = pagesBusy || isGenerating || externalBusy
  const displayRows = isTableBusy ? [] : sortedRows
  const isLoadMoreEnabled = mode === "section"
  const visibleRows = React.useMemo(() => {
    if (!isLoadMoreEnabled) return displayRows
    return displayRows.slice(0, Math.max(0, visibleCount))
  }, [displayRows, isLoadMoreEnabled, visibleCount])
  const remainingCount = isLoadMoreEnabled ? Math.max(0, displayRows.length - visibleRows.length) : 0
  const nextBatchCount = Math.min(20, remainingCount)

  const selectableRowIds = React.useMemo(() => {
    if (!isSelectable) return []
    return planItems.map((item, idx) => getPlanItemRowId(item, idx))
  }, [isSelectable, planItems])

  const allSelected =
    isSelectable &&
    selectableRowIds.length > 0 &&
    selectableRowIds.every((id) => Boolean((rowSelection as any)?.[id]))

  const someSelected =
    isSelectable &&
    selectableRowIds.some((id) => Boolean((rowSelection as any)?.[id])) &&
    !allSelected

  const toggleAllSelected = React.useCallback(
    (next: boolean) => {
      if (!isSelectable) return
      setRowSelection(() => {
        const out: RowSelectionState = {}
        for (const id of selectableRowIds) out[id] = next
        return out
      })
    },
    [isSelectable, selectableRowIds]
  )

  const showGenerateButton = !isPlansLoading && !hasAnyPlans
  const generateLabel = pagesBusy
    ? pagesBusyLabel || "Updating…"
    : isPlansLoading
      ? "Loading…"
    : showGenerateButton
      ? "Generate"
      : "Refine Plan"

  const handlePrimaryAction = React.useCallback(() => {
    if (isPlansLoading) return
    if (showGenerateButton) {
      void handleGenerate()
      return
    }
    if (pagesBusy) return
    refinePlan?.open("pages")
  }, [handleGenerate, refinePlan, showGenerateButton, pagesBusy, isPlansLoading])

  const table = isPanelOpen ? (
    <div
      id={contentId}
      className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-general-border bg-white"
    >
          <div className={cn("flex h-9 shrink-0 items-center", isSelectable && "gap-2 px-2")}>
            {isSelectable ? (
              <div className="flex w-10 items-center justify-center py-[7.5px]">
                <Checkbox
                  checked={allSelected || (someSelected && "indeterminate")}
                  onCheckedChange={(value) => toggleAllSelected(Boolean(value))}
                  aria-label="Select all"
                />
              </div>
            ) : null}
            <div
              role="button"
              tabIndex={0}
              aria-label="Sort by relevance"
              aria-sort={
                sortDirection === "asc"
                  ? "ascending"
                  : sortDirection === "desc"
                    ? "descending"
                    : "none"
              }
              onClick={() =>
                setSortDirection((prev) =>
                  prev === "desc" ? "asc" : prev === "asc" ? null : "desc"
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSortDirection((prev) =>
                    prev === "desc" ? "asc" : prev === "asc" ? null : "desc"
                  )
                }
              }}
              className={cn(
                "flex flex-1 items-center gap-2 py-[7.5px] cursor-pointer select-none rounded-md",
                !isSelectable && "px-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Page
              </span>
              {sortDirection === "asc" ? (
                <ChevronUp className="h-4 w-4 text-general-muted-foreground" />
              ) : sortDirection === "desc" ? (
                <ChevronDown className="h-4 w-4 text-general-muted-foreground" />
              ) : (
                <ArrowUpDown className="h-4 w-4 opacity-50" />
              )}
            </div>
            <div className={cn("w-[52px] py-[7.5px]", !isSelectable && "px-2")} />
          </div>
          <div className="h-px w-full shrink-0 bg-general-border" />

          <div className="relative flex min-h-0 flex-col overflow-y-auto">
            {pagesBusy || isGenerating || externalBusy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {pagesBusy
                      ? pagesBusyLabel || "Updating plan…"
                      : externalBusy
                        ? externalBusyLabel || "Updating plan…"
                        : "Generating plan…"}
                  </span>
                </div>
              </div>
            ) : null}

            {displayRows.length === 0 &&
            (isTableBusy || plansQuery.isLoading || activePlanQuery.isLoading) ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : displayRows.length === 0 && showGenerateButton && !plansQuery.isLoading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                No Data
              </div>
            ) : displayRows.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                No pages found.
              </div>
            ) : null}

            {visibleRows.map((item) => {
              const open = openItemId === item.id
              const hasMetrics = Boolean(item.metrics?.length)
              const showBottomBorder = true
              const showTriggerBorder = showBottomBorder && !(open && hasMetrics)
              const showContentBorder = showBottomBorder && hasMetrics
              const badgeStatus: ActionStatus = item.status ?? "build"
              const isDone = doneIds.has(item.id)
              const isChecked = Boolean((rowSelection as any)?.[item.id])

              return (
                <Collapsible
                  key={item.id}
                  open={open}
                  onOpenChange={(next) => setOpenItemId(next ? item.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setOpenItemId(open ? null : item.id)
                        }
                      }}
                      className={cn(
                        "group flex min-h-11 items-center gap-2 px-2 py-1.5 select-none cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        open && "bg-[#FAFAFA]",
                        showTriggerBorder && "border-b border-general-border"
                      )}
                    >
                      {isSelectable ? (
                        <div
                          className="flex w-10 shrink-0 items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(value) =>
                              setRowSelection((prev) => ({
                                ...(prev as any),
                                [item.id]: Boolean(value),
                              }))
                            }
                            aria-label="Select row"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-normal tracking-[0.07px]",
                              isDone ? "text-general-border-four" : "text-general-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {!open ? (
                            <>
                              <StatusPill status={badgeStatus} />
                              {isDone ? <CompletedPill /> : null}
                            </>
                          ) : null}
                        </div>
                        {open && item.description ? (
                          <div
                            className={cn(
                              "mt-0.5 truncate text-xs font-normal tracking-[0.18px]",
                              isDone ? "text-general-border-four" : "text-general-muted-foreground"
                            )}
                          >
                            {item.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex w-[52px] items-center justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          className={cn(
                            "h-8 w-8 rounded-lg transition-opacity",
                            open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          aria-label={open ? "Collapse row" : "Expand row"}
                        >
                          {open ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {item.metrics?.length ? (
                    <CollapsibleContent
                      className={cn(
                        "bg-[#FAFAFA]",
                        showContentBorder && "border-b border-general-border"
                      )}
                    >
                      <div className={cn("flex bg-[#FAFAFA]", isSelectable ? "items-start" : "items-center")}>
                        <div
                          className={cn(
                            "flex-1 px-2 py-1.5",
                            isSelectable
                              ? "grid grid-cols-2 gap-2"
                              : "flex flex-wrap items-center gap-2"
                          )}
                        >
                          {item.metrics.map((pill) => (
                            <MetricPillView key={`${item.id}-${pill.label}`} pill={pill} />
                          ))}
                        </div>
                        <div className={cn("flex w-[52px] justify-end px-2 py-1.5", isSelectable ? "items-start" : "items-center")}>
                          <Button
                            type="button"
                            variant={isDone ? "outline" : "default"}
                            size="icon-sm"
                            className={cn(
                              "h-8 w-8 rounded-lg",
                              isDone
                                ? "border-general-border-three bg-transparent"
                                : "bg-general-primary text-primary-foreground"
                            )}
                            aria-label={isDone ? "View" : "Generate"}
                            onClick={() => {
                              if (isDone) return
                              setDoneIds((prev) => {
                                const next = new Set(prev)
                                next.add(item.id)
                                return next
                              })
                            }}
                          >
                            {isDone ? <Eye /> : <Sparkles />}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  ) : null}
                </Collapsible>
              )
            })}

            {isLoadMoreEnabled && nextBatchCount > 0 ? (
              <div className="sticky bottom-0 mt-auto bg-white p-2">
                <div className="flex justify-start">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit rounded-md px-3"
                  onClick={() => setVisibleCount((prev) => prev + nextBatchCount)}
                  disabled={isTableBusy}
                >
                  + {nextBatchCount} more
                </Button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
  ) : null

  if (mode === "table") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {table}
        {pagesRegenerateError ? (
          <div className="mt-3 text-xs text-destructive">
            {pagesRegenerateError}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Card
      variant="profileCard"
      className={cn(
        "w-full bg-white p-4! flex flex-col border-0 shadow-none",
        isPanelOpen ? "flex-1 min-h-0" : "shrink-0"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isPanelOpen}
        aria-controls={contentId}
        onClick={() => setPanelOpen(!isPanelOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setPanelOpen(!isPanelOpen)
          }
        }}
        className={cn(
          "flex items-center gap-6 select-none cursor-pointer rounded-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isPanelOpen && "pb-4"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AppWindow className="h-[30px] w-[30px] text-schemes-on-surface" />
          <div className="truncate text-[30px] font-semibold leading-none tracking-[-0.3px] text-schemes-on-surface">
            {title}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-general-muted-foreground">
            {lastUpdatedLabel}
          </span>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg px-4"
            onClick={(e) => {
              e.stopPropagation()
              setPlansOpen(true)
            }}
          >
            Plans
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-9 rounded-lg bg-general-primary px-4 text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation()
              handlePrimaryAction()
            }}
            disabled={!businessId || isGenerating || pagesBusy || isPlansLoading}
          >
            <RotateCw className="h-[13px] w-[13px]" />
            {generateLabel}
          </Button>
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={(e) => {
            e.stopPropagation()
            setPanelOpen(!isPanelOpen)
          }}
          aria-label={isPanelOpen ? "Collapse section" : "Expand section"}
        >
          {isPanelOpen ? <ChevronUp className="h-[13px] w-[13px]" /> : <ChevronDown className="h-[13px] w-[13px]" />}
        </Button>
      </div>

      {table}

      {pagesRegenerateError ? (
        <div className="mt-3 text-xs text-destructive">
          {pagesRegenerateError}
        </div>
      ) : null}

      <PagesPlansDialog open={plansOpen} onOpenChange={setPlansOpen} businessId={businessId} />
    </Card>
  )
}

