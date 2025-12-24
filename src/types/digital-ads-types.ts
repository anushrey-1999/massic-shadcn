export interface DigitalAdsKeyword {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  competition_level: string;
  search_intent: string;
  serp_item_types: string[];
  business_relevance: number;
  cpc_log: number;
  volume_log: number;
  cpc_norm: number;
  volume_norm: number;
  ideal_cpc_flag: number;
  ideal_volume_flag: number;
  cpc_factor: number;
  volume_weight: number;
  intent_weight: number;
  market_ease: number;
  opportunity_score: number;
  offerings: string[];
}

export interface DigitalAdsRow {
  id: string;
  cluster: string;
  intent_cluster_opportunity_score: number;
  total_search_volume: number;
  avg_cpc: number;
  comp_sum: number;
  business_relevance_score: number;
  keywords: DigitalAdsKeyword[];
  offerings?: string[];
}

export interface DigitalAdsApiResponse {
  status: "success" | "error";
  metadata?: Record<string, any>;
  output_data: {
    items: Array<{
      cluster: string;
      intent_cluster_opportunity_score: number;
      total_search_volume: number;
      avg_cpc: number;
      comp_sum: number;
      business_relevance_score: number;
      keywords: DigitalAdsKeyword[];
      [key: string]: any;
    }>;
    pagination: {
      page: number;
      page_size: number;
      fetched: number;
      total_count?: number;
      total_pages?: number;
      status: "success" | "error";
    };
  };
}

export interface GetDigitalAdsSchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator: "and" | "or";
  search?: string;
}
