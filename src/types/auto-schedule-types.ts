import type {
  PerformanceReportPerspective,
  PerformanceReportScope,
} from "./performance-report-options-types";

export interface CreateAutoScheduleRequest {
  businessId: string;
  frequency: "weekly" | "monthly";
  period?: string;
  requiresApproval?: boolean;
  scope?: PerformanceReportScope;
  perspective?: PerformanceReportPerspective;
  customInstructions?: string;
  recipients?: string[];
}

export interface UpdateAutoScheduleRequest {
  frequency?: "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  period?: string;
  requiresApproval?: boolean;
  scope?: PerformanceReportScope;
  perspective?: PerformanceReportPerspective;
  customInstructions?: string;
  isActive?: boolean;
  recipients?: string[];
}

export interface CreateAutoScheduleResponse {
  id: string;
  businessId: string;
  frequency: "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  period: string;
  requiresApproval: boolean;
  scope: PerformanceReportScope;
  perspective: PerformanceReportPerspective;
  customInstructions: string;
  isActive: boolean;
  nextRunAt: string;
  recipients: string[];
  createdAt: string;
}

export interface AutoSchedule {
  id: string;
  businessId: string;
  businessName?: string;
  frequency: "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  period: string;
  requiresApproval: boolean;
  scope: PerformanceReportScope;
  perspective: PerformanceReportPerspective;
  customInstructions: string;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  recipients: string[];
  createdAt: string;
  updatedAt?: string;
}
