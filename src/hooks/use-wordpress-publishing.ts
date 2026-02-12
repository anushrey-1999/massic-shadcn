import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WordpressPublishResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    contentId: string;
    wpId: number;
    permalink: string | null;
    editUrl: string | null;
    status: string;
  };
}

export interface WordpressPreviewResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    wpId: number;
    previewUrl: string;
    expiresAt: string | null;
  };
}

interface PublishPayload {
  connectionId: string;
  status?: "draft" | "pending" | "publish" | "private" | "future";
  contentId?: string;
  type?: "post" | "page";
  title?: string;
  slug?: string | null;
  contentHtml?: string;
  contentMarkdown?: string;
  excerpt?: string | null;
  head?: Record<string, any>;
  workflowSource?: "infer_ai";
  workflowPayload?: Record<string, any>;
}

interface PreviewPayload {
  connectionId: string;
  contentId?: string;
  wpId?: number;
  expiresIn?: number;
}

interface ContentStatusResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    exists: boolean;
    content: {
      contentId: string;
      wpId: number | null;
      wpType: "post" | "page" | null;
      permalink: string | null;
      status: string | null;
      updatedAt: string | null;
    } | null;
  };
}

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.message ||
    fallback
  );
};

export function useWordpressPublish() {
  return useMutation<WordpressPublishResponse, Error, PublishPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressPublishResponse>("/cms/wordpress/publish", "node", payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to publish to WordPress");
      }
      return res;
    },
    onError: (error) => {
      toast.error("WordPress publish failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useWordpressPreviewLink() {
  return useMutation<WordpressPreviewResponse, Error, PreviewPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressPreviewResponse>("/cms/wordpress/preview", "node", payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to create WordPress preview link");
      }
      return res;
    },
    onError: (error) => {
      toast.error("Failed to create preview link", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useWordpressContentStatus(connectionId: string | null, contentId: string | null) {
  return useQuery({
    queryKey: ["wordpress-content-status", connectionId, contentId],
    enabled: Boolean(connectionId && contentId),
    queryFn: async () => {
      const res = await api.get<ContentStatusResponse>(
        `/cms/wordpress/content-status?connectionId=${encodeURIComponent(String(connectionId))}&contentId=${encodeURIComponent(String(contentId))}`,
        "node"
      );

      if (!res?.success) {
        throw new Error(res?.message || "Failed to fetch WordPress content status");
      }

      return {
        exists: Boolean(res?.data?.exists),
        content: res?.data?.content || null,
      };
    },
    staleTime: 10 * 1000,
  });
}
