export interface ThemeTopic {
  topic_name: string;
}

export interface ThemeItem {
  theme_name: string;
  origin_offering: string;
  topic_count: number;
  offerings: string[];
  topics: ThemeTopic[];
  [key: string]: any;
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
}
