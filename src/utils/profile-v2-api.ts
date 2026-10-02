import { api } from "@/hooks/use-api";
import type {
  ProfileResponse,
  ProfileStatus,
  TriggerDeepProfileRequest,
  TriggerProfileRequest,
  TriggerProfileResponse,
  TriggerQuickProfileRequest,
} from "@/types/profile-v2";

export const PROFILE_POLL_INTERVAL_MS = 5_000;
export const PROFILE_POLL_TIMEOUT_MS = 10 * 60_000;
export const PROFILE_POLL_TRANSIENT_RETRIES = 3;

export type ProfilePipelinePhase = "quick" | "job" | "deep" | "update";

export class ProfilePipelineError extends Error {
  readonly phase: ProfilePipelinePhase;
  readonly profileId?: string;
  readonly status?: ProfileStatus;

  constructor(
    message: string,
    options: {
      phase: ProfilePipelinePhase;
      profileId?: string;
      status?: ProfileStatus;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ProfilePipelineError";
    this.phase = options.phase;
    this.profileId = options.profileId;
    this.status = options.status;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Profile polling was cancelled.", "AbortError"));
      return;
    }

    const timeoutId = globalThis.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(timeoutId);
        reject(
          new DOMException("Profile polling was cancelled.", "AbortError"),
        );
      },
      { once: true },
    );
  });
}

function isTransientPollError(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    response?: { status?: number };
  };
  const status = candidate?.response?.status;
  return (
    !status ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500 ||
    candidate?.code === "ECONNABORTED" ||
    candidate?.code === "ERR_NETWORK"
  );
}

async function getProfileWithTransientRetry(
  profileId: string,
  phase: ProfilePipelinePhase,
  signal?: AbortSignal,
): Promise<ProfileResponse> {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= PROFILE_POLL_TRANSIENT_RETRIES;
    attempt += 1
  ) {
    try {
      return await api.get<ProfileResponse>(
        `/jobs/profile/${encodeURIComponent(profileId)}`,
        "python",
        { signal },
      );
    } catch (error) {
      lastError = error;
      if (
        attempt === PROFILE_POLL_TRANSIENT_RETRIES ||
        !isTransientPollError(error)
      ) {
        throw new ProfilePipelineError("Unable to check profile status.", {
          phase,
          profileId,
          cause: error,
        });
      }
      await sleep(PROFILE_POLL_INTERVAL_MS, signal);
    }
  }

  throw new ProfilePipelineError("Unable to check profile status.", {
    phase,
    profileId,
    cause: lastError,
  });
}

export async function pollProfileUntilTerminal(
  profileId: string,
  phase: ProfilePipelinePhase,
  options: {
    signal?: AbortSignal;
    intervalMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<ProfileResponse> {
  const {
    signal,
    intervalMs = PROFILE_POLL_INTERVAL_MS,
    timeoutMs = PROFILE_POLL_TIMEOUT_MS,
  } = options;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const profile = await getProfileWithTransientRetry(
      profileId,
      phase,
      signal,
    );
    if (profile.status !== "processing") {
      return profile;
    }
    await sleep(intervalMs, signal);
  }

  throw new ProfilePipelineError(
    "Profile processing is taking longer than expected. You can safely try again.",
    { phase, profileId },
  );
}

export async function triggerProfile(
  request: TriggerProfileRequest,
  phase: ProfilePipelinePhase,
  signal?: AbortSignal,
  onCreated?: (profileId: string) => void,
): Promise<ProfileResponse> {
  let response: TriggerProfileResponse;
  try {
    response = await api.post<TriggerProfileResponse>(
      "/jobs/profile",
      "python",
      request,
      { signal },
    );
  } catch (error) {
    throw new ProfilePipelineError(
      phase === "deep"
        ? "Unable to start Autofill."
        : `Unable to start ${phase} profiling.`,
      {
        phase,
        cause: error,
      },
    );
  }

  if (!response.profile_id) {
    throw new ProfilePipelineError(
      "Profile creation did not return a profile id.",
      { phase },
    );
  }

  onCreated?.(response.profile_id);
  return pollProfileUntilTerminal(response.profile_id, phase, { signal });
}

export function runQuickProfile(
  request: Omit<TriggerQuickProfileRequest, "mode">,
  signal?: AbortSignal,
): Promise<ProfileResponse> {
  return triggerProfile({ mode: "quick", ...request }, "quick", signal);
}

export function runDeepProfile(
  businessId: string,
  signal?: AbortSignal,
  onCreated?: (profileId: string) => void,
): Promise<ProfileResponse> {
  const request: TriggerDeepProfileRequest = {
    mode: "deep",
    business_id: businessId,
  };
  return triggerProfile(request, "deep", signal, onCreated);
}
