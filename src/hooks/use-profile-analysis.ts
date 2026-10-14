"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./use-api";
import type { JobResponse } from "@/types/profile-v2";

export type ProfileAnalysisAction = "analyze" | "search" | "context";

export function useProfileAnalysis(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (action: ProfileAnalysisAction) => {
      if (action === "context") {
        return api.post<{ profile_id: string }>(
          `/jobs/profile/build?business_id=${encodeURIComponent(businessId)}`,
          "python",
        );
      }
      await api.post("/jobs/run", "python", { business_id: businessId });
      return null;
    },
    onSuccess: (result, action) => {
      // Hold the editing lock until GET job confirms the server's new state.
      queryClient.setQueryData<JobResponse>(
        ["jobs", "detail", businessId],
        (job) =>
          job && {
            ...job,
            ...(action === "context"
              ? {
                  profile_status: "processing",
                  profile_id: result?.profile_id ?? job.profile_id,
                }
              : { orchestration_status: "build_running" }),
          },
      );
      void queryClient.invalidateQueries({
        queryKey: ["jobs", "detail", businessId],
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: ["jobs", "detail", businessId],
      });
    },
  });
}
