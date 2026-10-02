import type { JobResponse } from "@/types/profile-v2";
import { isJobIncomplete } from "@/utils/profile-v2-mappers";

export function profileAgentDisabledReason(
  job: JobResponse | null | undefined,
  dirty: boolean,
  saving: boolean,
): string | null {
  if (saving) return "Wait for the current profile operation to finish.";
  if (dirty) return "Save Changes before opening the profile agent.";
  if (!job?.job_id) return "Create and save your business profile first.";
  if (isJobIncomplete(job))
    return "Save the required business name, offerings, country, location, and service-area type first.";
  if (!job.profile_id || !job.profile_status)
    return "A saved head profile is required.";
  if (job.profile_status === "processing")
    return "Your profile is still processing. Please wait.";
  return null;
}
