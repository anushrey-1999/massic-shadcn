"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RefinePlanOverlay } from "./refine-plan-overlay"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanItem, PagePlannerPlanMeta } from "@/types/page-planner-types"

export type RefinePlanSource = "pages" | "posts"

export type PagesRegenerateMode = "full" | "remaining"

type RefinePlanOverlayContextValue = {
  open: (source: RefinePlanSource) => void
  close: () => void
  pagesBusy: boolean
  pagesBusyLabel: string | null
  pagesRegenerating: boolean
  pagesRegenerateError: string | null
  pagesOverridePlanItems: PagePlannerPlanItem[] | null
  regeneratePagesPlan: (args: {
    mode: PagesRegenerateMode
    planId: number | null
    planItems: PagePlannerPlanItem[]
  }) => void
  acceptPagesPlan: (args: { planItems: PagePlannerPlanItem[]; planId?: number | null }) => void
}

const RefinePlanOverlayContext = React.createContext<
  RefinePlanOverlayContextValue | undefined
>(undefined)

export function useRefinePlanOverlayOptional() {
  return React.useContext(RefinePlanOverlayContext)
}

type Props = {
  businessId: string
  children: React.ReactNode
}

function isPagesPlan(plan: PagePlannerPlanMeta): boolean {
  return (plan.plan_type || "").toString().toLowerCase() === "pages"
}

function isSuccessStatus(value: unknown): boolean {
  return String(value || "").trim().toLowerCase() === "success"
}

function extractPlanItemsFromResponse(payload: unknown): PagePlannerPlanItem[] {
  const p: any = payload as any
  const direct =
    (Array.isArray(p?.plan) && p.plan) ||
    (Array.isArray(p?.items) && p.items) ||
    (Array.isArray(p?.output_data?.plan) && p.output_data.plan) ||
    (Array.isArray(p?.output_data?.items) && p.output_data.items) ||
    (Array.isArray(p?.plan_json) && p.plan_json) ||
    []
  return Array.isArray(direct) ? (direct as PagePlannerPlanItem[]) : []
}

export function RefinePlanOverlayProvider({ businessId, children }: Props) {
  const pagePlanner = usePagePlanner()
  const queryClient = useQueryClient()
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const [source, setSource] = React.useState<RefinePlanSource>("pages")
  const [pagesRegenerating, setPagesRegenerating] = React.useState(false)
  const [pagesAccepting, setPagesAccepting] = React.useState(false)
  const [pagesRegenerateError, setPagesRegenerateError] = React.useState<string | null>(null)
  const [pagesOverridePlanItems, setPagesOverridePlanItems] = React.useState<PagePlannerPlanItem[] | null>(
    null
  )

  const open = React.useCallback((nextSource: RefinePlanSource) => {
    setSource(nextSource)
    // Opening the overlay should always start from the active plan view.
    // Any preview/override should only appear after a regenerate/refine action.
    setPagesOverridePlanItems(null)
    setPagesRegenerateError(null)
    setOverlayOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setOverlayOpen(false)
  }, [])

  const regeneratePagesPlan = React.useCallback(
    (args: { mode: PagesRegenerateMode; planId: number | null; planItems: PagePlannerPlanItem[] }) => {
      if (!businessId || pagesRegenerating || pagesAccepting) return

      setPagesRegenerateError(null)
      setPagesRegenerating(true)

      void (async () => {
        try {
          if (args.mode === "remaining") {
            const planId = args.planId
            if (!(typeof planId === "number" && planId > 0)) {
              throw new Error("No active plan found to regenerate.")
            }

            // Preserve selected_pages exactly as received from the plan API (order + casing).
            const remainingKeywords = (args.planItems || [])
              .filter((x: any) => !isSuccessStatus(x?.status))
              .map((x: any) => (typeof x?.keyword === "string" ? x.keyword : ""))
              .filter((kw) => typeof kw === "string" && kw.length > 0)

            if (remainingKeywords.length === 0) {
              throw new Error("No remaining pages found to regenerate.")
            }

            const response = await pagePlanner.refinePlan(businessId, {
              plan_id: planId,
              selected_pages: remainingKeywords,
              user_prompt: "",
              calendar_events: [],
              page_ideas_required: 30,
            })

            setPagesOverridePlanItems(extractPlanItemsFromResponse(response))
            await queryClient.invalidateQueries({ queryKey: ["page-planner-plans", businessId] })
            await queryClient.refetchQueries({ queryKey: ["page-planner-plans", businessId] })
            return
          }

          const response = await pagePlanner.generatePlan(businessId, {
            page_ideas_required: 30,
            calendar_events: [],
            regenerate: false,
          })

          setPagesOverridePlanItems(extractPlanItemsFromResponse(response))
          await queryClient.invalidateQueries({ queryKey: ["page-planner-plans", businessId] })
          await queryClient.refetchQueries({ queryKey: ["page-planner-plans", businessId] })
        } catch (err: any) {
          const status = err?.response?.status
          const server =
            err?.response?.data != null
              ? typeof err.response.data === "string"
                ? err.response.data
                : JSON.stringify(err.response.data)
              : null
          setPagesRegenerateError(
            server || err?.message || (status ? `Request failed (${status})` : "Request failed")
          )
        } finally {
          setPagesRegenerating(false)
        }
      })()
    },
    [businessId, pagePlanner, pagesRegenerating, pagesAccepting, queryClient]
  )

  const acceptPagesPlan = React.useCallback(
    (args: { planItems: PagePlannerPlanItem[]; planId?: number | null }) => {
      if (!businessId || pagesRegenerating || pagesAccepting) return

      setPagesRegenerateError(null)
      setPagesAccepting(true)
      setPagesOverridePlanItems(args.planItems)

      void (async () => {
        try {
          let planId = typeof args.planId === "number" ? args.planId : null
          if (!(typeof planId === "number" && planId > 0)) {
            await queryClient.invalidateQueries({ queryKey: ["page-planner-plans", businessId] })
            const plans = await pagePlanner.listPlans(businessId)
            const pagesPlans = (Array.isArray(plans?.plans) ? plans.plans : []).filter(isPagesPlan)
            planId =
              pagesPlans.length > 0
                ? Math.max(...pagesPlans.map((p) => (typeof p.id === "number" ? p.id : 0)))
                : null
          }

          if (typeof planId === "number" && planId > 0) {
            await pagePlanner.setActivePlan(businessId, planId)
          }

          await queryClient.invalidateQueries({ queryKey: ["page-planner-plans", businessId] })
          await queryClient.invalidateQueries({ queryKey: ["page-planner-plan", businessId] })
        } catch (err: any) {
          const status = err?.response?.status
          const server =
            err?.response?.data != null
              ? typeof err.response.data === "string"
                ? err.response.data
                : JSON.stringify(err.response.data)
              : null
          setPagesRegenerateError(
            server || err?.message || (status ? `Request failed (${status})` : "Request failed")
          )
        } finally {
          setPagesAccepting(false)
        }
      })()
    },
    [businessId, pagePlanner, pagesRegenerating, pagesAccepting, queryClient]
  )

  const pagesBusy = pagesRegenerating || pagesAccepting
  const pagesBusyLabel = pagesAccepting ? "Applying plan…" : pagesRegenerating ? "Regenerating plan…" : null

  return (
    <RefinePlanOverlayContext.Provider
      value={{
        open,
        close,
        pagesBusy,
        pagesBusyLabel,
        pagesRegenerating,
        pagesRegenerateError,
        pagesOverridePlanItems,
        regeneratePagesPlan,
        acceptPagesPlan,
      }}
    >
      {children}
      <RefinePlanOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        businessId={businessId}
        source={source}
      />
    </RefinePlanOverlayContext.Provider>
  )
}

