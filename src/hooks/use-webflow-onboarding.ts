import React from "react";
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

export interface WebflowPrefillOffering {
  name: string;
  description: string;
  link: string;
  offeringType: "product" | "service";
  priceRange: string;
  duration: string;
  inclusions: string[];
  source: {
    collectionId: string | null;
    collectionName: string | null;
    itemId: string | null;
  };
}

export interface WebflowPrefillDetectionEntry {
  collectionId: string | null;
  collectionName: string | null;
  slug: string | null;
  kind: string;
  itemCount: number;
}

export interface WebflowPrefillWarning {
  code: string;
  source: string;
  message: string;
}

export interface WebflowOnboardingPrefill {
  site: {
    id: string;
    displayName: string;
    url: string;
    timeZone: string;
  };
  profile: {
    businessName: string;
    website: string;
    businessDescription: string;
    logoUrl: string;
    imagePhotoLibrary: Array<{ url: string; alt: string }>;
    brandTerms: string[];
    timezone: string;
    stakeholders: Array<{ name: string; title: string; bio: string }>;
    detailedLocations: Array<{
      streetAddress: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone: string;
      email: string;
      mapLink: string;
      hours: string;
      primaryFlag: string;
    }>;
    awardsCertifications: string[];
    licensesCompliance: string[];
    supportEmail: string;
  };
  offerings: {
    type: "products" | "services" | "both" | null;
    items: WebflowPrefillOffering[];
    truncated: boolean;
  };
  sources: Record<string, string>;
  detection: {
    collectionsScanned: number;
    selected: WebflowPrefillDetectionEntry[];
    skipped: Array<{ collectionName: string | null; reason: string }>;
  };
  warnings: WebflowPrefillWarning[];
  cached: boolean;
}

export const WEBFLOW_SESSION_EXPIRED_CODE = "WEBFLOW_ONBOARDING_EXPIRED";

export interface WebflowOnboardingError extends Error {
  code?: string;
  status?: number;
}

function apiMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Keeps the backend error code on the thrown Error. Callers need it to tell an expired
 * onboarding session apart from a transient failure, since only the former is fixed by
 * re-authorizing rather than by retrying the same request.
 */
function onboardingError(error: any, fallback: string): WebflowOnboardingError {
  const enriched: WebflowOnboardingError = new Error(apiMessage(error, fallback));
  const code = error?.response?.data?.code || error?.code;
  if (code) enriched.code = String(code);
  const status = error?.response?.status;
  if (status) enriched.status = Number(status);
  return enriched;
}

function envelopeError(response: any, fallback: string): WebflowOnboardingError {
  const enriched: WebflowOnboardingError = new Error(response?.message || fallback);
  if (response?.code) enriched.code = String(response.code);
  return enriched;
}

export function isWebflowSessionExpired(error: unknown) {
  return (
    (error as WebflowOnboardingError | null)?.code === WEBFLOW_SESSION_EXPIRED_CODE
  );
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
          throw envelopeError(response, "Failed to load Webflow sites");
        return response.data?.sites || [];
      } catch (error) {
        throw onboardingError(error, "Failed to load Webflow sites");
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
          throw envelopeError(response, "Failed to load Webflow site domains");
        }
        return response.data;
      } catch (error) {
        throw onboardingError(error, "Failed to load Webflow site domains");
      }
    },
  });
}

/**
 * Imports business details from the connected Webflow site. Kept out of the standard
 * create-business flow so the Webflow path never depends on autofill or model inference.
 */
export function useWebflowOnboardingBusinessProfile(
  selection: WebflowOnboardingSelection | null,
) {
  // The endpoint caches for five minutes. An explicit user-triggered reimport should bypass
  // that cache, while background refetches should keep using it.
  const bypassCacheRef = React.useRef(false);

  const query = useQuery<WebflowOnboardingPrefill, WebflowOnboardingError>({
    queryKey: [
      "webflow-onboarding-business-profile",
      selection?.sessionId ?? null,
      selection?.siteId ?? null,
      selection?.selectedDomain ?? null,
    ],
    enabled: Boolean(selection?.sessionId && selection?.siteId),
    retry: false,
    // The backend caches for five minutes, so refetching on focus only adds latency.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        sessionId: String(selection?.sessionId),
        siteId: String(selection?.siteId),
      });
      if (selection?.selectedDomain) {
        params.set("selectedDomain", selection.selectedDomain);
      }
      if (bypassCacheRef.current) {
        params.set("refresh", "true");
        bypassCacheRef.current = false;
      }
      try {
        const response = await api.get<any>(
          `/cms/webflow/onboarding/business-profile?${params.toString()}`,
          "node",
        );
        if (!response?.success) {
          throw envelopeError(
            response,
            "Failed to import details from Webflow",
          );
        }
        return response.data;
      } catch (error) {
        throw onboardingError(error, "Failed to import details from Webflow");
      }
    },
  });

  const reimportFromWebflow = React.useCallback(() => {
    bypassCacheRef.current = true;
    return query.refetch();
  }, [query]);

  return { ...query, reimportFromWebflow };
}

export function useFinalizeWebflowOnboarding() {
  return useMutation<
    WebflowOnboardingFinalizeResult,
    WebflowOnboardingError,
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
          throw envelopeError(
            response,
            "Failed to attach Webflow to the business",
          );
        }
        return response.data;
      } catch (error) {
        throw onboardingError(error, "Failed to attach Webflow to the business");
      }
    },
  });
}
