import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type {
  AccessRequest,
  AccessRequestListResponse,
  CreateAccessRequestPayload,
} from "@/types/access-request";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
  });
}

export function useCreateAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation<AccessRequest, Error, CreateAccessRequestPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<ApiResponse<AccessRequest>>(
        "/access-request/create",
        "node",
        payload
      );
      if (!res.success) {
        throw new Error(res.message || "Failed to create access request");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
    },
  });
}
