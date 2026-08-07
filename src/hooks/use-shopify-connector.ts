import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface ShopifyBlog {
  id: string;
  title: string;
  handle: string;
}

export interface ShopifyTarget {
  targetId: string;
  platform: "shopify";
  targetType: "blog";
  siteId: string;
  collectionId: string;
  blogId: string;
  name: string;
  publishMode: string;
  stylingMode: string;
  status: string;
  metadata?: { handle?: string | null } | null;
}

export interface ShopifyConnection {
  connectionId: string;
  siteUrl: string;
  shop: string;
  status: "active" | "revoked" | "expired" | "failed";
  scopes: string[];
  connectedAt: string | null;
  lastUsedAt: string | null;
  metadata?: {
    shopName?: string | null;
    myshopifyDomain?: string | null;
    primaryDomain?: { host?: string | null; url?: string | null } | null;
    uninstallWebhookRegistered?: boolean;
  } | null;
  target: ShopifyTarget | null;
  targets?: { post?: ShopifyTarget | null; page?: null };
}

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function useShopifyConnection(businessId: string | null) {
  return useQuery<{ connected: boolean; connection: ShopifyConnection | null }>({
    queryKey: ["shopify-connection", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/shopify/connection?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Shopify connection");
      return {
        connected: Boolean(res.data?.connected),
        connection: res.data?.connection || null,
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useStartShopifyOauth() {
  return useMutation<any, Error, { businessId: string; shop: string }>({
    mutationFn: async payload => {
      const res = await api.post<any>("/cms/shopify/oauth/start", "node", payload);
      if (!res?.success || !res.data?.authorizationUrl) {
        throw new Error(res?.message || "Failed to start Shopify connection");
      }
      return res;
    },
    onError: error => {
      toast.error("Failed to connect Shopify", {
        description: errorMessage(error, "Check the permanent .myshopify.com store domain."),
      });
    },
  });
}

export function useShopifyBlogs(connectionId: string | null) {
  return useQuery<ShopifyBlog[]>({
    queryKey: ["shopify-blogs", connectionId],
    enabled: Boolean(connectionId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/shopify/blogs?connectionId=${encodeURIComponent(String(connectionId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to load Shopify blogs");
      return res.data?.blogs || [];
    },
  });
}

export function useConfigureShopify(businessId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { connectionId: string; blogId: string }>({
    mutationFn: async payload => {
      const res = await api.post<any>("/cms/shopify/configuration", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to save Shopify blog");
      return res;
    },
    onSuccess: () => {
      toast.success("Shopify blog saved");
      void queryClient.invalidateQueries({ queryKey: ["shopify-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: error => {
      toast.error("Failed to save Shopify blog", {
        description: errorMessage(error, "Please reload the available blogs and try again."),
      });
    },
  });
}

export function useDisconnectShopify(businessId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { connectionId: string }>({
    mutationFn: async payload => {
      const res = await api.post<any>("/cms/shopify/disconnect", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to disconnect Shopify");
      return res;
    },
    onSuccess: () => {
      toast.success("Shopify disconnected");
      void queryClient.invalidateQueries({ queryKey: ["shopify-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: error => {
      toast.error("Failed to disconnect Shopify", {
        description: errorMessage(error, "Please try again."),
      });
    },
  });
}
