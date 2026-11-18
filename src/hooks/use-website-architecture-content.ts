"use client";

import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useApi } from "@/hooks/use-api";
import { websiteArchitectureApiBase } from "@/hooks/use-website-architecture";
import type {
  ArchitectureContentArtifact,
  ArchitectureContentPostResponse,
} from "@/types/website-architecture-content-types";

export const ARCHITECTURE_INSTRUCTIONS_LIMIT = 2000;
const POLL_INTERVAL_MS = 2000;

export function architectureContentKey(businessId: string, pageId: string) {
  return ["website-architecture-content", businessId, pageId] as const;
}

function endpoint(businessId: string, pageId: string) {
  const params = new URLSearchParams({ business_id: businessId, page_id: pageId });
  return `/content/website-architecture?${params}`;
}

function validateArtifact(artifact: ArchitectureContentArtifact, pageId: string) {
  if (artifact?.page_id !== pageId || !["processing", "success", "error"].includes(artifact.request_status)) {
    throw new Error("Infer returned an invalid page result.");
  }
  return artifact;
}

export function architectureRequestError(error: unknown, fallback: string) {
  if (!isAxiosError(error) || error.response?.status !== 400 && error.response?.status !== 404) {
    return fallback;
  }
  const detail: unknown = error.response.data?.detail;
  if (detail === "architecture_missing") return "This business needs a website architecture before you can generate a page.";
  if (detail === "A published profile is required.") return "Publish the business profile before generating a page.";
  if (detail === "Page is not in the latest architecture run.") return "This page is no longer in the latest website architecture.";
  return fallback;
}

export function useWebsiteArchitectureContent(businessId: string) {
  const { execute } = useApi<unknown>({ platform: "python" });
  const queryClient = useQueryClient();

  const artifactOptions = (pageId: string, expectArtifact = false) => {
    const queryKey = architectureContentKey(businessId, pageId);
    return queryOptions({
      queryKey,
      queryFn: async ({ signal }): Promise<ArchitectureContentArtifact | null> => {
        try {
          const result = await execute(endpoint(businessId, pageId), {
            method: "GET", baseURL: websiteArchitectureApiBase, signal,
          });
          return validateArtifact(result as ArchitectureContentArtifact, pageId);
        } catch (error) {
          const cached = queryClient.getQueryData<ArchitectureContentArtifact | null>(queryKey);
          // A start can be acknowledged before its artifact is readable.
          if (isAxiosError(error) && error.response?.status === 404 &&
            error.response.data?.detail === "File not found" &&
            !expectArtifact && cached?.request_status !== "processing") {
            return null;
          }
          throw error;
        }
      },
      retry: (count, error) => {
        if (!isAxiosError(error) || count >= 2) return false;
        const status = error.response?.status;
        return !status || status >= 500 || status === 429 ||
          (status === 404 && error.response?.data?.detail === "File not found");
      },
      retryDelay: POLL_INTERVAL_MS,
      refetchInterval: ({ state }) => state.status !== "error" && state.data?.request_status === "processing"
        ? POLL_INTERVAL_MS
        : false,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    });
  };

  const start = async ({ pageId, instructions }: { pageId: string; instructions: string }) => {
    const text = instructions.trim();
    const result = await execute(endpoint(businessId, pageId), {
      method: "POST",
      baseURL: websiteArchitectureApiBase,
      data: { mode: "auto", ...(text ? { instructions: text } : {}) },
    }) as ArchitectureContentPostResponse;
    if (result?.page_id !== pageId) throw new Error("Infer returned a different page.");
    return validateArtifact(result.artifact, pageId);
  };

  return { artifactOptions, start };
}
