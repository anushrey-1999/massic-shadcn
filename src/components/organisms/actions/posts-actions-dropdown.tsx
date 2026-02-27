"use client"

import * as React from "react"
import Image from "next/image"
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Megaphone,
  MicVocal,
  Plus,
  RotateCw,
  Settings2,
  Sparkles,
  ThumbsUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RelevancePill } from "@/components/ui/relevance-pill"
import { cn } from "@/lib/utils"
import { useRefinePlanOverlayOptional } from "./refine-plan-overlay-provider"

type PostActionType = "publish" | "engage"
type SortDirection = "asc" | "desc" | null

export type PostsActionsItem = {
  id: string
  channel: string
  title: string
  actionType: PostActionType
  description: string
  relevanceScore: number // 0..1
  volumeLabel: string
  opportunityLabel: string
  isCompleted?: boolean
  isDisabled?: boolean
}

type Props = {
  title?: string
  lastUpdatedLabel?: string
  items?: PostsActionsItem[]
  totalRows?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mode?: "section" | "table"
}

const DEFAULT_ITEMS: PostsActionsItem[] = [
  {
    id: "1",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "publish",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.66,
    volumeLabel: "397k",
    opportunityLabel: "High",
  },
  {
    id: "2",
    channel: "Reddit",
    title: "Consectetur adipiscing elit ut et massa mi",
    actionType: "publish",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna.",
    relevanceScore: 0.66,
    volumeLabel: "397k",
    opportunityLabel: "High",
  },
  {
    id: "3",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "engage",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.48,
    volumeLabel: "120k",
    opportunityLabel: "Medium",
  },
  {
    id: "4",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "publish",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.52,
    volumeLabel: "88k",
    opportunityLabel: "Medium",
  },
  {
    id: "5",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "publish",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.3,
    volumeLabel: "22k",
    opportunityLabel: "Low",
    isDisabled: true,
    isCompleted: true,
  },
  {
    id: "6",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "engage",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.75,
    volumeLabel: "512k",
    opportunityLabel: "High",
  },
  {
    id: "7",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "publish",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.41,
    volumeLabel: "64k",
    opportunityLabel: "Low",
  },
  {
    id: "8",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "engage",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.57,
    volumeLabel: "203k",
    opportunityLabel: "Medium",
  },
  {
    id: "9",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "publish",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.63,
    volumeLabel: "330k",
    opportunityLabel: "High",
  },
  {
    id: "10",
    channel: "Reddit",
    title: "Lorem ipsum dolor sit",
    actionType: "engage",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    relevanceScore: 0.22,
    volumeLabel: "12k",
    opportunityLabel: "Low",
  },
]

function getChannelIcon(channelName: string): string | null {
  const normalized = (channelName || "").toLowerCase().trim()
  const iconMap: Record<string, string> = {
    facebook: "/icons/facebook.png",
    instagram: "/icons/instagram.png",
    linkedin: "/icons/linkedin.png",
    x: "/icons/twitter.png",
    twitter: "/icons/twitter.png",
    youtube: "/icons/youtube.png",
    tiktok: "/icons/tiktok.png",
    reddit: "/icons/reddit.png",
  }
  return iconMap[normalized] || null
}

function ActionTypePill({ type }: { type: PostActionType }) {
  const label = type === "publish" ? "Publish" : "Engage"
  const Icon = type === "publish" ? Megaphone : MicVocal
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

function MetricPill({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-1.5 py-1 text-sm font-normal">
      <span className="text-[#a3a3a3]">{label}</span>
      {children}
    </div>
  )
}

function getOppScoreStyle(value: string): React.CSSProperties | undefined {
  const v = (value || "").toLowerCase().trim()
  if (v === "high") return { color: "#84cc16" } // lime-600 (matches RelevancePill)
  if (v === "medium") return { color: "hsl(45, 93%, 47%)" } // yellow/orange (matches RelevancePill)
  if (v === "low") return { color: "hsl(0, 84%, 60%)" } // red (matches RelevancePill)
  return undefined
}

export function PostsActionsDropdown({
  title = "Posts",
  lastUpdatedLabel = "Last updated 12 Feb",
  items = DEFAULT_ITEMS,
  totalRows = 30,
  open,
  onOpenChange,
  mode = "section",
}: Props) {
  const refinePlan = useRefinePlanOverlayOptional()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(true)
  const [rows, setRows] = React.useState<PostsActionsItem[]>(items)
  const [openItemId, setOpenItemId] = React.useState<string | null>(items[1]?.id ?? null)
  const [doneIds, setDoneIds] = React.useState<Set<string>>(
    () => new Set(items.filter((x) => x.isCompleted).map((x) => x.id))
  )
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
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
    setDoneIds(new Set(items.filter((x) => x.isCompleted).map((x) => x.id)))
    setSortDirection(null)
  }, [items])

  const sortedRows = React.useMemo(() => {
    if (!sortDirection) return rows
    const dir = sortDirection === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a.relevanceScore ?? 0
      const bv = b.relevanceScore ?? 0
      if (av !== bv) return (av - bv) * dir
      return a.title.localeCompare(b.title)
    })
  }, [rows, sortDirection])

  const handleLoadMore = React.useCallback(() => {
    setRows((prev) => {
      if (prev.length >= totalRows) return prev
      const start = prev.length + 1
      const count = Math.min(20, totalRows - prev.length)
      const next: PostsActionsItem[] = Array.from({ length: count }, (_, i) => {
        const n = start + i
        return {
          id: `more-${n}`,
          channel: "Reddit",
          title: `Lorem ipsum dolor sit ${n}`,
          actionType: n % 2 === 0 ? "engage" : "publish",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna.",
          relevanceScore: 0.1 + ((n * 17) % 90) / 100,
          volumeLabel: "397k",
          opportunityLabel: "High",
        }
      })
      return [...prev, ...next]
    })
  }, [totalRows])

  if (mode === "table") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          id={contentId}
          className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-general-border bg-white"
        >
          <div className="flex h-9 shrink-0 items-center">
            <div className="flex w-[140px] items-center gap-2 px-2 py-[7.5px]">
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Channel
              </span>
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            </div>
            <div className="flex flex-1 items-center gap-2 px-2 py-[7.5px]">
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Post
              </span>
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            </div>
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
                "flex w-[109px] items-center gap-2 px-2 py-[7.5px] cursor-pointer select-none rounded-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Relevance
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
            {sortedRows.map((row) => {
              const open = openItemId === row.id
              const iconPath = getChannelIcon(row.channel)
              const isDone = doneIds.has(row.id)
              const isDimmed = row.isDisabled || isDone

              return (
                <Collapsible
                  key={row.id}
                  open={open}
                  onOpenChange={(next) => setOpenItemId(next ? row.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setOpenItemId(open ? null : row.id)
                        }
                      }}
                      className={cn(
                        "group flex min-h-11 items-center select-none cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        open && "bg-[#FAFAFA]",
                        !open && "border-b border-general-border"
                      )}
                    >
                      <div className="flex w-[140px] items-center gap-2 px-2 py-1.5">
                        {iconPath ? (
                          <Image
                            src={iconPath}
                            alt={row.channel}
                            width={32}
                            height={32}
                            className={cn(
                              "shrink-0 rounded-[4px]",
                              isDimmed && "opacity-50"
                            )}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "truncate text-sm font-normal tracking-[0.07px]",
                            isDimmed
                              ? "text-general-border-four"
                              : "text-general-foreground"
                          )}
                        >
                          {row.channel}
                        </span>
                      </div>

                      <div className="flex flex-1 min-w-0 flex-col gap-0.5 px-2 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-normal tracking-[0.07px]",
                              isDimmed
                                ? "text-general-border-four"
                                : "text-general-foreground"
                            )}
                          >
                            {row.title}
                          </span>

                          {!open ? (
                            <>
                              <ActionTypePill type={row.actionType} />
                              {isDone ? <CompletedPill /> : null}
                            </>
                          ) : null}
                        </div>

                        {open ? (
                          <div className="truncate text-xs font-normal tracking-[0.18px] text-general-muted-foreground">
                            {row.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="w-[109px] px-2 py-1.5" />

                      <div className="flex w-[52px] items-center justify-end px-2 py-1.5">
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

                  <CollapsibleContent className="bg-[#FAFAFA] border-b border-general-border">
                    <div className="flex items-center bg-[#FAFAFA] pl-[140px]">
                      <div className="flex flex-1 items-center gap-2 px-2 py-1.5">
                        <MetricPill label="Relevance">
                          <RelevancePill
                            score={row.relevanceScore}
                            className="border-0 bg-transparent px-0 py-0"
                          />
                        </MetricPill>
                        <MetricPill label="Vol">
                          <span className="text-general-foreground">
                            {row.volumeLabel}
                          </span>
                        </MetricPill>
                        <MetricPill label="Opp Score">
                          <span style={getOppScoreStyle(row.opportunityLabel)}>
                            {row.opportunityLabel}
                          </span>
                        </MetricPill>
                      </div>

                      <div className="w-[109px]" />

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
                              next.add(row.id)
                              return next
                            })
                          }}
                        >
                          {isDone ? <Eye /> : <Sparkles />}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
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
          <ThumbsUp className="h-[30px] w-[30px] text-schemes-on-surface" />
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
              refinePlan?.open("posts")
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
          {isPanelOpen ? (
            <ChevronUp className="h-[13px] w-[13px]" />
          ) : (
            <ChevronDown className="h-[13px] w-[13px]" />
          )}
        </Button>
      </div>

      {isPanelOpen ? (
        <div
          id={contentId}
          className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-general-border bg-white"
        >
          <div className="flex h-9 shrink-0 items-center">
            <div className="flex w-[140px] items-center gap-2 px-2 py-[7.5px]">
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Channel
              </span>
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            </div>
            <div className="flex flex-1 items-center gap-2 px-2 py-[7.5px]">
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Post
              </span>
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            </div>
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
                "flex w-[109px] items-center gap-2 px-2 py-[7.5px] cursor-pointer select-none rounded-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
                Relevance
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
            {sortedRows.map((row) => {
              const open = openItemId === row.id
              const iconPath = getChannelIcon(row.channel)
              const isDone = doneIds.has(row.id)
              const isDimmed = row.isDisabled || isDone

              return (
                <Collapsible
                  key={row.id}
                  open={open}
                  onOpenChange={(next) => setOpenItemId(next ? row.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setOpenItemId(open ? null : row.id)
                        }
                      }}
                      className={cn(
                        "group flex min-h-11 items-center select-none cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        open && "bg-[#FAFAFA]",
                        !open && "border-b border-general-border"
                      )}
                    >
                      <div className="flex w-[140px] items-center gap-2 px-2 py-1.5">
                        {iconPath ? (
                          <Image
                            src={iconPath}
                            alt={row.channel}
                            width={32}
                            height={32}
                            className={cn(
                              "shrink-0 rounded-[4px]",
                              isDimmed && "opacity-50"
                            )}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "truncate text-sm font-normal tracking-[0.07px]",
                            isDimmed
                              ? "text-general-border-four"
                              : "text-general-foreground"
                          )}
                        >
                          {row.channel}
                        </span>
                      </div>

                      <div className="flex flex-1 min-w-0 flex-col gap-0.5 px-2 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-normal tracking-[0.07px]",
                              isDimmed
                                ? "text-general-border-four"
                                : "text-general-foreground"
                            )}
                          >
                            {row.title}
                          </span>

                          {!open ? (
                            <>
                              <ActionTypePill type={row.actionType} />
                              {isDone ? <CompletedPill /> : null}
                            </>
                          ) : null}
                        </div>

                        {open ? (
                          <div className="truncate text-xs font-normal tracking-[0.18px] text-general-muted-foreground">
                            {row.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="w-[109px] px-2 py-1.5" />

                      <div className="flex w-[52px] items-center justify-end px-2 py-1.5">
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

                  <CollapsibleContent className="bg-[#FAFAFA] border-b border-general-border">
                    <div className="flex items-center bg-[#FAFAFA] pl-[140px]">
                      <div className="flex flex-1 items-center gap-2 px-2 py-1.5">
                        <MetricPill label="Relevance">
                          <RelevancePill
                            score={row.relevanceScore}
                            className="border-0 bg-transparent px-0 py-0"
                          />
                        </MetricPill>
                        <MetricPill label="Vol">
                          <span className="text-general-foreground">
                            {row.volumeLabel}
                          </span>
                        </MetricPill>
                        <MetricPill label="Opp Score">
                          <span style={getOppScoreStyle(row.opportunityLabel)}>
                            {row.opportunityLabel}
                          </span>
                        </MetricPill>
                      </div>

                      <div className="w-[109px]" />

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
                              next.add(row.id)
                              return next
                            })
                          }}
                        >
                          {isDone ? <Eye /> : <Sparkles />}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
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
      ) : null}
    </Card>
  )
}

