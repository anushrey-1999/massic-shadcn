import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type {
  AccessRequestStatusResponse,
  AccessRequestStepsResponse,
  AccessRequestStep,
  DiscoverAssetsResponse,
  Product,
  VerifyStepResponse,
} from "@/types/access-request";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const publicRequestConfig = {
  skipAuth: true,
  suppressUnauthorizedSession: true,
};

async function publicGet<T>(path: string): Promise<T> {
  return api.get<T>(path, "node", publicRequestConfig);
}

async function publicPost<T>(path: string, body?: unknown): Promise<T> {
  return api.post<T>(path, "node", body, publicRequestConfig);
}

export function useAccessRequestStatus(token: string) {
  return useQuery<AccessRequestStatusResponse>({
    queryKey: ["access-request-status", token],
    queryFn: async () => {
      const res = await publicGet<ApiResponse<AccessRequestStatusResponse>>(
        `/access-request/${token}/status`
      );
      return res.data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useAccessRequestSteps(token: string) {
  return useQuery<AccessRequestStepsResponse>({
    queryKey: ["access-request-steps", token],
    queryFn: async () => {
      const res = await publicGet<ApiResponse<AccessRequestStepsResponse>>(
        `/access-request/${token}/steps`
      );
      return res.data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useDiscoverAssets(token: string, product: Product | null) {
  return useQuery<DiscoverAssetsResponse>({
    queryKey: ["access-request-discover", token, product],
    queryFn: async () => {
      const res = await publicGet<ApiResponse<DiscoverAssetsResponse>>(
        `/access-request/${token}/steps/${product}/discover`
      );
      return res.data;
    },
    enabled: !!token && !!product,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSelectAssets(token: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { step: AccessRequestStep },
    Error,
    { product: Product; selectedAssets: Record<string, unknown>[] }
  >({
    mutationFn: async ({ product, selectedAssets }) => {
      const res = await publicPost<ApiResponse<{ step: AccessRequestStep }>>(
        `/access-request/${token}/steps/${product}/select`,
        { selectedAssets }
      );
      if (!res.success) throw new Error(res.message || "Failed to select assets");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-steps", token] });
    },
  });
}

export function useExecuteStep(token: string) {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, { product: Product }>({
    mutationFn: async ({ product }) => {
      const res = await publicPost<ApiResponse<Record<string, unknown>>>(
        `/access-request/${token}/steps/${product}/execute`
      );
      if (!res.success) throw new Error(res.message || "Failed to execute step");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-steps", token] });
    },
  });
}

export function useVerifyStep(token: string) {
  const queryClient = useQueryClient();

  return useMutation<VerifyStepResponse, Error, { product: Product }>({
    mutationFn: async ({ product }) => {
      const res = await publicPost<ApiResponse<VerifyStepResponse>>(
        `/access-request/${token}/steps/${product}/verify`
      );
      if (!res.success) throw new Error(res.message || "Failed to verify step");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-steps", token] });
    },
  });
}

export function useCompleteManualStep(token: string) {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, { product: Product }>({
    mutationFn: async ({ product }) => {
      const res = await publicPost<ApiResponse<Record<string, unknown>>>(
        `/access-request/${token}/steps/${product}/complete`
      );
      if (!res.success) throw new Error(res.message || "Failed to complete step");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-steps", token] });
    },
  });
}
