import type { ExtendedColumnFilter } from "./data-table-types";

// Strategy data types based on Backend API Specification

export interface StrategyTopic {
  topic: string;
  business_relevance_score: number;
  topic_cluster_topic_coverage: number;
  total_cluster_search_volume?: number;
  total_search_volume?: number;
  offerings: string[];
  clusters: StrategyCluster[];
}

export interface StrategyCluster {
  cluster: string;
  keywords: string[];
  total_search_volume: number;
  intent_cluster_topic_coverage: number;
}

// Row structure for table display
// One row per topic with all clusters and keywords
export interface StrategyRow {
  id: string; // unique identifier: topic name
  topic: string;
  business_relevance_score: number;
  topic_cluster_topic_coverage: number;
  offerings: string[];
  clusters: StrategyCluster[]; // All clusters for this topic
  cluster_names: string; // Comma-separated cluster names
  sub_topics_count: number; // Count of clusters (sub topics)
  total_keywords: number; // Total count of all keywords
  total_cluster_search_volume: number; // Sum of all cluster search volumes
}

// API Response structure
export interface StrategyApiResponse {
  status: "success" | "error";
  metadata?: {
    language_code?: string;
    threshold_percentage?: number;
    threshold_setting?: string;
    workflow_id?: string;
  };
  output_data: {
    items: StrategyTopic[];
    pagination: {
      page: number;
      page_size: number;
      fetched: number;
      total_count?: number;
      total_pages?: number; // Total number of pages
      status: "success" | "error";
    };
  };
}

// Schema for strategy fetching parameters
export interface GetStrategySchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: ExtendedColumnFilter<StrategyTopic>[];
  joinOperator: "and" | "or";
  offerings?: string; // Backend supports offerings as string filter
  search?: string;
}

// Counts for filter options
export interface StrategyCounts {
  offeringCounts: Record<string, number>;
  businessRelevanceRange: { min: number; max: number };
  topicCoverageRange: { min: number; max: number };
  searchVolumeRange: { min: number; max: number };
}

export interface StrategyMetrics {
  total_topics: number;
  total_clusters: number;
  total_keywords: number;
}
