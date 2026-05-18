import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WebflowPublishResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    contentId: string;
    targetId: string;
    itemId: string;
    status: "draft" | "published";
    slug: string;
    externalUrl: string | null;
  };
}

interface PublishPayload {
  connectionId: string;
  targetId: string;
  status?: "draft" | "publish";
  contentId?: string;
  title?: string;
  slug?: string | null;
  contentHtml?: string;
  contentMarkdown?: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  head?: Record<string, any>;
  workflowSource?: "infer_ai";
  workflowPayload?: Record<string, any>;
}

interface ContentStatusResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    exists: boolean;
    content: {
      contentId: string;
      itemId: string | null;
      targetId: string | null;
      status: string | null;
      slug: string | null;
      externalUrl: string | null;
      updatedAt: string | null;
    } | null;
  };
}

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function useWebflowPublish() {
  const queryClient = useQueryClient();

  return useMutation<WebflowPublishResponse, Error, PublishPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<WebflowPublishResponse>("/cms/webflow/publish", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to publish to Webflow");
      return res;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "publish" ? "Published to Webflow" : "Webflow draft saved");
      void queryClient.invalidateQueries({
        queryKey: ["webflow-content-status", variables.connectionId],
      });
    },
    onError: (error) => {
      toast.error("Webflow publish failed", {
        description: getErrorMessage(error, "Please check the Webflow configuration and try again."),
      });
    },
  });
}

export function useWebflowContentStatus(connectionId: string | null, contentId: string | null) {
  return useQuery({
    queryKey: ["webflow-content-status", connectionId, contentId],
    enabled: Boolean(connectionId && contentId),
    queryFn: async () => {
      const res = await api.get<ContentStatusResponse>(
        `/cms/webflow/content-status?connectionId=${encodeURIComponent(String(connectionId))}&contentId=${encodeURIComponent(String(contentId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Webflow content status");
      return {
        exists: Boolean(res.data?.exists),
        content: res.data?.content || null,
      };
    },
    staleTime: 10 * 1000,
    refetchOnMount: "always",
  });
}
