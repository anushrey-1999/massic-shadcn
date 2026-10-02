"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { isWorkflowActive } from "@/lib/workflow-status";
import type { JobResponse } from "@/types/profile-v2";
import { isJobIncomplete } from "@/utils/profile-v2-mappers";
import {
  pollProfileUntilTerminal,
  runDeepProfile,
} from "@/utils/profile-v2-api";

export function profileAutofillDisabledReason(
  job: JobResponse | null | undefined,
  state: {
    dirty?: boolean;
    loading?: boolean;
    saving?: boolean;
    agentBusy?: boolean;
  } = {},
): string | null {
  if (state.loading || state.saving)
    return "Wait for the current profile operation to finish.";
  if (state.agentBusy)
    return "Wait for the profile agent and its refresh to finish.";
  if (state.dirty) return "Save Changes before running Autofill.";
  if (!job?.job_id)
    return "Create and save the business profile before running Autofill.";
  if (job.profile_status === "processing")
    return "Your profile is still processing. Please wait.";
  if (isWorkflowActive(job))
    return "A workflow is running. Wait for it to finish before running Autofill.";
  if (isJobIncomplete(job))
    return "Save the required business name, offerings, country, location, and service-area type first.";
  return null;
}

export type ProfileAutofillPhase =
  "idle" | "starting" | "processing" | "refreshing";
type AutofillState = {
  phase: ProfileAutofillPhase;
  error: string | null;
  needsRefresh: boolean;
};
const initialState: AutofillState = {
  phase: "idle",
  error: null,
  needsRefresh: false,
};

export function useProfileAutofill(businessId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(initialState);
  const operation = useRef<AbortController | null>(null);
  const refreshNeeded = useRef(false);
  const currentBusiness = useRef(businessId);
  currentBusiness.current = businessId;

  useEffect(() => {
    setState(initialState);
    refreshNeeded.current = false;
    return () => {
      if (!operation.current) return;
      operation.current.abort();
      operation.current = null;
      // The server may have accepted the POST before the client left this page.
      void queryClient.invalidateQueries({
        queryKey: ["jobs", "detail", businessId],
        refetchType: "none",
      });
    };
  }, [businessId, queryClient]);

  const execute = useCallback(
    async (job?: JobResponse | null): Promise<JobResponse | null> => {
      if (operation.current || (job && refreshNeeded.current)) return null;
      if (
        job &&
        (job.business_id !== businessId || profileAutofillDisabledReason(job))
      )
        return null;
      const controller = new AbortController();
      operation.current = controller;
      const active = () =>
        currentBusiness.current === businessId &&
        operation.current === controller &&
        !controller.signal.aborted;
      let accepted = !job;
      setState({
        phase: job ? "starting" : "refreshing",
        error: null,
        needsRefresh: false,
      });
      try {
        let profileFailed = false;
        if (job) {
          const profile = await runDeepProfile(
            businessId,
            controller.signal,
            (profileId) => {
              if (!active()) return;
              accepted = true;
              queryClient.setQueryData<JobResponse | null>(
                ["jobs", "detail", businessId],
                (current) => ({
                  ...(current ?? job),
                  profile_id: profileId,
                  profile_status: "processing",
                }),
              );
              setState({
                phase: "processing",
                error: null,
                needsRefresh: false,
              });
            },
          );
          if (!active()) return null;
          profileFailed = profile.status === "error";
        }
        if (!active()) return null;
        setState({ phase: "refreshing", error: null, needsRefresh: false });
        const fetchJob = async () => {
          const canonical = await api.get<JobResponse>(
            `/jobs/${encodeURIComponent(businessId)}`,
            "python",
            { signal: controller.signal },
          );
          if (!canonical.job_id || canonical.business_id !== businessId)
            throw new Error(
              "The profile refresh returned a different business.",
            );
          return canonical;
        };
        let canonicalJob = await fetchJob();
        if (
          canonicalJob.profile_status === "processing" &&
          canonicalJob.profile_id
        ) {
          await pollProfileUntilTerminal(canonicalJob.profile_id, "deep", {
            signal: controller.signal,
          });
          canonicalJob = await fetchJob();
        }
        if (!active()) return null;
        queryClient.setQueryData(["jobs", "detail", businessId], canonicalJob);
        if (canonicalJob.profile_status === "processing")
          throw new Error(
            "Your profile is still processing. Details will refresh automatically.",
          );
        refreshNeeded.current = false;
        setState({
          phase: "idle",
          needsRefresh: false,
          error:
            profileFailed || canonicalJob.profile_status === "error"
              ? "Autofill could not complete. Review your profile and try Autofill again."
              : null,
        });
        return canonicalJob;
      } catch (error) {
        if (!active()) return null;
        refreshNeeded.current = accepted;
        setState({
          phase: "idle",
          needsRefresh: accepted,
          error: accepted
            ? "Couldn’t refresh the Autofill result. Retrying automatically."
            : "Couldn’t start Autofill. Please try again.",
        });
        return null;
      } finally {
        if (operation.current === controller) operation.current = null;
      }
    },
    [businessId, queryClient],
  );

  useEffect(() => {
    if (!state.needsRefresh || state.phase !== "idle") return;
    const retry = setTimeout(() => void execute(), 5_000);
    return () => clearTimeout(retry);
  }, [execute, state.needsRefresh, state.phase]);

  return {
    ...state,
    busy: state.phase !== "idle" || state.needsRefresh,
    run: (job: JobResponse) => execute(job),
    refresh: () => execute(),
  };
}
