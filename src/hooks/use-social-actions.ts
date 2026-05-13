"use client";

import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SocialStrategyType } from "@/types/social-types";

type GenerationStatus = "success" | "error" | "pending" | "processing" | string;

export interface SocialContent {
  post?: string;
  caption?: string;
  hashtags?: string[];
  image_description?: string;
  visual_description?: string;
  video_script?: string;
  video_description?: string;
  thumbnail_description?: string;
  [key: string]: any;
}

export interface SocialActionResponse {
  status: GenerationStatus;
  message?: string;
  output_data?: {
    social_content?: SocialContent;
    social_engage_content?: {
      comment?: string;
      [key: string]: any;
    };
    errors?: string[] | Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
}

const SOCIAL_ACTION_CONTENT_QUERY_KEY = "social-action-content";

function getSocialActionEndpoint(strategyType: SocialStrategyType) {
  return strategyType === "engage" ? "/content/social-engage" : "/content/social";
}

function getStatusLowercase(data: SocialActionResponse | undefined): string {
  return (data?.status || "").toString().toLowerCase();
}

export function useSocialActionContentQuery(params: {
  businessId: string;
  campaignClusterId: string;
  strategyType?: SocialStrategyType;
  enabled?: boolean;
  pollingDisabled?: boolean;
  pollingIntervalMs?: number;
}) {
  const api = useApi({ platform: "python" });

  const {
    businessId,
    campaignClusterId,
    strategyType = "publish",
    enabled = true,
    pollingDisabled = false,
    pollingIntervalMs = 3000,
  } = params;
  const endpointPath = getSocialActionEndpoint(strategyType);

  return useQuery({
    queryKey: [SOCIAL_ACTION_CONTENT_QUERY_KEY, strategyType, businessId, campaignClusterId],
    enabled: enabled && !!businessId && !!campaignClusterId,
    queryFn: async () => {
      const endpoint = `${endpointPath}?business_id=${encodeURIComponent(
        businessId
      )}&campaign_cluster_id=${encodeURIComponent(campaignClusterId)}`;

      return api.execute(endpoint, { method: "GET" }) as Promise<SocialActionResponse>;
    },
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (pollingDisabled) return false;
      const status = getStatusLowercase(query.state.data as SocialActionResponse | undefined);
      return status === "pending" || status === "processing" ? pollingIntervalMs : false;
    },
    staleTime: 0,
  });
}

export function useSocialActions(strategyType: SocialStrategyType = "publish") {
  const api = useApi({ platform: "python" });
  const queryClient = useQueryClient();
  const endpointPath = getSocialActionEndpoint(strategyType);

  const getContent = async (businessId: string, campaignClusterId: string) => {
    const endpoint = `${endpointPath}?business_id=${encodeURIComponent(
      businessId
    )}&campaign_cluster_id=${encodeURIComponent(campaignClusterId)}`;

    return api.execute(endpoint, { method: "GET" }) as Promise<SocialActionResponse>;
  };

  const startGeneration = async (businessId: string, campaignClusterId: string) => {
    const endpoint = `${endpointPath}?business_id=${encodeURIComponent(
      businessId
    )}&campaign_cluster_id=${encodeURIComponent(campaignClusterId)}`;

    try {
      return (await api.execute(endpoint, { method: "POST" })) as SocialActionResponse;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 405) {
        return (await api.execute(endpoint, { method: "GET" })) as SocialActionResponse;
      }
      throw error;
    }
  };

  return {
    getContent,
    startGeneration,
    invalidateContent: (businessId: string, campaignClusterId: string) =>
      queryClient.invalidateQueries({ queryKey: [SOCIAL_ACTION_CONTENT_QUERY_KEY, strategyType, businessId, campaignClusterId] }),
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
