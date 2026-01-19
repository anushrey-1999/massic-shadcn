export interface AudienceRow {
  id: string;
  persona_name: string;
  ars: number;
  use_case_name: string[];
  use_cases?: UseCase[];
  offerings?: string[];
  [key: string]: any;
}

export interface UseCase {
  use_case_name: string;
  supporting_keywords: string[];
}

export interface AudienceUseCaseRow {
  id: string;
  use_case_name: string;
  persona_name: string;
  supporting_keywords: string[];
}

export interface AudienceApiResponse {
  status: "success" | "error";
  metadata?: {
    language_code?: string;
    workflow_id?: string;
  };
  output_data: {
    items: AudienceRow[];
    metrics?: AudienceMetrics[];
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

export interface AudienceMetrics {
  total_personas: number;
  total_use_cases: number;
  total_supporting_keywords: number;
}

export interface GetAudienceSchema {
  business_id: string;
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: Array<{
    field: string;
    value: string | number | string[];
    operator: string;
  }>;
  joinOperator: "and" | "or";
  offerings?: string;
  search?: string;
}

export interface AudienceCounts {
  personaCounts: Record<string, number>;
  arsRange: { min: number; max: number };
  useCaseCounts: Record<string, number>;
}
