export interface WebsiteArchitecturePage {
  page_id: string;
  name: string;
  title: string;
  page_type: string;
  page_subtype: string | null;
  category: string | null;
  disposition: string;
  parent_page_id: string | null;
  current_url: string | null;
  final_url: string | null;
  keyword: string | null;
  supporting_keywords: string[] | null;
  search_volume: number | null;
  business_relevance_score: number | null;
  business_applicability: string | null;
  confidence: string | null;
  sources: string[] | null;
  alternate_framing: string | null;
  sections: unknown[] | null;
  modifiers: {
    offerings: string[];
    customer_type: string | null;
    location: string | null;
    service_area: string | null;
  } | null;
}

export interface WebsiteArchitectureResponse {
  status: string;
  metadata?: {
    workflow?: string;
    run_id?: number;
    updated_at?: string;
  };
  output_data?: {
    items?: WebsiteArchitecturePage[];
    metrics?: Array<{ total_pages: number }>;
    pagination?: {
      page: number;
      page_size: number;
      fetched: number;
      total_pages?: number;
      total_count?: number;
    };
    errors?: unknown;
  } | null;
}

export interface GetWebsiteArchitectureParams {
  businessId: string;
  page: number;
  perPage: number;
  search: string;
  sort: Array<{ field: string; desc: boolean }>;
  filters: Array<{ field: string; value: string | string[]; operator: string }>;
  joinOperator: "and" | "or";
}

export interface WebsiteArchitectureResult {
  status: string;
  data: WebsiteArchitecturePage[];
  pageCount: number;
  totalCount: number | undefined;
}
