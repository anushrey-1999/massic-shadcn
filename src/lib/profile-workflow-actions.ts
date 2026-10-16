import type { JobResponse } from "@/types/profile-v2";
import {
  getRecordedWorkflowStatuses,
  isWorkflowActive,
} from "@/lib/workflow-status";

export type ProfileAnalysisAction = "analyze" | "search" | "context";

type ActionAvailability = {
  visible: boolean;
  disabled: boolean;
  disabledReason: string | undefined;
};

export function getProfileWorkflowActions(
  job: JobResponse | null | undefined,
  { locked = false, readError }: { locked?: boolean; readError?: unknown } = {},
): Record<ProfileAnalysisAction, ActionAvailability> {
  const historyKnown = job !== undefined && !readError;
  const hasRunBefore =
    job?.orchestration_status != null ||
    getRecordedWorkflowStatuses(job).some(status => status != null);
  const active = isWorkflowActive(job) || job?.profile_status === "processing";

  const commonReason = readError
    ? "Refresh the business profile before starting another operation."
    : !historyKnown
      ? "Wait for the business profile to load."
      : active
        ? "Business analysis is pending or processing. Please wait until it finishes."
        : locked
          ? "Wait for the current business operation to finish."
          : !job?.job_id
            ? "Save the business profile before starting analysis."
            : undefined;

  const availability = (
    visible: boolean,
    prerequisiteReason?: string,
  ): ActionAvailability => {
    const disabledReason = commonReason ?? prerequisiteReason;
    return {
      visible,
      disabled: !visible || Boolean(disabledReason),
      disabledReason,
    };
  };

  return {
    analyze: availability(
      historyKnown && !hasRunBefore,
      hasRunBefore
        ? "Use Rerun search data to run business analysis again."
        : undefined,
    ),
    search: availability(
      true,
      !hasRunBefore
        ? "Analyze the business before rerunning search data."
        : undefined,
    ),
    context: availability(
      true,
      job?.has_build_completed !== true
        ? "Complete a profile build before updating business context."
        : undefined,
    ),
  };
}
