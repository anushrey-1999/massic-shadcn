import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";
import type {
  CustomerAgentConfig,
  CustomerAgentUpdate,
  OnboardingUpdate,
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
const playbookKey = (businessId: string) =>
  ["massic-agent", businessId, "document", "receptionist_playbook"] as const;

/** Turning the agent on creates a default playbook in the background; poll briefly until it lands. */
const PLAYBOOK_POLL_MS = 2000;
const PLAYBOOK_POLL_LIMIT = 30;

export type Playbook = {
  business_id?: string;
  doc_type?: string;
  content: string;
  version: number;
  updated_at?: string | null;
};

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

  const saveOnboarding = useMutation<
    CustomerAgentConfig,
    Error,
    OnboardingUpdate,
    { previous?: CustomerAgentConfig }
  >({
    mutationFn: async (changes) => {
      const response = await api.put<ConfigResponse>(
        `${basePath(businessId)}/onboarding`,
        "node",
        changes,
      );
      return response.config;
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CustomerAgentConfig>(queryKey);
      if (previous) {
        queryClient.setQueryData<CustomerAgentConfig>(queryKey, {
          ...previous,
          onboarding: {
            step: changes.step ?? previous.onboarding.step,
            completed_at:
              changes.completed === undefined
                ? previous.onboarding.completed_at
                : changes.completed
                  ? previous.onboarding.completed_at ?? new Date().toISOString()
                  : null,
          },
        });
      }
      return { previous };
    },
    onSuccess: (config) => {
      queryClient.setQueryData(queryKey, config);
    },
    onError: (error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("Couldn't save your progress", { description: errorMessage(error) });
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
    saveOnboarding,
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: visitorSiteKey(businessId) }),
        queryClient.invalidateQueries({ queryKey: playbookKey(businessId) }),
      ]);
      toast.success(next.enabled ? "Customer agent turned on" : "Customer agent turned off", {
        description: next.enabled ? undefined : "Hidden from your website.",
      });
    },
    onError: (error) => {
      const status = errorStatus(error);
      toast.error("Couldn't update customer agent", {
        description:
          status === 409
            ? "Complete your business profile first."
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
      toast.success("New code ready", {
        description: "Replace the code on your website.",
      });
    },
    onError: (error) =>
      toast.error("Couldn't create new code", { description: errorMessage(error) }),
  });
  return { credits, siteKey, grant, regenerate };
}

async function getPlaybook(businessId: string): Promise<Playbook> {
  try {
    return await api.get<Playbook>("/agent/docs/receptionist_playbook", "python", {
      params: { business_id: businessId },
    });
  } catch (error) {
    if (errorStatus(error) === 404) return { content: "", version: 0 };
    throw error;
  }
}

/**
 * The customer agent's playbook. While the agent is on but the playbook is still empty, the
 * default is being created, so keep refetching for a short while and report `preparing`.
 */
export function usePlaybook(businessId: string) {
  const queryClient = useQueryClient();
  const agentOn = useVisitorAgentInstall(businessId).credits.data?.enabled === true;
  const query = useQuery({
    queryKey: playbookKey(businessId),
    queryFn: () => getPlaybook(businessId),
    enabled: Boolean(businessId),
    retry: false,
    refetchInterval: (current) =>
      agentOn &&
      !current.state.data?.content.trim() &&
      current.state.dataUpdateCount < PLAYBOOK_POLL_LIMIT
        ? PLAYBOOK_POLL_MS
        : false,
  });
  const fetches = queryClient.getQueryState(playbookKey(businessId))?.dataUpdateCount ?? 0;
  const preparing =
    agentOn && !query.data?.content.trim() && !query.isError && fetches < PLAYBOOK_POLL_LIMIT;
  return { ...query, preparing };
}
