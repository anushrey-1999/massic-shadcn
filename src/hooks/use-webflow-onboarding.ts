import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { WebflowConnection } from "@/hooks/use-webflow-connector";

export interface WebflowOnboardingSite {
  id: string;
  displayName: string;
  shortName?: string | null;
  stagingUrl?: string | null;
  previewImageUrl?: string | null;
}

export interface WebflowOnboardingDomain {
  id?: string | null;
  url: string;
  lastPublished?: string | null;
}

export interface WebflowOnboardingSiteOptions {
  site: WebflowOnboardingSite;
  domains: WebflowOnboardingDomain[];
  requiresDomainSelection: boolean;
  resolvedUrl: string | null;
}

export interface WebflowOnboardingSelection {
  sessionId: string;
  siteId: string;
  selectedDomain: string | null;
  website: string;
}

export interface WebflowOnboardingFinalizeResult {
  connectionId: string;
  businessId: string;
  siteId: string;
  siteName: string;
  website: string;
  alreadyFinalized: boolean;
  connection: WebflowConnection | null;
}

function apiMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function useStartWebflowOnboarding() {
  return useMutation<{ authorizationUrl: string }, Error>({
    mutationFn: async () => {
      const response = await api.get<any>(
        "/cms/webflow/onboarding/oauth/start",
        "node",
      );
      const authorizationUrl = response?.data?.authorizationUrl;
      if (!response?.success || !authorizationUrl) {
        throw new Error(
          response?.message || "Failed to start Webflow authorization",
        );
      }
      return { authorizationUrl };
    },
  });
}

export function useWebflowOnboardingSites(sessionId: string | null) {
  return useQuery<WebflowOnboardingSite[]>({
    queryKey: ["webflow-onboarding-sites", sessionId],
    enabled: Boolean(sessionId),
    retry: false,
    queryFn: async () => {
      try {
        const response = await api.get<any>(
          `/cms/webflow/onboarding/sites?sessionId=${encodeURIComponent(String(sessionId))}`,
          "node",
        );
        if (!response?.success)
          throw new Error(response?.message || "Failed to load Webflow sites");
        return response.data?.sites || [];
      } catch (error) {
        throw new Error(apiMessage(error, "Failed to load Webflow sites"));
      }
    },
  });
}

export function useWebflowOnboardingDomains(
  sessionId: string | null,
  siteId: string | null,
) {
  return useQuery<WebflowOnboardingSiteOptions>({
    queryKey: ["webflow-onboarding-domains", sessionId, siteId],
    enabled: Boolean(sessionId && siteId),
    retry: false,
    queryFn: async () => {
      try {
        const response = await api.get<any>(
          `/cms/webflow/onboarding/domains?sessionId=${encodeURIComponent(String(sessionId))}&siteId=${encodeURIComponent(String(siteId))}`,
          "node",
        );
        if (!response?.success) {
          throw new Error(
            response?.message || "Failed to load Webflow site domains",
          );
        }
        return response.data;
      } catch (error) {
        throw new Error(
          apiMessage(error, "Failed to load Webflow site domains"),
        );
      }
    },
  });
}

export function useFinalizeWebflowOnboarding() {
  return useMutation<
    WebflowOnboardingFinalizeResult,
    Error,
    WebflowOnboardingSelection & { businessId: string }
  >({
    mutationFn: async ({ sessionId, businessId, siteId, selectedDomain }) => {
      try {
        const response = await api.post<any>(
          "/cms/webflow/onboarding/finalize",
          "node",
          {
            sessionId,
            businessId,
            siteId,
            selectedDomain,
          },
        );
        if (!response?.success) {
          throw new Error(
            response?.message || "Failed to attach Webflow to the business",
          );
        }
        return response.data;
      } catch (error) {
        throw new Error(
          apiMessage(error, "Failed to attach Webflow to the business"),
        );
      }
    },
  });
}
