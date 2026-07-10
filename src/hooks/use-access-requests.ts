import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type {
  AccessRequest,
  AccessRequestShare,
  AccessRequestListResponse,
  CreateAccessRequestPayload,
  Product,
} from "@/types/access-request";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;

  if (responseMessage) {
    return responseMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useAccessRequests(page = 1, limit = 20) {
  return useQuery<AccessRequestListResponse>({
    queryKey: ["access-requests", page, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AccessRequestListResponse>>(
        `/access-request/list?page=${page}&limit=${limit}`,
        "node"
      );
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export function useAccessRequestDetail(requestId: string | null) {
  return useQuery<AccessRequest>({
    queryKey: ["access-request-detail", requestId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AccessRequest>>(
        `/access-request/detail/${requestId}`,
        "node"
      );
      return res.data;
    },
    enabled: !!requestId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export function useCreateAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation<AccessRequest, Error, CreateAccessRequestPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await api.post<ApiResponse<AccessRequest>>(
          "/access-request/create",
          "node",
          payload
        );
        if (!res.success) {
          throw new Error(res.message || "Failed to create access request");
        }
        return res.data;
      } catch (error) {
        throw new Error(
          getApiErrorMessage(error, "Failed to create access request")
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
    },
  });
}

export function useShareAccessRequest(requestId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<AccessRequestShare[], Error, { emails: string[]; requestId?: string }>({
    mutationFn: async ({ emails, requestId: requestIdOverride }) => {
      const targetRequestId = requestIdOverride || requestId;
      if (!targetRequestId) {
        throw new Error("Access request is required");
      }

      try {
        const res = await api.post<ApiResponse<AccessRequestShare[]>>(
          `/access-request/${encodeURIComponent(targetRequestId)}/share`,
          "node",
          { emails }
        );
        if (!res.success) {
          throw new Error(res.message || "Failed to share access request");
        }
        return res.data;
      } catch (error) {
        throw new Error(
          getApiErrorMessage(error, "Failed to share access request")
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      const targetRequestId = variables.requestId || requestId;
      if (targetRequestId) {
        queryClient.invalidateQueries({ queryKey: ["access-request-detail", targetRequestId] });
      }
    },
  });
}

export function useRefreshAccessRequestProduct(requestId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<
    { verified: boolean; status?: string; message?: string },
    Error,
    { product: Product; requestId?: string }
  >({
    mutationFn: async ({ product, requestId: requestIdOverride }) => {
      const targetRequestId = requestIdOverride || requestId;
      if (!targetRequestId) {
        throw new Error("Access request is required");
      }

      try {
        const res = await api.post<ApiResponse<{ verified: boolean; status?: string; message?: string }>>(
          `/access-request/${encodeURIComponent(targetRequestId)}/refresh/${product}`,
          "node",
          {}
        );
        if (!res.success) {
          throw new Error(res.message || "Failed to refresh access");
        }
        return res.data;
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to refresh access"));
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      const targetRequestId = variables.requestId || requestId;
      if (targetRequestId) {
        queryClient.invalidateQueries({ queryKey: ["access-request-detail", targetRequestId] });
      }
    },
  });
}
