export interface WebOptimizationSuggestion {
  category: string;
  action: string;
}

export interface WebOptimizationGscMetrics {
  impressions?: number | null;
  clicks?: number | null;
  avgpos?: number | null;
  ctr?: number | null;
}

export interface WebOptimizationGa4Metrics {
  sessions?: number | null;
  conversions?: number | null;
}

export interface WebOptimizationAnalysisItem {
  page_url?: string;
  opportunity?: string;
  suggested_changes?: WebOptimizationSuggestion[];
  gsc?: WebOptimizationGscMetrics;
  ga4?: WebOptimizationGa4Metrics;
  final_ops?: number | null;
}

export interface WebOptimizationAnalysisRow {
  id: string;
  page_url: string;
  opportunity: string;
  suggestions_count: number;
  impressions: number;
  clicks: number;
  avg_position: number;
  ctr: number;
  sessions: number;
  goals: number;
  ops: number;
  suggested_changes: WebOptimizationSuggestion[];
}

export interface WebOptimizationAnalysisApiResponse {
  pages?: WebOptimizationAnalysisItem[];
  data?: {
    pages?: WebOptimizationAnalysisItem[];
    [key: string]: unknown;
  };
  result?: {
    pages?: WebOptimizationAnalysisItem[];
    [key: string]: unknown;
  } | WebOptimizationAnalysisItem[];
  [key: string]: unknown;
}

export interface GetWebOptimizationAnalysisSchema {
  business_id: string;
  page: number;
  perPage: number;
  search?: string;
  sort?: Array<{ id: keyof WebOptimizationAnalysisRow; desc: boolean }>;
  filters?: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator?: "and" | "or";
}
