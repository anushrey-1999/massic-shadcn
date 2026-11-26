"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { websiteArchitectureApiBase } from "@/hooks/use-website-architecture";
import type {
  ArchitectureContentArtifact,
  ArchitectureContentMode,
  ArchitectureContentPostResponse,
  ArchitectureContentTag,
} from "@/types/website-architecture-content-types";

export const ARCHITECTURE_INSTRUCTIONS_LIMIT = 2000;
export const ARCHITECTURE_TAGS_BATCH_LIMIT = 100;
const POLL_INTERVAL_MS = 10000;
const RETRY_DELAY_MS = 2000;

export function architectureContentKey(businessId: string, pageId: string) {
  return ["website-architecture-content", businessId, pageId] as const;
}

export function architectureTagsKey(businessId: string, urls: readonly string[]) {
  return ["website-architecture-tags", businessId, ...urls] as const;
}

function endpoint(businessId: string, target?: { pageId?: string; url?: string }) {
  const params = new URLSearchParams({ business_id: businessId });
  if (target?.pageId !== undefined) params.set("page_id", target.pageId);
  else if (target?.url !== undefined) params.set("url", target.url);
  return `/content/website-architecture?${params}`;
}

function tagsEndpoint(businessId: string) {
  const params = new URLSearchParams({ business_id: businessId });
  return `/content/website-architecture/tags?${params}`;
}

export function isArchitecturePageId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim() &&
    value !== "." && value !== ".." && !/[/\\\s]/.test(value);
}

function validateArtifact(artifact: ArchitectureContentArtifact, pageId: string) {
  if (artifact?.page_id !== pageId || !["processing", "success", "error"].includes(artifact.request_status) ||
    (artifact.schema_version === 2 &&
      (!artifact.current || !["pending", "processing", "needs_answers", "success", "no_change", "failed"].includes(artifact.current.status)))) {
    throw new Error("Infer returned an invalid page result.");
  }
  return artifact;
}

export function isArchitectureContentRunning(artifact: ArchitectureContentArtifact | null | undefined) {
  return artifact?.request_status === "processing" &&
    (artifact.schema_version !== 2 || artifact.current?.status === "pending" || artifact.current?.status === "processing");
}

export function architectureRequestError(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const detail: unknown = error.response?.data?.detail;
  if (detail === "architecture_missing") return "This business needs a website architecture before you can generate a page.";
  if (detail === "A published profile is required.") return "Publish the business profile before generating a page.";
  if (detail === "Page is not in the latest architecture run.") return "This page is no longer in the latest website architecture.";
  if (detail === "The page artifact could not be read.") return "This saved request could not be read. If the problem persists, contact support.";
  if (detail === "File not found" || detail === "This page has no content request.") return "This page request could not be found.";
  if (detail === "The architecture page could not be read.") return "This page could not be read from the website architecture.";
  if (detail === "This page already has a request in flight.") return "This page already has a request in progress.";
  if (detail === "Instructions are longer than the brief allows.") return "Keep instructions to 2,000 characters or fewer.";
  if (detail === "url is on another site.") return "This URL does not belong to the business website.";
  if (detail === "The business has no site.") return "Add a website to the business profile before optimizing pages.";
  if (detail === "At most 100 urls.") return "Too many URLs requested at once.";
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
          const result = await execute(endpoint(businessId, { pageId }), {
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
        return !status || status >= 500 || status === 408 || status === 429 ||
          (status === 404 && error.response?.data?.detail === "File not found");
      },
      retryDelay: RETRY_DELAY_MS,
      refetchIntervalInBackground: false,
      refetchInterval: ({ state }) => state.status !== "error" && isArchitectureContentRunning(state.data)
        ? POLL_INTERVAL_MS
        : false,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    });
  };

  const post = async (data: {
    mode: ArchitectureContentMode;
    request: string;
    instructions?: string;
  } | {
    mode: "auto";
    instructions?: string;
  } | { answers: string[] }, target?: { pageId?: string; url?: string }) => {
    const result = await execute(endpoint(businessId, target), {
      method: "POST",
      baseURL: websiteArchitectureApiBase,
      data,
    }) as ArchitectureContentPostResponse;
    if (!isArchitecturePageId(result?.page_id) || (target?.pageId !== undefined && result.page_id !== target.pageId)) {
      throw new Error("Infer returned an invalid page ID.");
    }
    return validateArtifact(result.artifact, result.page_id);
  };

  const start = ({ pageId, instructions }: { pageId: string; instructions: string }) =>
    post({ mode: "auto", instructions: instructions.trim() || undefined }, { pageId });

  const startByUrl = async ({ url, instructions }: { url: string; instructions: string }) => {
    const artifact = await post(
      { mode: "auto", instructions: instructions.trim() || undefined },
      { url: url.trim() },
    );
    queryClient.setQueryData(architectureContentKey(businessId, artifact.page_id), artifact);
    return artifact;
  };

  const startAdHoc = async ({ request, mode, instructions }: {
    request: string;
    mode: ArchitectureContentMode;
    instructions: string;
  }) => {
    const artifact = await post({ request: request.trim(), mode, instructions: instructions.trim() || undefined });
    queryClient.setQueryData(architectureContentKey(businessId, artifact.page_id), artifact);
    return artifact;
  };

  const submitAnswers = async (pageId: string, answers: string[]) => {
    const queryKey = architectureContentKey(businessId, pageId);
    await queryClient.cancelQueries({ queryKey, exact: true });
    const artifact = await post({ answers }, { pageId });
    queryClient.setQueryData(queryKey, artifact);
  };

  const fetchTags = useCallback(
    async (urls: readonly string[], signal?: AbortSignal): Promise<ArchitectureContentTag[]> => {
      const batch = urls.slice(0, ARCHITECTURE_TAGS_BATCH_LIMIT);
      if (!batch.length) return [];
      const result = await execute(tagsEndpoint(businessId), {
        method: "POST",
        baseURL: websiteArchitectureApiBase,
        data: { urls: batch },
        signal,
      });
      return Array.isArray(result) ? (result as ArchitectureContentTag[]) : [];
    },
    [businessId, execute],
  );

  return { artifactOptions, start, startByUrl, startAdHoc, submitAnswers, fetchTags };
}

export function useWebsiteArchitectureTags(
  businessId: string,
  urls: readonly string[],
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { fetchTags } = useWebsiteArchitectureContent(businessId);
  const normalizedUrls = useMemo(
    () => [...new Set(urls.filter((url) => url.trim().length > 0))].slice(0, ARCHITECTURE_TAGS_BATCH_LIMIT),
    [urls],
  );

  return useQuery<ArchitectureContentTag[]>({
    queryKey: architectureTagsKey(businessId, normalizedUrls),
    queryFn: ({ signal }) => fetchTags(normalizedUrls, signal),
    enabled: Boolean(businessId) && normalizedUrls.length > 0 && enabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: (count, error) => !isAxiosError(error) || !error.response || error.response.status >= 500
      ? count < 1 : false,
  });
}
