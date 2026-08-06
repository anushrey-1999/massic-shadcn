import type { JobDetails } from "@/hooks/use-jobs";

export type WorkflowStatusValue =
  | "pending"
  | "processing"
  | "success"
  | "error"
  | string
  | null
  | undefined;

export function getWorkflowStatus(
  jobDetails: JobDetails | null | undefined,
  workflowKey: string
): WorkflowStatusValue {
  const workflowStatus = jobDetails?.workflow_status as
    | { workflows?: Record<string, WorkflowStatusValue>; status?: string }
    | undefined;

  if (!workflowStatus) return undefined;

  const workflows = workflowStatus.workflows;
  if (workflows && typeof workflows === "object") {
    return workflows[workflowKey];
  }

  const directValue = (workflowStatus as Record<string, WorkflowStatusValue>)[workflowKey];
  if (directValue !== undefined) return directValue;

  if (workflowStatus.status === "success") return "success";

  return undefined;
}

export function getOverallWorkflowStatus(
  jobDetails: JobDetails | null | undefined
): WorkflowStatusValue {
  const workflowStatus = jobDetails?.workflow_status as
    | { workflows?: Record<string, WorkflowStatusValue>; status?: WorkflowStatusValue }
    | undefined;

  if (!workflowStatus) return undefined;

  const status = workflowStatus.status;
  if (status === "pending" || status === "processing" || status === "success" || status === "error") {
    return status;
  }

  const workflowValues = Object.values(workflowStatus.workflows || {});
  if (workflowValues.some((value) => value === "error")) return "error";
  if (workflowValues.some((value) => value === "processing")) return "processing";
  if (workflowValues.some((value) => value === "pending")) return "pending";
  if (workflowValues.length > 0 && workflowValues.every((value) => value === "success")) {
    return "success";
  }

  return status;
}

export function isWorkflowActive(jobDetails: JobDetails | null | undefined): boolean {
  const status = getOverallWorkflowStatus(jobDetails);
  return status === "pending" || status === "processing";
}

export function isWorkflowSuccess(
  jobDetails: JobDetails | null | undefined,
  workflowKey: string
): boolean {
  return getWorkflowStatus(jobDetails, workflowKey) === "success";
}
