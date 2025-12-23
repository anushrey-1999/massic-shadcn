// Web Page (Blog Page Plan) data types based on Backend API Specification

export interface WebPageItem {
  keyword: string;
  page_type: string;
  search_volume: number;
  business_relevance_score: number;
  page_opportunity_score: number;
  status: string;
  supporting_keywords: string[];
  page_id?: string;
  offerings?: string[];
  business_relevance_level?: string;
  search_intent?: string;
  slug?: string;
  [key: string]: any;
}

// Row structure for table display
export interface WebPageRow {
  id: string;
  keyword: string;
  page_type: string;
  search_volume: number;
  business_relevance_score: number;
  page_opportunity_score: number;
  sub_topics_count: number;
  coverage?: number;
  status: string;
  supporting_keywords: string[];
  page_id?: string;
  offerings?: string[];
  business_relevance_level?: string;
  search_intent?: string;
  slug?: string;
  [key: string]: any;
}

// API Response structure
export interface WebPageApiResponse {
  status: "success" | "error";
  metadata?: {
    language_code?: string;
    threshold_percentage?: number;
    threshold_setting?: string;
    workflow_id?: string;
    step_id?: string;
    [key: string]: any;
  };
  output_data: {
    items: WebPageItem[];
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

// Schema for web page fetching parameters
export interface GetWebPageSchema {
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

// Counts for filter options
export interface WebPageCounts {
  [key: string]: any; // Will be defined based on actual filter needs
}
