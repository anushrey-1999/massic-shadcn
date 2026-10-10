import type { JobResponse } from "@/types/profile-v2";

export function profileAgentDisabledReason(
  job: JobResponse | null | undefined,
  dirty: boolean,
  saving: boolean,
): string | null {
  if (saving) return "Wait for the current profile operation to finish.";
  if (dirty) return "Save Changes before opening the profile agent.";
  if (!job?.job_id) return "Create and save your business profile first.";
  if (job.profile_status === "processing")
    return "Your profile is still processing. Please wait.";
  return null;
}
