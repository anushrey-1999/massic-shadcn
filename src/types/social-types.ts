// Social data types based on Backend API Specification

export interface SocialItem {
  channel_name?: string;
  campaign_name?: string;
  campaign_relevance?: number;
  tactics?: string[];
  total_clusters?: number;
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
  total_clusters: number;
  offerings?: string[];
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
  channel_name?: string;
  offerings?: string;
}

// Counts for filter options
export interface SocialCounts {
  [key: string]: any;
}

// Tactic detail item from API
export interface TacticItem {
  tactic?: string;
  cluster_name?: string;
  title?: string;
  description?: string;
  campaign_relevance?: number;
  related_keywords?: string[];
  status?: string;
  url?: string;
  id?: string;
  [key: string]: any;
}

// Tactic row structure for table display
export interface TacticRow {
  id: string;
  tactic: string;
  cluster_name?: string;
  title: string;
  description: string;
  campaign_relevance: number;
  related_keywords: string[];
  status: string;
  url?: string;
  [key: string]: any;
}

// API Response structure for tactics
export interface TacticApiResponse {
  status: "success" | "error";
  metadata?: {
    [key: string]: any;
  };
  output_data: {
    items: TacticItem[];
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

// Schema for tactics fetching parameters
export interface GetTacticsSchema {
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
  channel_name?: string;
  offerings?: string;
  campaign_name?: string;
}
