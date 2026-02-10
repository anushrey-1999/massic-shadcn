import type { JobDetails } from "@/hooks/use-jobs";

export type WorkflowStatusValue =
  | "pending"
  | "processing"
  | "success"
  | "error"
  | string
  | undefined;

export function getWorkflowStatus(
  jobDetails: JobDetails | null | undefined,
  workflowKey: string
): WorkflowStatusValue {
  const workflowStatus = jobDetails?.workflow_status as
    | { workflows?: Record<string, WorkflowStatusValue> }
    | undefined;

  if (!workflowStatus) return undefined;

  const workflows = workflowStatus.workflows;
  if (workflows && typeof workflows === "object" && workflowKey in workflows) {
    return workflows[workflowKey];
  }

  return (workflowStatus as Record<string, WorkflowStatusValue>)[workflowKey];
}

export function isWorkflowSuccess(
  jobDetails: JobDetails | null | undefined,
  workflowKey: string
): boolean {
  return getWorkflowStatus(jobDetails, workflowKey) === "success";
}
