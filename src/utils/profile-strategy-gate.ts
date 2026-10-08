import type { JobResponse } from "@/types/profile-v2";
import { isOrchestrationActive } from "@/lib/workflow-status";
import { isJobIncomplete } from "@/utils/profile-v2-mappers";

export type ProfileStrategyBlockReason =
  | "missing_job"
  | "processing"
  | "profile_error"
  | "incomplete_job";

export interface ProfileStrategyGate {
  blocked: boolean;
  reason: ProfileStrategyBlockReason | null;
  title: string;
  description: string;
}

export function getProfileStrategyGate(
  job: JobResponse | null | undefined
): ProfileStrategyGate {
  if (!job?.job_id) {
    return {
      blocked: true,
      reason: "missing_job",
      title: "Complete your business profile",
      description:
        "Set up the business profile before starting or viewing Strategy.",
    };
  }

  if (isOrchestrationActive(job)) {
    return {
      blocked: true,
      reason: "processing",
      title: "Strategy in progress",
      description:
        "Your growth strategy is already being built. Wait for it to finish before running it again.",
    };
  }

  if (job.profile_status === "processing") {
    return {
      blocked: true,
      reason: "processing",
      title: "Profile processing",
      description:
        "Your profile is still being processed. Strategy will be available when it finishes.",
    };
  }

  if (job.profile_status === "error") {
    return {
      blocked: true,
      reason: "profile_error",
      title: "Profile needs attention",
      description:
        "Profile processing did not complete. Open Profile to review the details and retry.",
    };
  }

  if (isJobIncomplete(job)) {
    return {
      blocked: true,
      reason: "incomplete_job",
      title: "Complete required profile details",
      description:
        "Add the business name, website, primary location, service-area type, and offering before using Strategy.",
    };
  }

  return {
    blocked: false,
    reason: null,
    title: "",
    description: "",
  };
}

export function assertProfileStrategyReady(job: JobResponse): void {
  const gate = getProfileStrategyGate(job);
  if (gate.blocked) {
    throw new Error(gate.description);
  }
}
