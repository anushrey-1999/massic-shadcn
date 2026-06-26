export type TopicSignalLabel =
  | "Emerging"
  | "Rising"
  | "Seasonal"
  | "Seasonal+Rising"
  | "Breakout"
  | "Steady";

export type TopicSignalStatus =
  | "not_found"
  | "pending"
  | "processing"
  | "success"
  | "error";

export interface TopicSignalGrowth {
  annualized_pct?: number;
  recent_pct?: number;
  abs_delta?: number;
}

export interface TopicSignalRow {
  id: number;
  topic_id?: number | null;
  term: string;
  label: TopicSignalLabel;
  trend_score: number;
  confidence: number;
  trend_geography: "local" | "regional" | "national";
  local_volume?: number | null;
  growth?: TopicSignalGrowth | null;
  momentum?: number | null;
  consistency: number;
  is_seasonal?: boolean | null;
  seasonal_peak_months?: string[] | null;
  seasonal_strength?: number | null;
  ramp_state?: "pre" | "ramping" | "peak" | "post" | null;
  months_to_peak?: number | null;
  history?: Array<{ month: string; value: number }>;
  display_rank: number;
}

export interface TopicSignalsApiResponse {
  status: TopicSignalStatus;
  isNotFound?: boolean;
  missingPrerequisite?: boolean;
  notFoundDetail?: string;
  metadata: {
    run_id?: number;
    workflow?: string;
    updated_at?: string;
    evaluation_month?: string;
    topics_run_id?: number;
    [key: string]: unknown;
  };
  output_data?: {
    items: TopicSignalRow[];
    metrics?: Array<{
      total_signals?: number;
      labels?: Record<string, number>;
      [key: string]: unknown;
    }>;
    pagination?: {
      page: number;
      page_size: number;
      fetched?: number;
      total_pages?: number;
    };
    errors?: string[] | null;
  } | null;
}
