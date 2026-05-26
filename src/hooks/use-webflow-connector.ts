import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WebflowFieldMappingItem {
  massicField?: string;
  webflowFieldId?: string;
  webflowFieldSlug?: string;
  staticValue?: string;
  type?: string;
}

export interface WebflowTarget {
  targetId: string;
  siteId: string;
  collectionId: string;
  name: string;
  fieldMapping: { fields?: WebflowFieldMappingItem[] };
  status: string;
  metadata?: Record<string, any> | null;
}

export interface WebflowConnection {
  connectionId: string;
  status: "active" | "revoked" | "expired" | "failed";
  connectedAt: string | null;
  lastUsedAt: string | null;
  target: WebflowTarget | null;
}

export interface WebflowCollectionField {
  id?: string;
  _id?: string;
  apiName?: string;
  slug?: string;
  name?: string;
  displayName?: string;
  type?: string;
  fieldType?: string;
  isRequired?: boolean;
  required?: boolean;
}

export interface WebflowCollection {
  id?: string;
  _id?: string;
  name?: string;
  displayName?: string;
  fields?: WebflowCollectionField[];
  massicEligible?: boolean;
  hasImageField?: boolean;
}

export interface WebflowSite {
  id?: string;
  _id?: string;
  displayName?: string;
  name?: string;
  shortName?: string;
  previewUrl?: string;
  customDomains?: Array<{ url?: string }>;
}

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function useWebflowConnection(businessId: string | null) {
  return useQuery<{ connected: boolean; connection: WebflowConnection | null }>({
    queryKey: ["webflow-connection", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/webflow/connection?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Webflow connection");
      return {
        connected: Boolean(res.data?.connected),
        connection: res.data?.connection || null,
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useStartWebflowOauth() {
  return useMutation<any, Error, { businessId: string; returnUrl?: string }>({
    mutationFn: async ({ businessId, returnUrl }) => {
      const params = new URLSearchParams({ businessId });
      if (returnUrl) params.set("returnUrl", returnUrl);
      const res = await api.get<any>(`/cms/webflow/oauth/start?${params.toString()}`, "node");
      if (!res?.success || !res.data?.authorizationUrl) {
        throw new Error(res?.message || "Failed to start Webflow connection");
      }
      return res;
    },
    onError: (error) => {
      toast.error("Failed to connect Webflow", {
        description: getErrorMessage(error, "Please check the Webflow app configuration."),
      });
    },
  });
}

export function useWebflowSites(connectionId: string | null) {
  return useQuery<WebflowSite[]>({
    queryKey: ["webflow-sites", connectionId],
    enabled: Boolean(connectionId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/webflow/sites?connectionId=${encodeURIComponent(String(connectionId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Webflow sites");
      return res.data?.sites || [];
    },
  });
}

export function useWebflowCollections(connectionId: string | null, siteId: string | null) {
  return useQuery<WebflowCollection[]>({
    queryKey: ["webflow-collections", connectionId, siteId],
    enabled: Boolean(connectionId && siteId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/webflow/collections?connectionId=${encodeURIComponent(String(connectionId))}&siteId=${encodeURIComponent(String(siteId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Webflow collections");
      return res.data?.collections || [];
    },
  });
}

export function useConfigureWebflow(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, {
    connectionId: string;
    siteId: string;
    collectionId: string;
    collectionName?: string;
    fieldMapping: { fields: WebflowFieldMappingItem[] };
  }>({
    mutationFn: async (payload) => {
      const res = await api.post<any>("/cms/webflow/configuration", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to save Webflow configuration");
      return res;
    },
    onSuccess: () => {
      toast.success("Webflow configuration saved");
      void queryClient.invalidateQueries({ queryKey: ["webflow-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: (error) => {
      toast.error("Failed to save Webflow configuration", {
        description: getErrorMessage(error, "Please complete required field mappings."),
      });
    },
  });
}

export function useDisconnectWebflow(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      const res = await api.post<any>("/cms/webflow/disconnect", "node", { connectionId });
      if (!res?.success) throw new Error(res?.message || "Failed to disconnect Webflow");
      return res;
    },
    onSuccess: () => {
      toast.success("Webflow disconnected");
      void queryClient.invalidateQueries({ queryKey: ["webflow-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
  });
}
