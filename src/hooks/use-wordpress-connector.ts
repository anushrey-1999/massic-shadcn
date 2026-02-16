import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface WordpressConnection {
  connectionId: string;
  siteUrl: string;
  siteId: string;
  status: "active" | "revoked";
  connectedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface GetConnectionResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    connected: boolean;
    connection: WordpressConnection | null;
  };
}

interface ConnectPayload {
  businessId: string;
  siteUrl: string;
  siteId: string;
  pairingCode: string;
  clientSecret: string;
}

interface ConnectResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    connectionId: string;
    siteName?: string;
  };
}

interface DisconnectResponse {
  success: boolean;
  err: boolean;
  message?: string;
}

interface WordpressOauthSessionResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    sessionId: string;
    siteUrl: string;
    siteId: string;
    status: "pending" | "approved" | "finalized" | "expired";
    expiresAt: string;
    returnUrl: string;
    businessId: string | null;
  };
}

interface WordpressOauthApproveResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    sessionId: string;
    connectionId: string;
    redirectUrl: string;
  };
}

interface WordpressOauthStartLinkResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    connectUrl: string;
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

export function useWordpressConnection(businessId: string | null) {
  return useQuery<{ connected: boolean; connection: WordpressConnection | null }>({
    queryKey: ["wordpress-connection", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const res = await api.get<GetConnectionResponse>(
        `/cms/wordpress/connection?businessId=${encodeURIComponent(String(businessId))}`,
        "node"
      );

      if (!res?.success) {
        throw new Error(res?.message || "Failed to fetch WordPress connection");
      }

      return {
        connected: Boolean(res.data?.connected),
        connection: res.data?.connection || null,
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useConnectWordpress() {
  const queryClient = useQueryClient();

  return useMutation<ConnectResponse, Error, ConnectPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<ConnectResponse>("/cms/wordpress/connect", "node", payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to connect WordPress");
      }
      return res;
    },
    onSuccess: (_data, variables) => {
      toast.success("WordPress connected successfully");
      queryClient.invalidateQueries({ queryKey: ["wordpress-connection", variables.businessId] });
    },
    onError: (error) => {
      toast.error("Failed to connect WordPress", {
        description: getErrorMessage(error, "Please check the details and try again."),
      });
    },
  });
}

export function useDisconnectWordpress(businessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<DisconnectResponse, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      const res = await api.post<DisconnectResponse>("/cms/wordpress/disconnect", "node", {
        connectionId,
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to disconnect WordPress");
      }

      return res;
    },
    onSuccess: () => {
      toast.success("WordPress disconnected successfully");
      queryClient.invalidateQueries({ queryKey: ["wordpress-connection", businessId] });
    },
    onError: (error) => {
      toast.error("Failed to disconnect WordPress", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useWordpressOauthSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["wordpress-oauth-session", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const res = await api.get<WordpressOauthSessionResponse>(
        `/cms/wordpress/oauth/session?sessionId=${encodeURIComponent(String(sessionId))}`,
        "node"
      );

      if (!res?.success || !res.data) {
        throw new Error(res?.message || "Failed to load WordPress connect session");
      }

      return res.data;
    },
    staleTime: 5 * 1000,
  });
}

export function useApproveWordpressOauth() {
  return useMutation<
    WordpressOauthApproveResponse,
    Error,
    { sessionId: string; businessId: string }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressOauthApproveResponse>(
        "/cms/wordpress/oauth/approve",
        "node",
        payload
      );

      if (!res?.success) {
        throw new Error(res?.message || "Failed to approve WordPress connection");
      }

      return res;
    },
    onError: (error) => {
      toast.error("WordPress authorization failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}

export function useStartWordpressOauthLink() {
  return useMutation<
    WordpressOauthStartLinkResponse,
    Error,
    { businessId: string; siteUrl: string }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<WordpressOauthStartLinkResponse>(
        "/cms/wordpress/oauth/start-link",
        "node",
        payload
      );

      if (!res?.success || !res.data?.connectUrl) {
        throw new Error(res?.message || "Failed to generate WordPress admin link");
      }

      return res;
    },
    onError: (error) => {
      toast.error("Failed to create WordPress connect link", {
        description: getErrorMessage(error, "Please verify the site URL and try again."),
      });
    },
  });
}
