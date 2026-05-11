import type { ExtendedColumnFilter } from "./data-table-types";

export interface ContentSeriesApiItem {
  content_series_id: string;
  cluster_name?: string | null;
  title?: string | null;
  status?: string | null;
  signals?: string[] | null;
  tensions?: string[] | null;
  signal_score?: number | null;
  tension_score?: number | null;
  intent_score?: number | null;
  final_score?: number | null;
  search_volume?: number | null;
  br_score?: number | null;
  intent?: string | null;
  [key: string]: any;
}

export interface ContentSeriesRow {
  id: string;
  title: string;
  cluster_name: string;
  intent: string;
  final_score: number;
  search_volume: number;
  br_score: number;
  signal_score: number;
  tension_score: number;
  intent_score: number;
  signals: string[];
  tensions: string[];
  status?: string | null;
}

export interface ContentSeriesMetrics {
  total_cards: number;
  total_with_title?: number;
}

export interface ContentSeriesApiResponse {
  status: "success" | "error";
  metadata?: Record<string, any>;
  output_data: {
    items: ContentSeriesApiItem[];
    metrics?: ContentSeriesMetrics[];
    pagination: {
      page: number;
      page_size: number;
      fetched: number;
      total_pages?: number;
      total_count?: number;
      status?: "success" | "error";
    };
    errors?: unknown;
  };
}

export interface GetContentSeriesSchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: ExtendedColumnFilter<ContentSeriesRow>[];
  joinOperator: "and" | "or";
  search?: string;
}
