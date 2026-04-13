"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { PagesActionsDropdown } from "./pages-actions-dropdown"
import { PostsActionsDropdown } from "./posts-actions-dropdown"
import type { RefinePlanSource } from "./refine-plan-overlay-provider"
import { useRefinePlanOverlayOptional } from "./refine-plan-overlay-provider"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanItem } from "@/types/page-planner-types"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  source: RefinePlanSource
}

function normalizeKeyword(value: unknown): string | null {
  if (typeof value !== "string") return null
  const s = value.trim()
  return s ? s : null
}

function isSuccessStatus(value: unknown): boolean {
  return String(value || "").trim().toLowerCase() === "success"
}

function getItemStatus(item: { status?: string; page_status?: string; pageStatus?: string }): string | null {
  const s = item?.status ?? item?.page_status ?? (item as any)?.pageStatus
  return typeof s === "string" && s.length > 0 ? s : null
}

function buildSelectedPages(args: {
  planItems: Array<{ keyword?: string; status?: string; page_status?: string; pageStatus?: string }>
  selectedKeywords: string[]
}): string[] {
  const planKeywordsOrdered = args.planItems
    .map((x) => (typeof x.keyword === "string" ? x.keyword : ""))
    .filter((s) => s.length > 0)

  const planKeywordsSet = new Set(planKeywordsOrdered)

  const selectedRaw = args.selectedKeywords.filter((s) => typeof s === "string" && s.length > 0)
  if (selectedRaw.length > 0) {
    const nonSuccessSelected = selectedRaw.filter((s) => {
      if (!planKeywordsSet.has(s)) return false
      const item = args.planItems.find((p) => p.keyword === s)
      return item == null || !isSuccessStatus(getItemStatus(item))
    })
    return nonSuccessSelected
  }

  const nonSuccessOrdered = args.planItems
    .filter((x) => !isSuccessStatus(getItemStatus(x)))
    .map((x) => (typeof x.keyword === "string" ? x.keyword : ""))
    .filter((s) => s.length > 0)
  return nonSuccessOrdered
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3 text-left text-sm shadow-none",
          isUser
            ? "bg-foreground-light text-general-foreground border-0 rounded-br-none"
            : "border border-general-border bg-white text-general-muted-foreground rounded-bl-none"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

export function RefinePlanOverlay({ open, onOpenChange, businessId, source }: Props) {
  const overlayCtx = useRefinePlanOverlayOptional()
  const pagePlanner = usePagePlanner()
  const queryClient = useQueryClient()
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null)
  const prevOverflowRef = React.useRef<string | null>(null)
  const prevOverscrollRef = React.useRef<string | null>(null)

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isPreviewGenerating, setIsPreviewGenerating] = React.useState(false)
  const [pagesTableCtx, setPagesTableCtx] = React.useState<{
    planId: number | null
    planItems: PagePlannerPlanItem[]
    selectedKeywords: string[]
  } | null>(null)
  const [overridePlanItems, setOverridePlanItems] = React.useState<PagePlannerPlanItem[] | null>(null)
  const [diffKeywords, setDiffKeywords] = React.useState<{
    added: string[]
    changed: string[]
  } | null>(null)
  const [acceptCandidate, setAcceptCandidate] = React.useState<{
    planItems: PagePlannerPlanItem[]
    planId?: number | null
  } | null>(null)

  React.useEffect(() => {
    if (typeof document === "undefined") return
    const el =
      document.querySelector<HTMLElement>('[data-slot="actions-page-content"]') ??
      document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
    setPortalTarget(el)
  }, [])

  React.useEffect(() => {
    if (!open) return
    setMessages([])
    setInput("")
    setIsSending(false)
    setIsPreviewGenerating(false)
    setPagesTableCtx(null)
    setOverridePlanItems(null)
    setDiffKeywords(null)
    setAcceptCandidate(null)
  }, [open, source])

  React.useEffect(() => {
    if (!open) return
    if (source !== "pages") return
    const items = overlayCtx?.pagesOverridePlanItems
    if (!items || items.length === 0) return
    setOverridePlanItems(items)
    setAcceptCandidate({
      planItems: items,
      planId: overlayCtx?.pagesOverridePlanId ?? null,
    })
  }, [open, overlayCtx?.pagesOverridePlanItems, overlayCtx?.pagesOverridePlanId, source])

  React.useEffect(() => {
    if (!portalTarget) return
    const restore = () => {
      if (prevOverflowRef.current !== null) {
        portalTarget.style.overflow = prevOverflowRef.current
        prevOverflowRef.current = null
      }
      if (prevOverscrollRef.current !== null) {
        ;(portalTarget.style as any).overscrollBehavior = prevOverscrollRef.current
        prevOverscrollRef.current = null
      }
    }

    if (!open) {
      restore()
      return
    }

    prevOverflowRef.current = portalTarget.style.overflow
    prevOverscrollRef.current = (portalTarget.style as any).overscrollBehavior

    portalTarget.style.overflow = "hidden"
    ;(portalTarget.style as any).overscrollBehavior = "none"

    return restore
  }, [open, portalTarget])

  const handleClose = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleSend = React.useCallback(async () => {
    const text = input.trim()
    if (!text || isSending) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsSending(true)

    try {
      if (source !== "pages") {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: "Posts refine is not implemented yet." },
        ])
        return
      }

      const ctx = pagesTableCtx
      const effectivePlanItems = overridePlanItems ?? ctx?.planItems ?? []
      const effectivePlanId =
        acceptCandidate?.planId ?? overlayCtx?.pagesOverridePlanId ?? ctx?.planId ?? null
      if (!(typeof effectivePlanId === "number" && effectivePlanId > 0)) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: "No active plan found to refine." },
        ])
        return
      }

      const selected_pages = buildSelectedPages({
        planItems: effectivePlanItems,
        selectedKeywords: ctx?.selectedKeywords ?? [],
      })

      if (selected_pages.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              "Select pages from the table (or keep none selected to refine the full plan).",
          },
        ])
        return
      }

      let response: unknown
      try {
        response = await pagePlanner.refinePlan(businessId, {
          plan_id: effectivePlanId,
          selected_pages,
          user_prompt: text,
          calendar_events: [],
          page_ideas_required: 30,
        })
      } catch (err: any) {
        const status = err?.response?.status
        const server =
          err?.response?.data != null
            ? typeof err.response.data === "string"
              ? err.response.data
              : JSON.stringify(err.response.data)
            : null
        const msg =
          server ||
          err?.message ||
          (status ? `Request failed (${status})` : "Request failed")
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: msg },
        ])
        return
      }

      const payload: any = response
      const itemsMaybe =
        (Array.isArray(payload?.plan) && payload.plan) ||
        (Array.isArray(payload?.items) && payload.items) ||
        (Array.isArray(payload?.output_data?.plan) && payload.output_data.plan) ||
        (Array.isArray(payload?.output_data?.items) && payload.output_data.items) ||
        null

      if (itemsMaybe) {
        const planItems = itemsMaybe as PagePlannerPlanItem[]
        setOverridePlanItems(planItems)
        setDiffKeywords(() => {
          const prevItems = effectivePlanItems ?? []
          const prevByKeyword = new Map<string, string>()
          for (const item of prevItems) {
            const kw = normalizeKeyword((item as any)?.keyword)
            if (!kw) continue
            if (prevByKeyword.has(kw)) continue
            const raw: any = item as any
            const fingerprint = JSON.stringify({
              keyword: kw,
              page_id: raw?.page_id ?? raw?.pageId ?? null,
              page_type: raw?.page_type ?? raw?.pageType ?? raw?.type ?? null,
              intent: raw?.search_intent ?? raw?.intent ?? null,
              rationale: raw?.rationale ?? raw?.reason ?? raw?.description ?? raw?.explanation ?? null,
              search_volume: raw?.search_volume ?? raw?.searchVolume ?? raw?.volume ?? null,
              relevance_score:
                raw?.business_relevance_score ?? raw?.businessRelevanceScore ?? raw?.relevance_score ?? raw?.relevanceScore ?? null,
              opportunity_score:
                raw?.page_opportunity_score ?? raw?.pageOpportunityScore ?? raw?.opportunity_score ?? raw?.opportunityScore ?? null,
              status: raw?.status ?? raw?.page_status ?? raw?.pageStatus ?? null,
            })
            prevByKeyword.set(kw, fingerprint)
          }

          const nextByKeyword = new Map<string, string>()
          const added: string[] = []
          const changed: string[] = []
          for (const item of planItems) {
            const kw = normalizeKeyword((item as any)?.keyword)
            if (!kw) continue
            if (nextByKeyword.has(kw)) continue
            const raw: any = item as any
            const fingerprint = JSON.stringify({
              keyword: kw,
              page_id: raw?.page_id ?? raw?.pageId ?? null,
              page_type: raw?.page_type ?? raw?.pageType ?? raw?.type ?? null,
              intent: raw?.search_intent ?? raw?.intent ?? null,
              rationale: raw?.rationale ?? raw?.reason ?? raw?.description ?? raw?.explanation ?? null,
              search_volume: raw?.search_volume ?? raw?.searchVolume ?? raw?.volume ?? null,
              relevance_score:
                raw?.business_relevance_score ?? raw?.businessRelevanceScore ?? raw?.relevance_score ?? raw?.relevanceScore ?? null,
              opportunity_score:
                raw?.page_opportunity_score ?? raw?.pageOpportunityScore ?? raw?.opportunity_score ?? raw?.opportunityScore ?? null,
              status: raw?.status ?? raw?.page_status ?? raw?.pageStatus ?? null,
            })
            nextByKeyword.set(kw, fingerprint)
            const prev = prevByKeyword.get(kw)
            if (!prev) added.push(kw)
            else if (prev !== fingerprint) changed.push(kw)
          }

          return { added, changed }
        })
        const extractedPlanId =
          (typeof payload?.plan_id === "number" && payload.plan_id) ||
          (typeof payload?.planId === "number" && payload.planId) ||
          (typeof payload?.id === "number" && payload.id) ||
          (typeof payload?.plan_meta?.id === "number" && payload.plan_meta.id) ||
          null
        setAcceptCandidate({ planItems, planId: extractedPlanId })
      }

      // A refine call creates/updates plans server-side; ensure "All plans" reflects it immediately.
      queryClient.invalidateQueries({ queryKey: ["page-planner-plans", businessId] })

      const assistantText =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.answer === "string" && payload.answer) ||
        "Updated the plan based on your request."

      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: assistantText }])
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, businessId, source, pagePlanner, pagesTableCtx, queryClient, acceptCandidate, overridePlanItems, overlayCtx?.pagesOverridePlanId])

  if (!open) return null

  const content = (
    <div
      className="absolute inset-0 z-50 bg-foreground-light"
      role="dialog"
      aria-label="Refine plan"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose()
      }}
    >
      <div className="absolute inset-0 p-5">
        <div className="h-full w-full max-w-[1224px] overflow-hidden rounded-2xl bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleClose}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="text-xl font-semibold text-general-foreground">Refine Plan</div>
              </div>

              <div />
            </div>

            <div className="flex flex-1 min-h-0 flex-col px-6 pb-6 pt-2">
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex min-h-0 flex-col">
                  {source === "pages" ? (
                    <PagesActionsDropdown
                      businessId={businessId}
                      mode="table"
                      planItemsOverride={overridePlanItems}
                      addedKeywords={diffKeywords?.added ?? null}
                      changedKeywords={diffKeywords?.changed ?? null}
                      externalBusy={isPreviewGenerating}
                      externalBusyLabel="Generating plan…"
                      onTableContextChange={setPagesTableCtx}
                    />
                  ) : (
                    <PostsActionsDropdown mode="table" />
                  )}

                  {source === "pages" && acceptCandidate ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        className="h-10 w-full rounded-lg bg-general-primary px-4 text-primary-foreground"
                        disabled={Boolean(overlayCtx?.pagesBusy) || isSending || isPreviewGenerating}
                        onClick={() => {
                          onOpenChange(false)
                          overlayCtx?.acceptPagesPlan({
                            planItems: acceptCandidate.planItems,
                            planId: acceptCandidate.planId ?? null,
                          })
                        }}
                      >
                        Accept this plan
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="flex min-h-0 flex-col items-center">
                  <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="mx-auto w-full max-w-[552px] space-y-4 px-2 py-5 pb-7">
                        {messages.map((m) => (
                          <Bubble key={m.id} message={m} />
                        ))}
                        {isSending ? (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-xl rounded-bl-none border border-general-border bg-white px-4 py-3 text-left shadow-none">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking…</span>
                              </div>
                              <div className="mt-3 space-y-2">
                                <div className="h-2 w-48 rounded bg-muted/60 animate-pulse" />
                                <div className="h-2 w-64 rounded bg-muted/60 animate-pulse" />
                                <div className="h-2 w-40 rounded bg-muted/60 animate-pulse" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full pt-10">
                <div className="border-none rounded-none flex items-center">
                  <div className="pt-0 max-w-[600px] w-full mx-auto">
                    <div className="relative bg-foreground-light p-2 rounded-xl">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type any adjustments you want to make to your web planner..."
                        className="min-h-[52px] max-h-24 resize-none overflow-y-auto pr-14 rounded-lg shadow-none border-none py-3.5 leading-6 placeholder:text-base md:placeholder:text-sm placeholder:leading-6"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            void handleSend()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9"
                        onClick={() => void handleSend()}
                        disabled={input.trim().length === 0 || isSending}
                        aria-label="Send"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )

  return portalTarget ? createPortal(content, portalTarget) : content
}

