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

  // Check granular per-workflow status first (nested under .workflows)
  const workflows = workflowStatus.workflows;
  if (workflows && typeof workflows === "object" && workflowKey in workflows) {
    return workflows[workflowKey];
  }

  // Check flat key directly on workflow_status
  const directValue = (workflowStatus as Record<string, WorkflowStatusValue>)[workflowKey];
  if (directValue !== undefined) return directValue;

  // When the overall workflow is "success", every individual workflow is implicitly done
  if (workflowStatus.status === "success") return "success";

  return undefined;
}

export function isWorkflowSuccess(
  jobDetails: JobDetails | null | undefined,
  workflowKey: string
): boolean {
  return getWorkflowStatus(jobDetails, workflowKey) === "success";
}
