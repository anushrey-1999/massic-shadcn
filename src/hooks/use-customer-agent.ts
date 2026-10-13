import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";
import type {
  CustomerAgentConfig,
  CustomerAgentUpdate,
  InstallStatus,
  WidgetSession,
} from "@/types/customer-agent";

type ConfigResponse = { config: CustomerAgentConfig };
type SessionResponse = { session: WidgetSession };

const basePath = (businessId: string) => `/customer-agent/${businessId}`;
const configKey = (businessId: string) => ["customerAgent", businessId, "config"];
const installStatusKey = (businessId: string) => ["customerAgent", businessId, "installStatus"];

const INSTALL_POLL_MS = 15_000;

function errorMessage(error: unknown) {
  const apiMessage = (error as any)?.response?.data?.message;
  return apiMessage || (error as Error)?.message || "Please try again.";
}

export function useCustomerAgent(businessId: string) {
  const queryClient = useQueryClient();
  const queryKey = configKey(businessId);

  const query = useQuery<CustomerAgentConfig>({
    queryKey,
    queryFn: async () => {
      const response = await api.get<ConfigResponse>(`${basePath(businessId)}/config`, "node");
      return response.config;
    },
    enabled: Boolean(businessId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const update = useMutation<
    CustomerAgentConfig,
    Error,
    { changes: CustomerAgentUpdate; successMessage: string }
  >({
    mutationFn: async ({ changes }) => {
      const response = await api.patch<ConfigResponse>(
        `${basePath(businessId)}/config`,
        "node",
        changes
      );
      return response.config;
    },
    onSuccess: (config, { successMessage }) => {
      queryClient.setQueryData(queryKey, config);
      toast.success(successMessage);
    },
    onError: (error) => {
      toast.error("Couldn't save changes", { description: errorMessage(error) });
    },
  });

  const rotateKey = useMutation<CustomerAgentConfig, Error, void>({
    mutationFn: async () => {
      const response = await api.post<ConfigResponse>(`${basePath(businessId)}/rotate-key`, "node");
      return response.config;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(queryKey, config);
      toast.success("Site key rotated", {
        description: "Update the snippet on your website to keep the agent running.",
      });
    },
    onError: (error) => {
      toast.error("Couldn't rotate the site key", { description: errorMessage(error) });
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    update,
    rotateKey,
  };
}

/** Polls while the snippet hasn't been seen on any allowed domain yet. */
export function useCustomerAgentInstallStatus(businessId: string, enabled: boolean) {
  return useQuery<InstallStatus>({
    queryKey: installStatusKey(businessId),
    queryFn: () => api.get<InstallStatus>(`${basePath(businessId)}/install-status`, "node"),
    enabled: Boolean(businessId) && enabled,
    refetchInterval: (query) => (query.state.data?.installs.length ? false : INSTALL_POLL_MS),
    refetchOnWindowFocus: true,
  });
}

/** Owner-scoped session for "Test your agent": skips the domain check. */
export function useCustomerAgentTestSession(businessId: string) {
  return useCallback(async () => {
    const response = await api.post<SessionResponse>(`${basePath(businessId)}/test-session`, "node");
    return response.session;
  }, [businessId]);
}
