import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WordpressPublishResponse {
  success: boolean;
  err: boolean;
  code?: string;
  message?: string;
  details?: Record<string, any>;
  data?: {
    contentId: string;
    wpId: number;
    permalink: string | null;
    editUrl: string | null;
    status: string;
    slug?: string | null;
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

export interface WordpressUnpublishResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    contentId: string;
    wpId: number;
    status: string;
    permalink: string | null;
  };
}

export interface WordpressSlugConflictInfo {
  wpId: number;
  title: string;
  status: string;
  wpType: "post" | "page";
  permalink: string | null;
  editUrl: string | null;
  slug?: string;
  typeMismatch?: boolean;
  reason?: "slug_exists" | "type_mismatch" | "parent_type_conflict" | string;
}

export interface WordpressSlugCheckResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    slug: string;
    publishUrl: string | null;
    exists: boolean;
    sameMappedContent: boolean;
    conflict: WordpressSlugConflictInfo | null;
    suggestedSlug?: string | null;
    mappedToDifferentContent: boolean;
    mappedContentId: string | null;
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

interface SlugCheckPayload {
  connectionId: string;
  contentId: string;
  type: "post" | "page";
  slug: string;
}

interface PreviewPayload {
  connectionId: string;
  contentId?: string;
  wpId?: number;
  expiresIn?: number;
}

interface UnpublishPayload {
  connectionId: string;
  contentId: string;
  targetStatus?: "draft" | "trash";
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
      slug: string | null;
      updatedAt: string | null;
    } | null;
  };
}

export class WordpressPublishError extends Error {
  code?: string;
  details?: Record<string, any>;
  statusCode?: number;

  constructor(message: string, code?: string, details?: Record<string, any>, statusCode?: number) {
    super(message);
    this.name = "WordpressPublishError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.message ||
    fallback
  );
};

function toWordpressPublishError(error: any, fallbackMessage: string) {
  if (error instanceof WordpressPublishError) {
    return error;
  }

  const responseData = error?.response?.data;
  const message = responseData?.message || error?.message || fallbackMessage;
  const code = responseData?.code;
  const details = responseData?.details;
  const statusCode = typeof error?.response?.status === "number" ? error.response.status : undefined;

  return new WordpressPublishError(message, code, details, statusCode);
}

export function useWordpressPublish() {
  const queryClient = useQueryClient();

  return useMutation<WordpressPublishResponse, WordpressPublishError, PublishPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await api.post<WordpressPublishResponse>("/cms/wordpress/publish", "node", payload);
        if (!res?.success) {
          throw new WordpressPublishError(
            res?.message || "Failed to publish to WordPress",
            res?.code,
            res?.details,
            undefined
          );
        }
        return res;
      } catch (error: any) {
        throw toWordpressPublishError(error, "Failed to publish to WordPress");
      }
    },
    onError: (error) => {
      if (error?.code === "slug_conflict") {
        toast.error("WordPress slug conflict", {
          description: error.message || "This slug already exists in WordPress.",
        });
        return;
      }

      toast.error("WordPress publish failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
    onSuccess: (_data, variables) => {
      if (variables?.connectionId) {
        void queryClient.invalidateQueries({
          queryKey: ["wordpress-content-status", variables.connectionId],
        });
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["wordpress-content-status"],
      });
    },
  });
}

export function useWordpressSlugCheck() {
  return useMutation<WordpressSlugCheckResponse, Error, SlugCheckPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressSlugCheckResponse>("/cms/wordpress/slug-check", "node", payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to check WordPress slug");
      }
      return res;
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

export function useWordpressUnpublish() {
  const queryClient = useQueryClient();

  return useMutation<WordpressUnpublishResponse, Error, UnpublishPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressUnpublishResponse>("/cms/wordpress/unpublish", "node", payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to unpublish from WordPress");
      }
      return res;
    },
    onError: (error) => {
      toast.error("WordPress unpublish failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
    onSuccess: (_data, variables) => {
      if (variables?.connectionId) {
        void queryClient.invalidateQueries({
          queryKey: ["wordpress-content-status", variables.connectionId],
        });
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["wordpress-content-status"],
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
    refetchOnMount: "always",
  });
}
