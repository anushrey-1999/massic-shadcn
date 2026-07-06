import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface SanityFieldMappingItem {
  massicField?: string;
  sourcePath?: string;
  sanityFieldPath: string;
  staticValue?: string;
  type?: string;
  sanityFieldType?: string;
}

export interface SanityTarget {
  targetId: string;
  siteId: string;
  documentType: string;
  name: string;
  fieldMapping: { fields?: SanityFieldMappingItem[] };
  status: string;
  metadata?: Record<string, any> | null;
}

export interface SanityConnection {
  connectionId: string;
  status: "active" | "revoked" | "expired" | "failed";
  siteUrl?: string | null;
  siteId?: string | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
  metadata?: Record<string, any> | null;
  target: SanityTarget | null;
}

export interface SanityDocumentType {
  id: string;
  name: string;
}

export interface SanityField {
  fieldPath: string;
  name?: string;
  label?: string;
  type?: string;
  occurrences?: number;
  possibleImage?: boolean;
  possibleBody?: boolean;
  possibleSlug?: boolean;
}

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export function useSanityConnection(businessId: string | null) {
  return useQuery<{ connected: boolean; connection: SanityConnection | null }>({
    queryKey: ["sanity-connection", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/sanity/connection?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Sanity connection");
      return {
        connected: Boolean(res.data?.connected),
        connection: res.data?.connection || null,
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useConnectSanity(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, {
    businessId: string;
    projectId: string;
    dataset?: string;
    token: string;
    previewBaseUrl?: string | null;
    urlPattern?: string;
  }>({
    mutationFn: async (payload) => {
      const res = await api.post<any>("/cms/sanity/connect", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to connect Sanity");
      return res;
    },
    onSuccess: () => {
      toast.success("Sanity connected");
      void queryClient.invalidateQueries({ queryKey: ["sanity-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["wordpress-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["webflow-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: (error) => {
      toast.error("Failed to connect Sanity", {
        description: getErrorMessage(error, "Check the project, dataset, and token."),
      });
    },
  });
}

export function useValidateSanity() {
  return useMutation<any, Error, {
    businessId: string;
    projectId: string;
    dataset?: string;
    token: string;
    previewBaseUrl?: string | null;
    urlPattern?: string;
  }>({
    mutationFn: async (payload) => {
      const res = await api.post<any>("/cms/sanity/validate", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to validate Sanity");
      return res;
    },
    onSuccess: () => {
      toast.success("Sanity connection validated");
    },
    onError: (error) => {
      toast.error("Sanity validation failed", {
        description: getErrorMessage(error, "Check the project, dataset, and token."),
      });
    },
  });
}

export function useSanityDocumentTypes(connectionId: string | null) {
  return useQuery<SanityDocumentType[]>({
    queryKey: ["sanity-document-types", connectionId],
    enabled: Boolean(connectionId),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/sanity/document-types?connectionId=${encodeURIComponent(String(connectionId))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Sanity document types");
      return res.data?.documentTypes || [];
    },
  });
}

export function useSanityFields(connectionId: string | null, documentType: string | null) {
  return useQuery<SanityField[]>({
    queryKey: ["sanity-fields", connectionId, documentType],
    enabled: Boolean(connectionId && documentType),
    queryFn: async () => {
      const res = await api.get<any>(
        `/cms/sanity/fields?connectionId=${encodeURIComponent(String(connectionId))}&documentType=${encodeURIComponent(String(documentType))}`,
        "node"
      );
      if (!res?.success) throw new Error(res?.message || "Failed to fetch Sanity fields");
      return res.data?.fields || [];
    },
  });
}

export function useConfigureSanity(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, {
    connectionId: string;
    documentType: string;
    fieldMapping: { fields: SanityFieldMappingItem[] };
    previewBaseUrl?: string | null;
    urlPattern?: string;
    customConfig?: Record<string, any>;
  }>({
    mutationFn: async (payload) => {
      const res = await api.post<any>("/cms/sanity/configuration", "node", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to save Sanity configuration");
      return res;
    },
    onSuccess: () => {
      toast.success("Sanity configuration saved");
      void queryClient.invalidateQueries({ queryKey: ["sanity-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
    onError: (error) => {
      toast.error("Failed to save Sanity configuration", {
        description: getErrorMessage(error, "Check the document type and field mapping."),
      });
    },
  });
}

export function useDisconnectSanity(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      const res = await api.post<any>("/cms/sanity/disconnect", "node", { connectionId });
      if (!res?.success) throw new Error(res?.message || "Failed to disconnect Sanity");
      return res;
    },
    onSuccess: () => {
      toast.success("Sanity disconnected");
      void queryClient.invalidateQueries({ queryKey: ["sanity-connection", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["cms-publishing-channel", businessId] });
    },
  });
}
