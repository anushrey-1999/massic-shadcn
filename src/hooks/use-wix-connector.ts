import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WixConnection {
  connectionId: string;
  status: "active" | "revoked" | "expired" | "failed";
  siteId: string | null;
  siteUrl: string | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    appId?: string | null;
    businessName?: string | null;
    locale?: string | null;
    instanceAppId?: string | null;
  } | null;
}

interface WixConnectionResponse {
  connected: boolean;
  connection: WixConnection | null;
}

interface WixOauthStartResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: { installationUrl?: string };
}

export interface WixPublishingOption {
  id: string;
  label: string;
  slug?: string | null;
  status?: string | null;
  pictureUrl?: string | null;
}

export interface WixPublishingTarget {
  targetId: string;
  siteId: string | null;
  collectionId: null;
  name: string;
  publishMode: string;
  stylingMode: string;
  metadata?: {
    authorMemberId?: string | null;
    authorLabel?: string | null;
    defaultCategoryIds?: string[];
    defaultTagIds?: string[];
    commentingEnabled?: boolean;
    featured?: boolean;
  } | null;
}

export interface WixPublishingSetup {
  setupReady: boolean;
  setupIssue: string | null;
  reconnectRequired: boolean;
  target: WixPublishingTarget | null;
  members: WixPublishingOption[];
  categories: WixPublishingOption[];
  tags: WixPublishingOption[];
  limits: {
    title: number;
    excerpt: number;
    slug: number;
    categories: number;
    tags: number;
    postBytes: number;
  };
}

interface WixPublishingSetupResponse {
  success: boolean;
  err: boolean;
  message?: string;
  code?: string;
  data?: WixPublishingSetup;
}

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function useWixConnection(businessId: string | null) {
  return useQuery<WixConnectionResponse>({
    queryKey: ["wix-connection", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/wix/connection?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Wix connection");
      return {
        connected: Boolean(res.data?.connected),
        connection: res.data?.connection || null
      };
    },
    staleTime: 15 * 1000
  });
}

export function useStartWixOauth() {
  return useMutation<WixOauthStartResponse, Error, { businessId: string; returnUrl?: string }>({
    mutationFn: async ({ businessId, returnUrl }) => {
      const params = new URLSearchParams({ businessId });
      if (returnUrl) params.set("returnUrl", returnUrl);
      const res = await api.get<WixOauthStartResponse>(`/cms/wix/oauth/start?${params.toString()}`, "node");
      if (!res?.success || !res.data?.installationUrl) {
        throw new Error(res?.message || "Failed to start Wix connection");
      }
      return res;
    },
    onError: error => {
      toast.error("Failed to connect Wix", {
        description: getErrorMessage(error, "Please check the Wix app configuration.")
      });
    }
  });
}

export function useDisconnectWix(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      const res = await api.post<any>("/cms/wix/disconnect", "node", { connectionId });
      if (!res?.success) throw new Error(res?.message || "Failed to disconnect Wix");
      return res;
    },
    onSuccess: () => {
      toast.success("Wix disconnected");
      void queryClient.invalidateQueries({ queryKey: ["wix-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["wordpress-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["webflow-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["sanity-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: error => {
      toast.error("Failed to disconnect Wix", {
        description: getErrorMessage(error, "Please try again.")
      });
    }
  });
}

export function useWixPublishingSetup(businessId: string | null, enabled = true) {
  return useQuery<WixPublishingSetup>({
    queryKey: ["wix-publishing-setup", businessId],
    enabled: Boolean(enabled && businessId),
    queryFn: async () => {
      const res = await api.get<WixPublishingSetupResponse>(
        `/cms/wix/publishing-setup?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success || !res.data) throw new Error(res?.message || "Failed to load Wix publishing setup");
      return res.data;
    },
    staleTime: 15 * 1000,
    refetchOnMount: "always"
  });
}

export function useConfigureWixPublishing(businessId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<
    WixPublishingSetupResponse,
    Error,
    {
      authorMemberId: string;
      defaultCategoryIds: string[];
      defaultTagIds: string[];
      commentingEnabled: boolean;
      featured: boolean;
    }
  >({
    mutationFn: async payload => {
      const res = await api.post<WixPublishingSetupResponse>("/cms/wix/publishing-setup", "node", {
        businessId,
        ...payload
      });
      if (!res?.success) throw new Error(res?.message || "Failed to save Wix publishing setup");
      return res;
    },
    onSuccess: () => {
      toast.success("Wix publishing setup saved");
      void queryClient.invalidateQueries({ queryKey: ["wix-publishing-setup", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: error => {
      toast.error("Failed to save Wix publishing setup", {
        description: getErrorMessage(error, "Please refresh the Wix options and try again.")
      });
      const code = (error as any)?.response?.data?.code;
      if (code === "wix_reauthorization_required" || code === "wix_blog_not_installed") {
        void queryClient.invalidateQueries({ queryKey: ["wix-publishing-setup", businessId] });
      }
    }
  });
}
