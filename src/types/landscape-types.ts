export interface LandscapeItem {
  domain: string;
  frequency: number;
}

export interface LandscapeApiResponse {
  status: "success" | "error";
  metadata?: {
    language_code?: string;
    threshold_setting?: string;
    workflow_id?: string;
  };
  output_data: {
    items?: any[];
    landscapes?: LandscapeItem[];
  };
}

export interface LandscapeRow {
  id: string;
  url: string;
  frequency: number;
}
