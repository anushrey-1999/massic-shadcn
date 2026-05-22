import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";
import type { WordpressSlugConflictInfo } from "@/hooks/use-wordpress-publishing";

export type CmsPublishingPlatform = "wordpress" | "webflow";

export interface CmsPublishingDomain {
  id: string;
  type: "webflow_subdomain" | "custom_domain";
  label: string;
  url: string;
  publishToWebflowSubdomain?: boolean;
  lastPublished?: string | null;
}

export interface CmsPublishingChannel {
  connected: boolean;
  platform: CmsPublishingPlatform | null;
  connection: {
    connectionId: string;
    platform: CmsPublishingPlatform;
    siteUrl?: string | null;
    siteId?: string | null;
    status: string;
    connectedAt?: string | null;
    lastUsedAt?: string | null;
    metadata?: Record<string, any> | null;
  } | null;
  target: {
    targetId: string;
    siteId: string;
    collectionId: string;
    name: string;
    fieldMapping?: Record<string, any>;
    metadata?: Record<string, any> | null;
  } | null;
  domains: CmsPublishingDomain[];
}

export interface CmsSlugCheckResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    platform: CmsPublishingPlatform;
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

export interface CmsPublishResponse {
  success: boolean;
  err: boolean;
  code?: string;
  message?: string;
  details?: Record<string, any>;
  data?: {
    platform: CmsPublishingPlatform;
    contentId: string;
    wpId?: number;
    itemId?: string;
    targetId?: string;
    permalink?: string | null;
    externalUrl?: string | null;
    previewUrl?: string | null;
    editUrl?: string | null;
    status: string;
    slug?: string | null;
    domainSelection?: {
      publishToWebflowSubdomain: boolean;
      customDomainIds: string[];
      domains?: CmsPublishingDomain[];
    };
  };
}

export interface CmsContentStatus {
  platform: CmsPublishingPlatform | null;
  exists: boolean;
  content: {
    contentId: string;
    wpId?: number | null;
    itemId?: string | null;
    targetId?: string | null;
    wpType?: "post" | "page" | null;
    permalink?: string | null;
    externalUrl?: string | null;
    previewUrl?: string | null;
    status: string | null;
    slug: string | null;
    updatedAt: string | null;
  } | null;
}

export interface CmsWebflowStagingPreviewResponse {
  success: boolean;
  err: boolean;
  code?: string;
  message?: string;
  details?: Record<string, any>;
  data?: {
    platform: CmsPublishingPlatform;
    contentId: string;
    itemId?: string;
    targetId?: string;
    status?: string;
    slug?: string | null;
    previewUrl?: string | null;
  };
}

export interface CmsWebflowRollbackToDraftResponse {
  success: boolean;
  err: boolean;
  code?: string;
  message?: string;
  details?: Record<string, any>;
  data?: {
    platform: "webflow";
    contentId: string;
    itemId?: string;
    targetId?: string;
    status?: "draft";
    slug?: string | null;
    externalUrl?: string | null;
    previewUrl?: string | null;
    alreadyDraft?: boolean;
  };
}

interface ChannelResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: CmsPublishingChannel;
}

interface ContentStatusResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: CmsContentStatus;
}

interface SlugCheckPayload {
  businessId: string;
  contentId: string;
  type?: "post" | "page";
  slug: string;
}

interface PublishPayload {
  businessId: string;
  status?: "draft" | "publish";
  contentId?: string;
  type?: "post" | "page";
  title?: string;
  slug?: string | null;
  contentHtml?: string;
  contentMarkdown?: string;
  excerpt?: string | null;
  head?: Record<string, any>;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  webflowImagesByFieldKey?: Record<string, {
    assetId?: string;
    cdnUrl: string;
    altText?: string | null;
  }>;
  workflowSource?: "infer_ai";
  workflowPayload?: Record<string, any>;
  domainSelection?: {
    publishToWebflowSubdomain?: boolean;
    customDomainIds?: string[];
  };
}

export class CmsPublishError extends Error {
  code?: string;
  details?: Record<string, any>;
  statusCode?: number;
  retryAfterSeconds?: number;
  retryExhausted?: boolean;

  constructor(message: string, code?: string, details?: Record<string, any>, statusCode?: number) {
    super(message);
    this.name = "CmsPublishError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.retryAfterSeconds = getRetryAfterSeconds(details);
    this.retryExhausted = Boolean(details?.retryMeta?.exhausted);
  }
}

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function getRetryAfterSeconds(details?: Record<string, any>) {
  const value = details?.retryMeta?.retryAfterSeconds ?? details?.retryAfterSeconds;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.ceil(parsed) : undefined;
}

export function isCmsRateLimitError(error: unknown) {
  const e = error as CmsPublishError | undefined;
  return e?.code === "too_many_requests" || e?.statusCode === 429;
}

export function getCmsRateLimitDescription(error: CmsPublishError) {
  const retryAfterSeconds = error.retryAfterSeconds ?? getRetryAfterSeconds(error.details) ?? 60;
  return error.retryExhausted
    ? `We retried once, but Webflow is still rate limited. Try again in about ${retryAfterSeconds} seconds.`
    : `Too many requests. Try again in about ${retryAfterSeconds} seconds.`;
}

function toCmsPublishError(error: any, fallbackMessage: string) {
  if (error instanceof CmsPublishError) return error;

  const responseData = error?.response?.data;
  return new CmsPublishError(
    responseData?.message || error?.message || fallbackMessage,
    responseData?.code,
    responseData?.details,
    typeof error?.response?.status === "number" ? error.response.status : undefined
  );
}

export function useCmsPublishingChannel(businessId: string | null) {
  return useQuery<CmsPublishingChannel>({
    queryKey: ["cms-publishing-channel", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await api.get<ChannelResponse>(
        `/cms/publishing/channel?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch publishing channel");
      return res.data || { connected: false, platform: null, connection: null, target: null, domains: [] };
    },
    staleTime: 15 * 1000,
  });
}

export function useCmsPublishingContentStatus(businessId: string | null, contentId: string | null) {
  return useQuery<CmsContentStatus>({
    queryKey: ["cms-publishing-content-status", businessId, contentId],
    enabled: Boolean(businessId && contentId),
    queryFn: async () => {
      const res = await api.get<ContentStatusResponse>(
        `/cms/publishing/content-status?businessId=${encodeURIComponent(String(businessId))}&contentId=${encodeURIComponent(String(contentId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch publishing content status");
      return res.data || { platform: null, exists: false, content: null };
    },
    staleTime: 10 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useCmsSlugCheck() {
  return useMutation<CmsSlugCheckResponse, Error, SlugCheckPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<CmsSlugCheckResponse>("/cms/publishing/slug-check", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to check slug");
      return res;
    },
  });
}

interface WebflowStagingPreviewPayload {
  businessId: string;
  contentId: string;
}

interface WebflowRollbackToDraftPayload {
  businessId: string;
  contentId: string;
}

export function useCmsWebflowStagingPreview() {
  const queryClient = useQueryClient();

  return useMutation<CmsWebflowStagingPreviewResponse, CmsPublishError, WebflowStagingPreviewPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await api.post<CmsWebflowStagingPreviewResponse>(
          "/cms/publishing/preview-staging",
          "node",
          payload
        );
        if (!res?.success) {
          throw new CmsPublishError(res?.message || "Failed to publish staging preview", res?.code, res?.details);
        }
        return res;
      } catch (error: any) {
        throw toCmsPublishError(error, "Failed to publish staging preview");
      }
    },
    retry: false,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["cms-publishing-content-status", variables.businessId],
      });
    },
    onError: (error) => {
      if (isCmsRateLimitError(error)) {
        toast.error("Webflow is busy", {
          description: getCmsRateLimitDescription(error),
        });
        return;
      }
      toast.error("Staging preview failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useCmsWebflowRollbackToDraft() {
  const queryClient = useQueryClient();

  return useMutation<CmsWebflowRollbackToDraftResponse, CmsPublishError, WebflowRollbackToDraftPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await api.post<CmsWebflowRollbackToDraftResponse>(
          "/cms/publishing/rollback-webflow-draft",
          "node",
          payload
        );
        if (!res?.success) {
          throw new CmsPublishError(res?.message || "Failed to move Webflow item back to draft", res?.code, res?.details);
        }
        return res;
      } catch (error: any) {
        throw toCmsPublishError(error, "Failed to move Webflow item back to draft");
      }
    },
    retry: false,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["cms-publishing-content-status", variables.businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["cms-publishing-channel", variables.businessId],
      });
    },
    onError: (error) => {
      if (isCmsRateLimitError(error)) {
        toast.error("Webflow is busy", {
          description: getCmsRateLimitDescription(error),
        });
        return;
      }
      toast.error("Webflow rollback failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useCmsPublish() {
  const queryClient = useQueryClient();

  return useMutation<CmsPublishResponse, CmsPublishError, PublishPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await api.post<CmsPublishResponse>("/cms/publishing/publish", "node", payload);
        if (!res?.success) {
          throw new CmsPublishError(res?.message || "Failed to publish", res?.code, res?.details);
        }
        return res;
      } catch (error: any) {
        throw toCmsPublishError(error, "Failed to publish");
      }
    },
    retry: false,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["cms-publishing-content-status", variables.businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["cms-publishing-channel", variables.businessId],
      });
    },
    onError: (error) => {
      if (isCmsRateLimitError(error)) {
        toast.error("Webflow is busy", {
          description: getCmsRateLimitDescription(error),
        });
        return;
      }
      if (error?.code === "slug_conflict") {
        toast.error("Slug conflict", {
          description: error.message || "This slug already exists.",
        });
        return;
      }
      toast.error("Publish failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}
