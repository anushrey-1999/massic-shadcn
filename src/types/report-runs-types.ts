export type ReportRunStatus =
  | "pending"
  | "processing"
  | "success"
  | "error"
  | string

export type ReportRunDeliveryStatus = "ready_for_approval" | "sent" | null

export type ReportRunError = unknown

export interface ReportRunListItem {
  id: string
  status: ReportRunStatus
  date_generated: string | null
  time_generated: string | null
  period_start: string | null
  period_end: string | null
  period: string | null
  errors: ReportRunError | null
  created_at: string
  delivery_status?: ReportRunDeliveryStatus
  is_auto_scheduled?: boolean
  business_name?: string | null
}

export interface ListReportRunsResponse {
  items: ReportRunListItem[]
  page: number
  page_size: number
  total: number | null
}

export interface ReportRunDetail {
  id: string
  business_id: string
  period_start: string | null
  period_end: string | null
  period: string | null
  status: ReportRunStatus
  processed_data: any | null
  narrative_text: {
    errors?: Record<string, any>
    metadata?: Record<string, any>
    output_data?: {
      output_path?: string
      download_url?: string
    }
    performance_report?: string
  } | null
  html_url: string | null
  pdf_url: string | null
  llm_cost_usd: number | null
  processing_time_ms: number | null
  errors: ReportRunError | null
  created_at: string
  updated_at: string
}
