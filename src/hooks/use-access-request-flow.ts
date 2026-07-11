import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type {
  AccessRequestStatusResponse,
  AccessRequestStepsResponse,
  AccessRequestStep,
  AccessRequestVisitResponse,
  AccessCheck,
  ContributorStatusResponse,
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

export function useCreateAccessRequestVisit(token: string) {
  return useMutation<
    AccessRequestVisitResponse,
    Error,
    { sessionToken?: string | null; inviteToken?: string | null }
  >({
    mutationFn: async ({ sessionToken, inviteToken }) => {
      const res = await publicPost<ApiResponse<AccessRequestVisitResponse>>(
        `/access-request/${token}/visit`,
        { sessionToken, inviteToken }
      );
      if (!res.success) throw new Error(res.message || "Failed to create visit");
      return res.data;
    },
    retry: false,
  });
}

export function useContributorStatus(token: string, sessionToken: string | null) {
  return useQuery<ContributorStatusResponse>({
    queryKey: ["access-request-contributor-status", token, sessionToken],
    queryFn: async () => {
      const query = sessionToken ? `?c=${encodeURIComponent(sessionToken)}` : "";
      const res = await publicGet<ApiResponse<ContributorStatusResponse>>(
        `/access-request/${token}/contributor-status${query}`
      );
      return res.data;
    },
    enabled: !!token && !!sessionToken,
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSelectContributorAssets(token: string, sessionToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation<
    { check: AccessCheck },
    Error,
    { product: Product; selectedAssets: Record<string, unknown>[] }
  >({
    mutationFn: async ({ product, selectedAssets }) => {
      const res = await publicPost<ApiResponse<{ check: AccessCheck }>>(
        `/access-request/${token}/contributor/${product}/select`,
        { sessionToken, selectedAssets }
      );
      if (!res.success) throw new Error(res.message || "Failed to select assets");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-contributor-status", token, sessionToken] });
    },
  });
}

export function useExecuteContributorGrant(token: string, sessionToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation<Record<string, unknown>, Error, { product: Product }>({
    mutationFn: async ({ product }) => {
      const res = await publicPost<ApiResponse<Record<string, unknown>>>(
        `/access-request/${token}/contributor/${product}/execute`,
        { sessionToken }
      );
      if (!res.success) throw new Error(res.message || "Failed to grant access");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-contributor-status", token, sessionToken] });
    },
  });
}

export function useVerifyContributorManualStep(token: string, sessionToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation<VerifyStepResponse, Error, { product: Product }>({
    mutationFn: async ({ product }) => {
      const res = await publicPost<ApiResponse<VerifyStepResponse>>(
        `/access-request/${token}/contributor/${product}/verify`,
        { sessionToken }
      );
      if (!res.success) throw new Error(res.message || "Failed to verify access");
      return res.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-request-contributor-status", token, sessionToken] });
    },
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
