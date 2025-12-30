import type { ExtendedColumnFilter } from "./data-table-types";

export type TvRadioChannel = "TV" | "Radio";

export interface TvRadioKeywordInfo {
  head_term: string;
  search_volume_sum: number;
  search_intent: string | null;
  cpc_avg: number | null;
  competition_avg: number | null;
  business_relevance_avg: number | null;
  related_keywords: string[];
  role: "problem" | "solution" | "proof" | "action";
  confidence?: number | null;
}

export interface TvRadioAdConceptRow {
  id: string;
  subtopic: string;
  type: TvRadioChannel;
  status?: string;
  opp_score: number;
  volume: number;
  avg_cpc: number;
  comp: number;
  comp_level: string;
  relevance: number;

  problem_head_term?: string;
  solution_head_term?: string;
  proof_head_term?: string;
  action_head_term?: string;

  problem_keywords: string[];
  solution_keywords: string[];
  proof_keywords: string[];
  action_keywords: string[];

  totals: {
    total_search_volume: number;
    avg_business_relevance: number;
    avg_competition: number;
  };
}

export interface TvRadioAdsApiItem {
  ad_concept_id: string;
  channel: TvRadioChannel;
  status?: string;
  scores?: {
    tcas?: number | null;
    rcas?: number | null;
    avg_tv_affinity?: number | null;
    avg_radio_affinity?: number | null;
    cohesion?: number | null;
  };
  roles?: {
    problem_keyword_info?: TvRadioKeywordInfo | null;
    solution_keyword_info?: TvRadioKeywordInfo | null;
    proof_keyword_info?: TvRadioKeywordInfo | null;
    action_keyword_info?: TvRadioKeywordInfo | null;
  };
  supporting_data?: {
    by_role_keywords?: {
      problem?: string[] | null;
      solution?: string[] | null;
      proof?: string[] | null;
      action?: string[] | null;
    };
    totals?: {
      total_search_volume?: number | null;
      avg_business_relevance?: number | null;
      avg_competition?: number | null;
    };
    metadata?: {
      score_level?: string | null;
      [key: string]: any;
    };
  };
  display_name?: string;
  [key: string]: any;
}

export interface TvRadioAdsApiResponse {
  status: "success" | "error";
  metadata?: Record<string, any>;
  output_data: {
    items: TvRadioAdsApiItem[];
    pagination: {
      page: number;
      page_size: number;
      fetched: number;
      total_pages?: number;
      total_count?: number;
      status?: "success" | "error";
    };
    download_url?: string;
  };
}

export interface GetTvRadioAdsSchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: ExtendedColumnFilter<TvRadioAdConceptRow>[];
  joinOperator: "and" | "or";
  search?: string;
}
