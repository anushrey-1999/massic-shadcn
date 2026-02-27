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

export function usePagePlanner() {
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
    return api.post<PagePlannerGeneratePlanResponse>(endpoint, "python", body)
  }

  const setActivePlan = async (businessId: string, planId: number) => {
    const endpoint = `/page-planner/set-active-plan?${businessIdQuery(businessId)}`
    const body: PagePlannerSetActivePlanRequest = { plan_id: planId }
    return api.post(endpoint, "python", body)
  }

  const refinePlan = async (businessId: string, body: PagePlannerRefinePlanRequest) => {
    const endpoint = `/page-planner/refine-plan?${businessIdQuery(businessId)}`
    return api.post<PagePlannerRefinePlanResponse>(endpoint, "python", body)
  }

  return { listPlans, getPlanById, generatePlan, setActivePlan, refinePlan }
}

