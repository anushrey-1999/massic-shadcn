export type PagePlannerPlanStatus = "proposed" | "active" | "archived" | string

export type PagePlannerPlanMeta = {
  id: number
  business_id: string
  plan_type: "pages" | "posts" | string
  status: PagePlannerPlanStatus
  proposed_at: string | null
  activated_at: string | null
  archived_at: string | null
  timeframe: number | null
  parent_plan_id: number | null
  valid: boolean
  created_at: string | null
  updated_at: string | null
}

export type PagePlannerPlansListResponse = {
  plans: PagePlannerPlanMeta[]
}

export type PagePlannerGeneratePlanRequest = {
  page_ideas_required: number
  calendar_events?: Array<{
    eventName?: string
    startDate?: string
    endDate?: string | null
    [key: string]: unknown
  }>
  regenerate?: boolean
}

export type PagePlannerPlanItem = {
  keyword: string
  slot?: number
  rationale?: string
  search_volume?: number
  business_relevance_score?: number
  business_relevance_level?: string
  intent_cluster_topic_coverage?: number
  search_intent?: string
  page_type?: string
  supporting_keywords?: string[]
  coverage?: number
  page_opportunity_score?: number
  page_id?: string
  status?: string
  slug?: string
  offerings?: string[]
  [key: string]: unknown
}

export type PagePlannerGeneratePlanResponse = {
  plan: PagePlannerPlanItem[]
}

export type PagePlannerPlanDetailResponse = {
  plan?: PagePlannerPlanItem[]
  items?: PagePlannerPlanItem[]
  output_data?: {
    items?: PagePlannerPlanItem[]
    plan?: PagePlannerPlanItem[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type PagePlannerSetActivePlanRequest = {
  plan_id: number
}

export type PagePlannerRefinePlanRequest = {
  plan_id: number
  selected_pages: string[]
  calendar_events?: Array<Record<string, unknown>>
  page_ideas_required: number
  user_prompt?: string
}

export type PagePlannerRefinePlanResponse = Record<string, unknown>

