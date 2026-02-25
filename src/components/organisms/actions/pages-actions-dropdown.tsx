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
  Plus,
  RotateCw,
  Settings2,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RelevancePill } from "@/components/ui/relevance-pill"
import { cn } from "@/lib/utils"
import { useRefinePlanOverlayOptional } from "./refine-plan-overlay-provider"

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
  title?: string
  lastUpdatedLabel?: string
  items?: PagesActionsItem[]
  totalRows?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mode?: "section" | "table"
}

const DEFAULT_ITEMS: PagesActionsItem[] = [
  {
    id: "1",
    title: "Lorem ipsum dolor sit",
    status: "build",
  },
  {
    id: "2",
    title: "Consectetur adipiscing elit ut et massa mi",
    status: "optimize",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna.",
    metrics: [
      {
        label: "Relevance",
        value: "66",
      },
      { label: "Type", value: "Transactional" },
      { label: "Vol", value: "397k" },
      { label: "Opp Score", value: "High", valueClassName: "text-lime-600" },
    ],
  },
  {
    id: "3",
    title: "Lorem ipsum dolor sit",
    status: "build",
  },
  {
    id: "4",
    title: "Consectetur adipiscing elit ut et massa mi",
    status: "optimize",
  },
  {
    id: "5",
    title: "Lorem ipsum dolor sit",
    status: "build",
  },
  {
    id: "6",
    title: "Consectetur adipiscing elit ut et massa mi",
    status: "optimize",
  },
  {
    id: "7",
    title: "Lorem ipsum dolor sit",
    status: "build",
  },
  {
    id: "8",
    title: "Consectetur adipiscing elit ut et massa mi",
    status: "optimize",
  },
  {
    id: "9",
    title: "Lorem ipsum dolor sit",
    status: "build",
  },
  {
    id: "10",
    title: "Consectetur adipiscing elit ut et massa mi",
    status: "optimize",
  },
]

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
  title = "Pages",
  lastUpdatedLabel = "Last updated 12 Feb",
  items = DEFAULT_ITEMS,
  totalRows = 30,
  open,
  onOpenChange,
  mode = "section",
}: Props) {
  const refinePlan = useRefinePlanOverlayOptional()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(true)
  const [rows, setRows] = React.useState<PagesActionsItem[]>(items)
  const [openItemId, setOpenItemId] = React.useState<string | null>(items[1]?.id ?? null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
  const [doneIds, setDoneIds] = React.useState<Set<string>>(() => new Set())
  const contentId = React.useId()

  const isPanelOpen = mode === "table" ? true : open ?? uncontrolledOpen
  const setPanelOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (open === undefined) setUncontrolledOpen(next)
    },
    [onOpenChange, open]
  )

  React.useEffect(() => {
    setRows(items)
    setOpenItemId(items[1]?.id ?? null)
    setDoneIds(new Set())
  }, [items])

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

  const handleLoadMore = React.useCallback(() => {
    setRows((prev) => {
      if (prev.length >= totalRows) return prev
      const start = prev.length + 1
      const count = Math.min(20, totalRows - prev.length)
      const next: PagesActionsItem[] = Array.from({ length: count }, (_, i) => {
        const n = start + i
        const status: ActionStatus = n % 2 === 0 ? "optimize" : "build"
        return {
          id: `more-${n}`,
          title: `Lorem ipsum dolor sit ${n}`,
          status,
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna.",
        }
      })
      return [...prev, ...next]
    })
  }, [totalRows])

  const table = isPanelOpen ? (
    <div
      id={contentId}
      className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-general-border bg-white"
    >
          <div className="flex h-9 shrink-0 items-center">
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
                "flex flex-1 items-center gap-2 px-2 py-[7.5px] cursor-pointer select-none rounded-md",
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
            <div className="w-[52px] px-2 py-[7.5px]" />
          </div>
          <div className="h-px w-full shrink-0 bg-general-border" />

          <div className="flex min-h-0 flex-col overflow-y-auto">
            {sortedRows.map((item) => {
              const open = openItemId === item.id
              const hasMetrics = Boolean(item.metrics?.length)
              const showBottomBorder = true
              const showTriggerBorder = showBottomBorder && !(open && hasMetrics)
              const showContentBorder = showBottomBorder && hasMetrics
              const badgeStatus: ActionStatus = item.status ?? "build"
              const isDone = doneIds.has(item.id)

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
                      <div className="flex items-center bg-[#FAFAFA]">
                        <div className="flex flex-1 items-center gap-2 px-2 py-1.5">
                          {item.metrics.map((pill) => (
                            <MetricPillView key={`${item.id}-${pill.label}`} pill={pill} />
                          ))}
                        </div>
                        <div className="flex w-[52px] items-center justify-end px-2 py-1.5">
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

            {rows.length < totalRows ? (
              <div className="px-2 py-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-lg px-4 text-general-secondary-foreground"
                  onClick={handleLoadMore}
                >
                  <Plus className="h-[13px] w-[13px]" />
                  20 more
                </Button>
              </div>
            ) : null}
          </div>
        </div>
  ) : null

  if (mode === "table") {
    return <div className="flex min-h-0 flex-1 flex-col">{table}</div>
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
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg border-general-border-three bg-transparent"
            aria-label="Settings"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings2 className="h-[13px] w-[13px]" />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-9 rounded-lg bg-general-primary px-4 text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation()
              refinePlan?.open("pages")
            }}
          >
            <RotateCw className="h-[13px] w-[13px]" />
            Regenerate
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
    </Card>
  )
}

