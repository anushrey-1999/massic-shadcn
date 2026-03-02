"use client"

import { api } from "@/hooks/use-api"
import type {
  PagePlannerGeneratePlanRequest,
  PagePlannerGeneratePlanResponse,
  PagePlannerPlanDetailResponse,
  PagePlannerPlansListResponse,
  PagePlannerRefinePlanRequest,
  PagePlannerRefinePlanResponse,
  PagePlannerSetActivePlanRequest,
} from "@/types/page-planner-types"

function businessIdQuery(businessId: string) {
  return `business_id=${encodeURIComponent(businessId)}`
}

function isPlannerFailureResponse(payload: unknown): { ok: boolean; message?: string } {
  if (!payload || typeof payload !== "object") return { ok: true }
  const p: any = payload as any
  if (p.err === true) return { ok: false, message: p.message || p.error }
  if (p.success === false) return { ok: false, message: p.message || p.error }
  if (typeof p.status === "number" && p.status >= 400) return { ok: false, message: p.message || p.error }
  return { ok: true }
}

export function usePagePlanner() {
  const withPlannerDefaults = <T extends { page_ideas_required?: number }>(body: T) => {
    return {
      page_ideas_required: 30,
      ...(body || {}),
    }
  }

  const listPlans = async (businessId: string) => {
    const endpoint = `/page-planner/plans?${businessIdQuery(businessId)}`
    return api.get<PagePlannerPlansListResponse>(endpoint, "python")
  }

  const getPlanById = async (businessId: string, planId: number) => {
    const endpoint = `/page-planner/plans/${encodeURIComponent(String(planId))}?${businessIdQuery(businessId)}`
    return api.get<PagePlannerPlanDetailResponse>(endpoint, "python")
  }

  const generatePlan = async (businessId: string, body: PagePlannerGeneratePlanRequest) => {
    const endpoint = `/page-planner/generate-plan?${businessIdQuery(businessId)}`
    return api.post<PagePlannerGeneratePlanResponse>(endpoint, "python", withPlannerDefaults(body))
  }

  const setActivePlan = async (businessId: string, planId: number) => {
    const endpoint = `/page-planner/set-active-plan?${businessIdQuery(businessId)}`
    const body: PagePlannerSetActivePlanRequest = { plan_id: planId }
    const response = await api.post<unknown>(endpoint, "python", body)
    const verdict = isPlannerFailureResponse(response)
    if (!verdict.ok) {
      throw new Error(verdict.message || "Failed to activate plan")
    }
    return response
  }

  const refinePlan = async (businessId: string, body: PagePlannerRefinePlanRequest) => {
    const endpoint = `/page-planner/refine-plan?${businessIdQuery(businessId)}`
    return api.post<PagePlannerRefinePlanResponse>(endpoint, "python", withPlannerDefaults(body))
  }

  return { listPlans, getPlanById, generatePlan, setActivePlan, refinePlan }
}

