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
  const queryClient = useQueryClient();

  const { type, businessId, pageId, enabled = true, pollingDisabled = false, pollingIntervalMs = 6000 } = params;

  return useQuery({
    queryKey: [WEB_ACTION_CONTENT_QUERY_KEY, type, businessId, pageId],
    enabled: enabled && !!businessId && !!pageId,
    queryFn: async () => {
      const endpoint =
        type === "blog"
          ? `/content/blogs?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
          : `/content/pages?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

      try {
        return (await api.execute(endpoint, { method: "GET" })) as WebActionResponse;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // If generation has just been started, we may have optimistic cached state.
          // In that case, keep polling using the cached "pending/processing" status.
          const cached = queryClient.getQueryData<WebActionResponse>([
            WEB_ACTION_CONTENT_QUERY_KEY,
            type,
            businessId,
            pageId,
          ]);
          const cachedStatus = getStatusLowercase(cached);
          if (cachedStatus === "pending" || cachedStatus === "processing") {
            return cached as WebActionResponse;
          }
          // Otherwise, 404 means nothing exists yet — do not poll.
          return null as any;
        }
        throw err;
      }
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
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
        ? `/content/blogs?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
        : `/content/pages?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

    return api.execute(endpoint, { method: "GET" }) as Promise<WebActionResponse>;
  };

  const startOutline = async (type: WebActionType, businessId: string, pageId: string) => {
    const endpoint =
      type === "blog"
        ? `/content/blogs?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=outline_only`
        : `/content/pages?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=outline_only`;

    return api.execute(endpoint, { method: "POST" }) as Promise<WebActionResponse>;
  };

  const startFinal = async (type: WebActionType, businessId: string, pageId: string) => {
    const endpoint =
      type === "blog"
        ? `/content/blogs?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=final_only`
        : `/content/pages?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}&flow=final_only`;

    return api.execute(endpoint, { method: "POST" }) as Promise<WebActionResponse>;
  };

  const updateOutline = async (type: WebActionType, businessId: string, pageId: string, outline: string) => {
    const endpoint =
      type === "blog"
        ? `/content/blogs/outline?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`
        : `/content/pages/outline?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

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
      html: string;
      title?: string;
      meta_title?: string;
      meta_description: string;
    }
  ) => {
    const endpoint = `/content/blogs/content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

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
    const endpoint = `/content/pages/content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;

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
