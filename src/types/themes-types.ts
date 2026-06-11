export interface ThemeTopic {
  topic_name: string;
  business_relevance_score?: number;
  topic_coverage?: number;
}

export interface ThemeItem {
  theme_name: string;
  origin_offering: string;
  topic_count: number;
  offerings: string[];
  topics: ThemeTopic[];
  [key: string]: any;
  business_relevance_score?: number;
  theme_coverage?: number;
}

export interface ThemeMetrics {
  total_themes: number;
}

export interface ThemesApiResponse {
  status: string;
  metadata: {
    workflow: string;
    run_id: number;
    updated_at: string;
  };
  output_data: {
    items: ThemeItem[];
    metrics: ThemeMetrics[];
  };
}

export interface ThemeRow {
  id: string;
  theme_name: string;
  origin_offering: string;
  topic_count: number;
  offerings: string[];
  topics: ThemeTopic[];
  [key: string]: any;
  business_relevance_score?: number;
  theme_coverage?: number;
  topic_coverage?: number;
}

export interface ThemeScatterPoint {
  topic_id: number;
  topic_name: string;
  x: number;
  y: number;
  business_relevance_score: number;
}

export interface ThemeScatterMeta {
  topics_run_id: number;
  topics_run_updated_at: string;
  cache_key: string;
  model_name: string;
  n_neighbors: number;
  min_dist: number;
  metric: string;
  random_state: number;
}

export interface ThemeScatterApiResponse {
  points: ThemeScatterPoint[];
  meta: ThemeScatterMeta;
}
