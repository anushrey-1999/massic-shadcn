// Social data types based on Backend API Specification

export interface SocialItem {
  channel_name?: string;
  campaign_name?: string;
  campaign_relevance?: number;
  tactics?: string[];
  id?: string;
  [key: string]: any;
}

// Row structure for table display
export interface SocialRow {
  id: string;
  channel_name: string;
  campaign_name: string;
  campaign_relevance: number;
  tactics: string[];
  [key: string]: any;
}

// API Response structure
export interface SocialApiResponse {
  status: "success" | "error";
  metadata?: {
    [key: string]: any;
  };
  output_data: {
    items: SocialItem[];
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

// Schema for social fetching parameters
export interface GetSocialSchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ id: string; desc: boolean }>;
  filters: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator: "and" | "or";
  search?: string;
  channel_name?: string;
}

// Counts for filter options
export interface SocialCounts {
  [key: string]: any;
}
