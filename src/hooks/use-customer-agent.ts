import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";
import type {
  CustomerAgentConfig,
  CustomerAgentUpdate,
  VisitorCredits,
  VisitorSiteKey,
} from "@/types/customer-agent";

type ConfigResponse = { config: CustomerAgentConfig };
type InstallResponse = { install: CustomerAgentConfig["install"] };

const basePath = (businessId: string) => `/customer-agent/${businessId}`;
const configKey = (businessId: string) => ["customerAgent", businessId, "config"];
export const visitorCreditsKey = (businessId: string) =>
  ["massic-agent", businessId, "credits", "visitor"] as const;
export const visitorSiteKey = (businessId: string) =>
  ["massic-agent", businessId, "site-key", "visitor"] as const;

function errorMessage(error: unknown) {
  const apiMessage = (error as any)?.response?.data?.message;
  return apiMessage || (error as Error)?.message || "Please try again.";
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

export function useCustomerAgent(businessId: string) {
  const queryClient = useQueryClient();
  const queryKey = configKey(businessId);
  const fetchConfig = async () => {
    const response = await api.get<ConfigResponse>(
      `${basePath(businessId)}/config`,
      "node",
    );
    return response.config;
  };

  const query = useQuery<CustomerAgentConfig>({
    queryKey,
    queryFn: fetchConfig,
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
        changes,
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

  const refreshInstallation = useMutation<CustomerAgentConfig, Error, void>({
    mutationFn: fetchConfig,
    onSuccess: (config) => {
      queryClient.setQueryData<CustomerAgentConfig>(queryKey, (current) =>
        current ? { ...current, install: config.install } : config,
      );
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    update,
    refreshInstallation,
  };
}

export function useVisitorAgentInstall(businessId: string) {
  const queryClient = useQueryClient();
  const registerSiteKey = async (key: string) => {
    const response = await api.put<InstallResponse>(
      `${basePath(businessId)}/site-key`,
      "node",
      { key },
    );
    queryClient.setQueryData<CustomerAgentConfig>(
      configKey(businessId),
      (current) => current ? { ...current, install: response.install } : current,
    );
  };
  const credits = useQuery<VisitorCredits>({
    queryKey: visitorCreditsKey(businessId),
    queryFn: () =>
      api.get<VisitorCredits>("/agent/admin/credits", "python", {
        params: { business_id: businessId, audience: "visitor" },
      }),
    enabled: Boolean(businessId),
    retry: false,
    refetchOnWindowFocus: true,
  });
  const siteKey = useQuery<VisitorSiteKey | null>({
    queryKey: visitorSiteKey(businessId),
    queryFn: async () => {
      let next: VisitorSiteKey;
      try {
        next = await api.get<VisitorSiteKey>("/agent/visitor/site-key", "python", {
          params: { business_id: businessId },
        });
      } catch (error) {
        if (errorStatus(error) === 404) return null;
        throw error;
      }
      await registerSiteKey(next.key);
      return next;
    },
    enabled: Boolean(businessId),
    retry: false,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const grant = useMutation<VisitorCredits, Error, boolean>({
    mutationFn: (enabled) =>
      api.put<VisitorCredits>(
        "/agent/admin/credits/grant",
        "python",
        { enabled },
        { params: { business_id: businessId, audience: "visitor" } },
      ),
    onSuccess: async (next) => {
      queryClient.setQueryData(visitorCreditsKey(businessId), next);
      await queryClient.invalidateQueries({ queryKey: visitorSiteKey(businessId) });
      toast.success(next.enabled ? "Customer agent enabled" : "Customer agent disabled", {
        description: next.enabled
          ? "Your site key is ready to install."
          : "Your site key is preserved for when you enable it again.",
      });
    },
    onError: (error) => {
      const status = errorStatus(error);
      toast.error("Couldn't update customer agent", {
        description:
          status === 409
            ? "Complete the business profile before enabling the customer agent."
            : errorMessage(error),
      });
    },
  });
  const regenerate = useMutation<VisitorSiteKey, Error, void>({
    mutationFn: async () => {
      const next = await api.post<VisitorSiteKey>(
        "/agent/visitor/site-key/regenerate",
        "python",
        undefined,
        { params: { business_id: businessId } },
      );
      await registerSiteKey(next.key);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(visitorSiteKey(businessId), next);
      toast.success("Site key regenerated", {
        description: "Replace the old key in your website snippet.",
      });
    },
    onError: (error) =>
      toast.error("Couldn't regenerate the site key", { description: errorMessage(error) }),
  });
  return { credits, siteKey, grant, regenerate };
}
