"use client";

import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type GenerationStatus = "success" | "error" | "pending" | "processing" | "outline_only" | "final_only" | string;

export type WebActionType = "blog" | "page";

export interface WebActionResponse<TPage = any> {
  status: GenerationStatus;
  message?: string;
  output_data?: {
    page?: TPage;
    [key: string]: any;
  };
  [key: string]: any;
}

const WEB_ACTION_CONTENT_QUERY_KEY = "web-action-content";

function getStatusLowercase(data: WebActionResponse | undefined): string {
  return (data?.status || "").toString().toLowerCase();
}

export function useWebActionContentQuery(params: {
  type: WebActionType;
  businessId: string;
  pageId: string;
  enabled?: boolean;
  pollingDisabled?: boolean;
  pollingIntervalMs?: number;
}) {
  const api = useApi({ platform: "python" });

  const { type, businessId, pageId, enabled = true, pollingDisabled = false, pollingIntervalMs = 6000 } = params;

  return useQuery({
    queryKey: [WEB_ACTION_CONTENT_QUERY_KEY, type, businessId, pageId],
    enabled: enabled && !!businessId && !!pageId,
    queryFn: async () => {
      const endpoint =
        type === "blog"
          ? `/client/create-ai-blog-writer?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
          : `/client/create-page-builder?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

      return api.execute(endpoint, { method: "GET" }) as Promise<WebActionResponse>;
    },
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (pollingDisabled) return false;
      const status = getStatusLowercase(query.state.data as WebActionResponse | undefined);
      return status === "pending" || status === "processing" ? pollingIntervalMs : false;
    },
    staleTime: 0,
  });
}

export function useWebPageActions() {
  const api = useApi({ platform: "python" });
  const queryClient = useQueryClient();

  const getContent = async (type: WebActionType, businessId: string, pageId: string) => {
    const endpoint =
      type === "blog"
        ? `/client/create-ai-blog-writer?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
        : `/client/create-page-builder?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

    return api.execute(endpoint, { method: "GET" }) as Promise<WebActionResponse>;
  };

  const startOutline = async (type: WebActionType, businessId: string, pageId: string) => {
    const endpoint =
      type === "blog"
        ? `/client/create-ai-blog-writer?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=outline_only`
        : `/client/create-page-builder?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=outline_only`;

    return api.execute(endpoint, { method: "POST" }) as Promise<WebActionResponse>;
  };

  const startFinal = async (type: WebActionType, businessId: string, pageId: string) => {
    const endpoint =
      type === "blog"
        ? `/client/create-ai-blog-writer?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=final_only`
        : `/client/create-page-builder?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=final_only`;

    return api.execute(endpoint, { method: "POST" }) as Promise<WebActionResponse>;
  };

  const updateOutline = async (type: WebActionType, businessId: string, pageId: string, outline: string) => {
    const endpoint =
      type === "blog"
        ? `/client/update-ai-blog-writer-outline?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
        : `/client/update-page-builder-outline?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

    const requestBody = `{"outline": ${JSON.stringify(outline)}}`;

    return api.execute(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      data: requestBody,
    }) as Promise<WebActionResponse>;
  };

  const updateBlogContent = async (
    businessId: string,
    pageId: string,
    params: {
      blog_post: string;
      meta_description: string;
    }
  ) => {
    const endpoint = `/client/update-ai-blog-writer-content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

    return api.execute(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      data: params,
    }) as Promise<WebActionResponse>;
  };

  const updatePageContent = async (businessId: string, pageId: string, content: string) => {
    const endpoint = `/client/update-page-builder-content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

    return api.execute(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      data: { content },
    }) as Promise<WebActionResponse>;
  };

  return {
    getContent,
    startOutline,
    startFinal,
    updateOutline,
    updateBlogContent,
    updatePageContent,
    invalidateContent: (type: WebActionType, businessId: string, pageId: string) =>
      queryClient.invalidateQueries({ queryKey: [WEB_ACTION_CONTENT_QUERY_KEY, type, businessId, pageId] }),
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
