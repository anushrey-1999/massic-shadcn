export interface CreateAutoScheduleRequest {
  businessId: string;
  frequency: "weekly" | "monthly";
  period?: string;
  requiresApproval?: boolean;
  watermarkReport?: boolean;
}

export interface UpdateAutoScheduleRequest {
  frequency?: "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  period?: string;
  requiresApproval?: boolean;
  watermarkReport?: boolean;
  isActive?: boolean;
}

export interface CreateAutoScheduleResponse {
  id: string;
  businessId: string;
  frequency: "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  period: string;
  requiresApproval: boolean;
  watermarkReport: boolean;
  isActive: boolean;
  nextRunAt: string;
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
  watermarkReport: boolean;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
  updatedAt?: string;
}

