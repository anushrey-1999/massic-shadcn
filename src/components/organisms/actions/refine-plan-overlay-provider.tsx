"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RefinePlanOverlay } from "./refine-plan-overlay"
import { usePagePlanner } from "@/hooks/use-page-planner"
import type { PagePlannerPlanItem, PagePlannerPlanMeta } from "@/types/page-planner-types"

export type RefinePlanSource = "pages" | "posts"

type RefinePlanOverlayContextValue = {
  open: (source: RefinePlanSource) => void
  close: () => void
  pagesBusy: boolean
  pagesBusyLabel: string | null
  pagesRegenerating: boolean
  pagesRegenerateError: string | null
  pagesOverridePlanItems: PagePlannerPlanItem[] | null
  regeneratePagesPlan: (args: { regenerate: boolean }) => void
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
    setOverlayOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setOverlayOpen(false)
  }, [])

  const regeneratePagesPlan = React.useCallback(
    (args: { regenerate: boolean }) => {
      if (!businessId || pagesRegenerating || pagesAccepting) return

      setPagesRegenerateError(null)
      setPagesRegenerating(true)

      void (async () => {
        try {
          const response = await pagePlanner.generatePlan(businessId, {
            page_ideas_required: 30,
            calendar_events: [],
            regenerate: args.regenerate,
          })

          const plan = Array.isArray(response?.plan) ? response.plan : []
          setPagesOverridePlanItems(plan)
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

